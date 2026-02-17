"use server";

import { parseScript, ParserOptions, ParseResult } from "@/lib/parser";
import { ParsedScript, ScriptMappings } from "@/lib/types";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { getEffectiveTier } from "@/lib/subscription";
import { COLLECTIVE_ROLES } from "@/lib/constants";

// pdf-parse required inside action

const MAX_PDF_SIZE_BYTES = 30 * 1024 * 1024; // 30MB safety cap

function validatePdfFile(file: File | null): { ok: true } | { ok: false; error: string } {
    if (!file) return { ok: false, error: "No file provided" };

    const fileName = (file.name || "").toLowerCase();
    const isPdfMime = (file.type || "").toLowerCase().includes("pdf");
    const isPdfExt = fileName.endsWith(".pdf");

    if (!isPdfMime && !isPdfExt) {
        return { ok: false, error: "Le fichier doit etre un PDF (.pdf)." };
    }

    if (file.size <= 0) {
        return { ok: false, error: "Le fichier PDF est vide." };
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
        return { ok: false, error: "Le PDF depasse 30 Mo. Merci de le compresser ou de le decouper." };
    }

    return { ok: true };
}

const AI_CLEANING_PROMPT = `Tu es un moteur de normalisation de scripts de theatre francophones.
Objectif: transformer un texte PDF/OCR brut en format canonique Repeto, sans invention.

CONTRAINTES ABSOLUES
- Ne jamais inventer de contenu.
- Ne jamais ajouter de nouveaux personnages absents du texte source.
- Conserver le sens, l'ordre et la fidelite litterale maximale.
- Corriger uniquement les erreurs OCR et de formatage manifestes.

FORMAT DE SORTIE OBLIGATOIRE
1) Conserver les titres de structure:
- ACTE ... (ex: ACTE I)
- SCENE ... ou SCÈNE ... (ex: SCENE 1, SCÈNE IV)

2) Chaque prise de parole doit respecter exactement:
[PERSONNAGE]
Replique...

3) Les didascalies doivent etre strictement entre parentheses:
- Dans une replique: (il se leve) Je pars.
- Ou en ligne seule: (Noir.)

4) Le nom personnage est TOUJOURS en MAJUSCULES entre crochets.

REGLES DE NORMALISATION
- Supprimer numerotation de pages, en-tetes/pieds et artefacts techniques hors script.
- Corriger les collages OCR (deux personnages fusionnes sur une ligne).
- Si une ligne ressemble a une action/indication et pas a un personnage, la convertir en didascalie ( ... ).
- Si un personnage est mentionne a la fois par un role descriptif et un nom propre
  (ex: "VALET DE CHAMBRE" et "JOSEPH"), privilegier le nom propre entre crochets
  et garder le role descriptif en didascalie.
- Si une replique est dite par plusieurs personnages, garder un seul label collectif.
- Uniformiser les espaces et sauts de ligne.

CAS AMBIGU
- Si tu hesites entre personnage et didascalie, privilegie didascalie ( ... ) plutot qu'un faux personnage.

IMPORTANT
- Retourner UNIQUEMENT le script nettoye final.
- Ne retourner aucune explication, aucun commentaire, aucun markdown.`;

const AI_CLEANING_PRIMARY_MODEL = process.env.OPENAI_IMPORT_CLEANING_MODEL || "gpt-5-pro";
const AI_CLEANING_FALLBACK_MODELS = ["gpt-5", "gpt-5-mini"];
const AI_DIAGNOSTICS_PRIMARY_MODEL = process.env.OPENAI_IMPORT_DIAGNOSTICS_MODEL || "gpt-5-pro";
const AI_DIAGNOSTICS_FALLBACK_MODELS = ["gpt-5", "gpt-5-mini"];
const DIAGNOSTICS_MAX_LINES = 2200;
const DIAGNOSTICS_MAX_LINE_TEXT = 240;

type ImportDecisionStatus = "accept" | "reject";

export interface AliasSuggestion {
    id: string;
    source: string;
    target: string;
    confidence: number;
    reason: string;
    requiresDecision: true;
}

export interface CollectiveSuggestion {
    id: string;
    label: string;
    scope: "global" | "scene";
    sceneIndex?: number;
    members: string[];
    confidence: number;
    reason: string;
    requiresDecision: true;
}

export interface SceneDiagnostic {
    id: string;
    sceneIndex: number;
    issue: "uncertain_boundary" | "ambiguous_label" | "other";
    confidence: number;
    reason: string;
    requiresDecision: true;
}

export interface BlockingDecision {
    id: string;
    kind: "alias" | "collective" | "scene";
    label: string;
    reason: string;
    confidence: number;
    requiresDecision: true;
}

export interface ImportDiagnosticsResult {
    canonicalCharacters: string[];
    aliasSuggestions: AliasSuggestion[];
    collectiveSuggestions: CollectiveSuggestion[];
    sceneDiagnostics: SceneDiagnostic[];
    blockingDecisions: BlockingDecision[];
}

export interface ImportValidationSubmission {
    diagnostics: ImportDiagnosticsResult;
    decisions: Record<string, ImportDecisionStatus>;
    mappings: ScriptMappings;
}

function extractResponsesOutputText(response: unknown): string {
    const payload = response as { output_text?: unknown; output?: unknown };
    if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
        return payload.output_text.trim();
    }

    const outputItems = Array.isArray(payload.output) ? payload.output : [];
    const parts: string[] = [];

    for (const rawItem of outputItems) {
        const item = rawItem as { type?: unknown; content?: unknown };
        if (item.type !== "message" || !Array.isArray(item.content)) continue;

        for (const rawPart of item.content) {
            const part = rawPart as { type?: unknown; text?: unknown };
            if (part.type === "output_text" && typeof part.text === "string" && part.text.trim().length > 0) {
                parts.push(part.text.trim());
            }
        }
    }

    return parts.join("\n").trim();
}

function isTimeoutError(error: unknown): boolean {
    const candidate = error as { code?: string; message?: string };
    return candidate.code === "ETIMEDOUT" || (typeof candidate.message === "string" && candidate.message.includes("timeout"));
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    const candidate = error as { message?: unknown };
    return typeof candidate.message === "string" && candidate.message ? candidate.message : "Unknown error";
}

function normalizeCharacterLabel(value: string): string {
    return value.toUpperCase().replace(/\s+/g, " ").trim();
}

function buildCanonicalCharacters(characters: string[]): string[] {
    const unique = new Set<string>();
    for (const character of characters) {
        const normalized = normalizeCharacterLabel(character || "");
        if (normalized) unique.add(normalized);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "fr"));
}

function normalizeConfidence(value: unknown, fallback = 0.5): number {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(0, Math.min(1, value));
}

interface AiDiagnosticsRaw {
    aliasSuggestions?: Array<{ source?: string; target?: string; confidence?: number; reason?: string }>;
    collectiveSuggestions?: Array<{
        label?: string;
        scope?: "global" | "scene";
        sceneIndex?: number;
        members?: string[];
        confidence?: number;
        reason?: string;
    }>;
    sceneDiagnostics?: Array<{
        sceneIndex?: number;
        issue?: "uncertain_boundary" | "ambiguous_label" | "other";
        confidence?: number;
        reason?: string;
    }>;
}

function isSceneScopedCollectiveLabel(label: string): boolean {
    const normalized = normalizeCharacterLabel(label);
    if (COLLECTIVE_ROLES.has(normalized)) return true;
    if (/^(?:TOUS(?:\s+LES)?|TOUTES(?:\s+LES)?|LES)\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;
    return false;
}

function isCollectiveLabelCandidate(label: string): boolean {
    const normalized = normalizeCharacterLabel(label);
    if (!normalized) return false;
    if (isSceneScopedCollectiveLabel(normalized)) return true;
    if (/^LES\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])(?:\s+[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-'’]+)?$/i.test(normalized)) return true;
    if (/^TOUS(?:\s+LES)?\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])(?:\s+[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-'’]+)?$/i.test(normalized)) return true;
    if (/^TOUTES(?:\s+LES)?\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])(?:\s+[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-'’]+)?$/i.test(normalized)) return true;
    return false;
}

function extractPotentialSpeakerParts(label: string): string[] {
    const normalized = normalizeCharacterLabel(label);
    if (!normalized) return [];

    return normalized
        .split(/\s*(?:,|\/|&|\bET\b)\s*/i)
        .map((part) => normalizeCharacterLabel(part))
        .filter((part) => part.length > 0 && part !== "ET");
}

function buildBlockingDecisions(
    aliasSuggestions: AliasSuggestion[],
    collectiveSuggestions: CollectiveSuggestion[],
    sceneDiagnostics: SceneDiagnostic[]
): BlockingDecision[] {
    return [
        ...aliasSuggestions.map((item) => ({
            id: item.id,
            kind: "alias" as const,
            label: `${item.source} -> ${item.target}`,
            reason: item.reason,
            confidence: item.confidence,
            requiresDecision: true as const,
        })),
        ...collectiveSuggestions.map((item) => ({
            id: item.id,
            kind: "collective" as const,
            label: item.scope === "scene"
                ? `${item.label} (Scene ${item.sceneIndex})`
                : item.label,
            reason: item.reason,
            confidence: item.confidence,
            requiresDecision: true as const,
        })),
        ...sceneDiagnostics.map((item) => ({
            id: item.id,
            kind: "scene" as const,
            label: `Scene ${item.sceneIndex}`,
            reason: item.reason,
            confidence: item.confidence,
            requiresDecision: true as const,
        })),
    ];
}

function getSceneStartForLine(script: ParsedScript, lineIndex: number): number {
    let currentStart = 0;
    for (const scene of script.scenes || []) {
        if (scene.index <= lineIndex) {
            currentStart = scene.index;
        } else {
            break;
        }
    }
    return currentStart;
}

function buildSceneCanonicalMembers(script: ParsedScript, canonicalCharacters: string[]): Map<number, Set<string>> {
    const canonicalSet = new Set(canonicalCharacters);
    const byScene = new Map<number, Set<string>>();

    (script.lines || []).forEach((line, idx) => {
        if (line.type !== "dialogue") return;
        const sceneStart = getSceneStartForLine(script, idx);
        const sceneMembers = byScene.get(sceneStart) || new Set<string>();

        const fullLabel = normalizeCharacterLabel(line.character || "");
        if (canonicalSet.has(fullLabel) && !isCollectiveLabelCandidate(fullLabel)) {
            sceneMembers.add(fullLabel);
        }

        const parts = extractPotentialSpeakerParts(line.character || "");
        parts.forEach((part) => {
            if (canonicalSet.has(part)) {
                sceneMembers.add(part);
            }
        });

        byScene.set(sceneStart, sceneMembers);
    });

    return byScene;
}

function buildDeterministicCollectiveSuggestions(
    script: ParsedScript,
    canonicalCharacters: string[],
    existingSuggestions: CollectiveSuggestion[]
): CollectiveSuggestion[] {
    const existingIds = new Set(existingSuggestions.map((item) => item.id));
    const sceneMembersMap = buildSceneCanonicalMembers(script, canonicalCharacters);
    const canonicalSet = new Set(canonicalCharacters);
    const generated: CollectiveSuggestion[] = [];
    const sceneOrderByStart = new Map<number, number>();
    (script.scenes || []).forEach((scene, order) => {
        sceneOrderByStart.set(scene.index, order);
    });

    (script.lines || []).forEach((line, idx) => {
        if (line.type !== "dialogue") return;
        const label = normalizeCharacterLabel(line.character || "");
        if (!isCollectiveLabelCandidate(label)) return;

        const sceneStart = getSceneStartForLine(script, idx);
        const isSceneScoped = isSceneScopedCollectiveLabel(label);

        const id = isSceneScoped
            ? `collective:scene:${sceneStart}:${label}`
            : `collective:global:${label}`;

        const sceneOrder = sceneOrderByStart.get(sceneStart) ?? 0;
        const hasEquivalentExisting = existingSuggestions.some((item) => {
            if (item.scope !== (isSceneScoped ? "scene" : "global")) return false;
            if (item.label !== label) return false;
            if (!isSceneScoped) return true;
            return item.sceneIndex === sceneStart || item.sceneIndex === sceneOrder;
        });

        if (existingIds.has(id) || hasEquivalentExisting || generated.some((item) => item.id === id)) return;

        let members: string[] = [];
        if (isSceneScoped) {
            members = Array.from(sceneMembersMap.get(sceneStart) || []);
        } else {
            const parsedParts = extractPotentialSpeakerParts(label).filter((part) => canonicalSet.has(part));
            members = Array.from(new Set(parsedParts));
        }

        generated.push({
            id,
            label,
            scope: isSceneScoped ? "scene" : "global",
            sceneIndex: isSceneScoped ? sceneStart : undefined,
            members,
            confidence: members.length > 0 ? 0.7 : 0.45,
            reason: isSceneScoped
                ? "Collectif detecte automatiquement pour cette scene. Validation requise."
                : "Collectif detecte automatiquement. Verification des membres requise.",
            requiresDecision: true,
        });
    });

    return generated;
}

function mergeDiagnosticsWithDeterministicCollectives(
    diagnostics: ImportDiagnosticsResult,
    script: ParsedScript
): ImportDiagnosticsResult {
    const sceneStarts = new Set((script.scenes || []).map((scene) => scene.index));
    const sceneOrderToStart = new Map<number, number>();
    (script.scenes || []).forEach((scene, order) => {
        sceneOrderToStart.set(order, scene.index);
    });

    const normalizeSceneIndex = (value: number): number => {
        if (sceneStarts.has(value)) return value;
        return sceneOrderToStart.get(value) ?? value;
    };

    const normalizedCollectiveMap = new Map<string, CollectiveSuggestion>();
    for (const item of diagnostics.collectiveSuggestions) {
        if (item.scope === "scene" && typeof item.sceneIndex === "number") {
            const normalizedSceneIndex = normalizeSceneIndex(item.sceneIndex);
            const normalized: CollectiveSuggestion = {
                ...item,
                sceneIndex: normalizedSceneIndex,
                id: `collective:scene:${normalizedSceneIndex}:${item.label}`,
            };
            const existing = normalizedCollectiveMap.get(normalized.id);
            if (!existing || existing.confidence < normalized.confidence) {
                normalizedCollectiveMap.set(normalized.id, normalized);
            }
            continue;
        }

        normalizedCollectiveMap.set(item.id, item);
    }

    const normalizedSceneDiagnosticMap = new Map<string, SceneDiagnostic>();
    for (const item of diagnostics.sceneDiagnostics) {
        const normalizedSceneIndex = normalizeSceneIndex(item.sceneIndex);
        const normalized: SceneDiagnostic = {
            ...item,
            sceneIndex: normalizedSceneIndex,
            id: `scene:${normalizedSceneIndex}:${item.issue}`,
        };
        const existing = normalizedSceneDiagnosticMap.get(normalized.id);
        if (!existing || existing.confidence < normalized.confidence) {
            normalizedSceneDiagnosticMap.set(normalized.id, normalized);
        }
    }

    const normalizedCollectiveSuggestions = Array.from(normalizedCollectiveMap.values());
    const normalizedSceneDiagnostics = Array.from(normalizedSceneDiagnosticMap.values());

    const deterministicCollectives = buildDeterministicCollectiveSuggestions(
        script,
        diagnostics.canonicalCharacters,
        normalizedCollectiveSuggestions
    );

    const collectiveSuggestions = [...normalizedCollectiveSuggestions, ...deterministicCollectives];
    return {
        ...diagnostics,
        collectiveSuggestions,
        sceneDiagnostics: normalizedSceneDiagnostics,
        blockingDecisions: buildBlockingDecisions(
            diagnostics.aliasSuggestions,
            collectiveSuggestions,
            normalizedSceneDiagnostics
        ),
    };
}

function sanitizeAiDiagnostics(raw: AiDiagnosticsRaw, canonicalCharacters: string[]): ImportDiagnosticsResult {
    const canonicalSet = new Set(canonicalCharacters);

    const aliasSuggestions: AliasSuggestion[] = [];
    const aliasSeen = new Set<string>();

    for (const candidate of raw.aliasSuggestions || []) {
        const source = normalizeCharacterLabel(candidate.source || "");
        const target = normalizeCharacterLabel(candidate.target || "");

        if (!source || !target || source === target) continue;
        if (!canonicalSet.has(target)) continue;

        const id = `alias:${source}->${target}`;
        if (aliasSeen.has(id)) continue;
        aliasSeen.add(id);

        aliasSuggestions.push({
            id,
            source,
            target,
            confidence: normalizeConfidence(candidate.confidence, 0.65),
            reason: (candidate.reason || "Suggestion d'alias detectee.").trim(),
            requiresDecision: true,
        });
    }

    const collectiveSuggestions: CollectiveSuggestion[] = [];
    const collectiveSeen = new Set<string>();

    for (const candidate of raw.collectiveSuggestions || []) {
        const label = normalizeCharacterLabel(candidate.label || "");
        const scope = candidate.scope === "scene" ? "scene" : "global";
        const sceneIndex = scope === "scene" && typeof candidate.sceneIndex === "number" ? Math.max(0, Math.floor(candidate.sceneIndex)) : undefined;
        const members = Array.from(new Set((candidate.members || [])
            .map((member) => normalizeCharacterLabel(member))
            .filter((member) => canonicalSet.has(member))));

        if (!label) continue;
        if (scope === "scene" && typeof sceneIndex !== "number") continue;

        const id = scope === "scene"
            ? `collective:scene:${sceneIndex}:${label}`
            : `collective:global:${label}`;

        if (collectiveSeen.has(id)) continue;
        collectiveSeen.add(id);

        collectiveSuggestions.push({
            id,
            label,
            scope,
            sceneIndex,
            members,
            confidence: normalizeConfidence(candidate.confidence, 0.65),
            reason: (candidate.reason || "Suggestion de role collectif detectee.").trim(),
            requiresDecision: true,
        });
    }

    const sceneDiagnostics: SceneDiagnostic[] = [];
    const sceneSeen = new Set<string>();

    for (const candidate of raw.sceneDiagnostics || []) {
        const sceneIndex = typeof candidate.sceneIndex === "number" ? Math.max(0, Math.floor(candidate.sceneIndex)) : null;
        if (sceneIndex === null) continue;

        const issue: SceneDiagnostic["issue"] = candidate.issue === "ambiguous_label"
            ? "ambiguous_label"
            : candidate.issue === "other"
                ? "other"
                : "uncertain_boundary";

        const id = `scene:${sceneIndex}:${issue}`;
        if (sceneSeen.has(id)) continue;
        sceneSeen.add(id);

        sceneDiagnostics.push({
            id,
            sceneIndex,
            issue,
            confidence: normalizeConfidence(candidate.confidence, 0.5),
            reason: (candidate.reason || "A verifier.").trim(),
            requiresDecision: true,
        });
    }

    return {
        canonicalCharacters,
        aliasSuggestions,
        collectiveSuggestions,
        sceneDiagnostics,
        blockingDecisions: buildBlockingDecisions(aliasSuggestions, collectiveSuggestions, sceneDiagnostics),
    };
}

function parseAiDiagnosticsJson(payload: string): AiDiagnosticsRaw {
    const cleaned = payload.trim();
    if (!cleaned) return {};

    try {
        return JSON.parse(cleaned) as AiDiagnosticsRaw;
    } catch {
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            const sliced = cleaned.slice(firstBrace, lastBrace + 1);
            return JSON.parse(sliced) as AiDiagnosticsRaw;
        }
        throw new Error("Diagnostics JSON invalide");
    }
}

function buildDiagnosticsInputScript(script: ParsedScript) {
    const scenes = (script.scenes || []).map((scene, idx) => ({
        scene_order: idx,
        scene_index: scene.index,
        title: scene.title || "",
    }));

    const lines = (script.lines || [])
        .slice(0, DIAGNOSTICS_MAX_LINES)
        .map((line, idx) => ({
            line_index: idx,
            character: normalizeCharacterLabel(line.character || ""),
            text: (line.text || "").slice(0, DIAGNOSTICS_MAX_LINE_TEXT),
            type: line.type,
        }));

    return { scenes, lines };
}

function buildDiagnosticsPrompt(canonicalCharacters: string[]): string {
    return `Tu es un auditeur IA pour import de scripts de theatre.
Mission: analyser un script deja parse et proposer des decisions de validation.

REGLES STRICTES
- Tu ne crees jamais de nouveau personnage.
- Tu ne proposes des cibles que dans la liste canonique autorisee.
- Tu proposes, tu ne decides jamais a la place de l'utilisateur.
- Si tu n'es pas sur, ajoute une sceneDiagnostics.

OBJECTIFS
1) Alias/fusions possibles: source -> target (target dans canonicalCharacters).
2) Roles collectifs:
   - scope global pour labels stables (ex: LES DEUX CAVALIERS)
   - scope scene pour TOUS/TOUTES/ENSEMBLE ou labels contextuels
3) Incertitudes de scenes (bornes ambiguës, labels ambigus).

LISTE CANONIQUE AUTORISEE
${canonicalCharacters.join(", ") || "(vide)"}

FORMAT JSON OBLIGATOIRE
{
  "aliasSuggestions": [{"source":"", "target":"", "confidence":0.0, "reason":""}],
  "collectiveSuggestions": [{"label":"", "scope":"global|scene", "sceneIndex":0, "members":[""], "confidence":0.0, "reason":""}],
  "sceneDiagnostics": [{"sceneIndex":0, "issue":"uncertain_boundary|ambiguous_label|other", "confidence":0.0, "reason":""}]
}

IMPORTANT
- sceneIndex doit utiliser la valeur "scene_index" fournie dans les scenes du payload.

Ne renvoie que du JSON valide.`;
}

/**
 * Clean and restructure a messy script using AI (gpt-5-pro fallback gpt-5)
 * Returns canonical text expected by parseScript ([CHAR], dialogue, (didascalies), ACTE/SCENE)
 */
export async function cleanScriptWithAI(rawText: string): Promise<string | { error: string }> {
    try {
        console.log("[AI Clean] Starting AI cleaning, text length:", rawText.length);

        // Limit text length to avoid very long processing times
        const MAX_INPUT_CHARS = 120000;
        let textToProcess = rawText;

        if (rawText.length > MAX_INPUT_CHARS) {
            console.log("[AI Clean] Text too long, truncating from", rawText.length, "to", MAX_INPUT_CHARS);
            textToProcess = rawText.substring(0, MAX_INPUT_CHARS);
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 240000, // 4 minute timeout max before fallback model
        });

        const modelsToTry = [
            AI_CLEANING_PRIMARY_MODEL,
            ...AI_CLEANING_FALLBACK_MODELS.filter((m) => m !== AI_CLEANING_PRIMARY_MODEL),
        ];

        let lastError: unknown = null;

        for (const model of modelsToTry) {
            try {
                console.log(`[AI Clean] Trying model: ${model}`);
                const response = await openai.responses.create({
                    model,
                    input: [
                        { role: "system", content: AI_CLEANING_PROMPT },
                        { role: "user", content: textToProcess },
                    ],
                    reasoning: model === "gpt-5-pro" && textToProcess.length > 100000
                        ? { effort: "high" }
                        : { effort: "medium" },
                    max_output_tokens: 20000,
                });

                const cleanedText = extractResponsesOutputText(response);
                if (cleanedText) {
                    console.log("[AI Clean] Cleaning complete with model:", model, "output length:", cleanedText.length);
                    return cleanedText;
                }

                lastError = new Error(`No output text returned by model ${model}`);
                console.warn("[AI Clean] Empty response from model:", model);
            } catch (err: unknown) {
                lastError = err;
                console.warn(`[AI Clean] Model ${model} failed:`, getErrorMessage(err));
            }
        }

        throw lastError || new Error("No model returned usable output");
    } catch (error: unknown) {
        console.error("[AI Clean] Error:", error);

        // Handle timeout specifically
        if (isTimeoutError(error)) {
            return { error: "Le nettoyage IA a pris trop de temps. Essayez avec un PDF plus court." };
        }

        return { error: getErrorMessage(error) || "Erreur lors du nettoyage IA (modele indisponible ou reponse invalide)." };
    }
}

/**
 * Full AI-powered import: Extract PDF text, clean with AI, then parse with existing heuristic parser
 */
export async function importScriptWithAI(formData: FormData, troupeId?: string): Promise<ParsedScript | { error: string }> {
    const file = formData.get("file") as File;
    const validation = validatePdfFile(file ?? null);
    if (!validation.ok) return { error: validation.error };

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Veuillez vous connecter pour importer un PDF." };
        }

        // Access rules:
        // - Solo flow: IA import reserved to premium tiers (solo_pro/troupe/troupe_xl)
        // - Troupe flow: available to any member of the target troupe
        if (troupeId) {
            const { data: membership } = await supabase
                .from("troupe_members")
                .select("user_id")
                .eq("troupe_id", troupeId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (!membership) {
                return { error: "Acces refuse: vous n'etes pas membre de cette troupe." };
            }
        } else {
            const tier = await getEffectiveTier(user.id);
            if (tier === "free") {
                return { error: "Le nettoyage IA est reserve aux comptes Solo Pro et Troupe." };
            }
        }

        console.log("[AI Import] Starting AI-powered import for:", file.name);

        // Step 1: Extract raw text from PDF
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdf = require("pdf-parse/lib/pdf-parse.js");
        const data = await pdf(buffer);

        console.log("[AI Import] Extracted text, length:", data.text.length);

        // Step 2: Clean with AI (returns formatted text with PERSO/REPLIQUE)
        const cleanedResult = await cleanScriptWithAI(data.text);

        if (typeof cleanedResult !== "string") {
            return cleanedResult; // Return error
        }

        // Step 3: Parse with existing heuristic parser (YOUR parser!)
        const script = parseScript(cleanedResult);

        if (script.lines.length === 0) {
            return { error: "L'IA a nettoyé le script mais aucun dialogue n'a été détecté. Vérifiez le format." };
        }

        // Add title from filename
        script.title = file.name.replace(".pdf", "");

        console.log("[AI Import] Success! Characters:", script.characters.length, "Lines:", script.lines.length);
        return script;
    } catch (error: any) {
        console.error("[AI Import] Error:", error);
        return { error: error.message || "Erreur lors de l'import IA." };
    }
}

function buildEmptyDiagnostics(canonicalCharacters: string[]): ImportDiagnosticsResult {
    return {
        canonicalCharacters,
        aliasSuggestions: [],
        collectiveSuggestions: [],
        sceneDiagnostics: [],
        blockingDecisions: [],
    };
}

export async function runImportDiagnosticsAction(
    script: ParsedScript,
    canonicalCharactersInput?: string[]
): Promise<ImportDiagnosticsResult | { error: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Veuillez vous connecter pour lancer le scan IA." };
        }

        const canonicalCharacters = buildCanonicalCharacters(
            canonicalCharactersInput && canonicalCharactersInput.length > 0
                ? canonicalCharactersInput
                : (script.characters || [])
        );

        if (canonicalCharacters.length === 0) {
            return buildEmptyDiagnostics(canonicalCharacters);
        }

        if (!process.env.OPENAI_API_KEY) {
            console.warn("[AI Diagnostics] OPENAI_API_KEY absent, fallback diagnostics vide.");
            const fallback = buildEmptyDiagnostics(canonicalCharacters);
            return mergeDiagnosticsWithDeterministicCollectives(fallback, script);
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 180000,
        });

        const modelsToTry = [
            AI_DIAGNOSTICS_PRIMARY_MODEL,
            ...AI_DIAGNOSTICS_FALLBACK_MODELS.filter((m) => m !== AI_DIAGNOSTICS_PRIMARY_MODEL),
        ];

        const payload = buildDiagnosticsInputScript(script);
        const prompt = buildDiagnosticsPrompt(canonicalCharacters);
        const payloadStr = JSON.stringify(payload);

        let lastError: unknown = null;

        for (const model of modelsToTry) {
            try {
                console.log(`[AI Diagnostics] Trying model: ${model}`);

                const response = await openai.responses.create({
                    model,
                    input: [
                        { role: "system", content: prompt },
                        { role: "user", content: payloadStr },
                    ],
                    reasoning: { effort: "medium" },
                    max_output_tokens: 10000,
                });

                const output = extractResponsesOutputText(response);
                const raw = parseAiDiagnosticsJson(output);
                const diagnostics = mergeDiagnosticsWithDeterministicCollectives(
                    sanitizeAiDiagnostics(raw, canonicalCharacters),
                    script
                );
                console.log(
                    "[AI Diagnostics] Success",
                    { aliases: diagnostics.aliasSuggestions.length, collectives: diagnostics.collectiveSuggestions.length, scenes: diagnostics.sceneDiagnostics.length }
                );
                return diagnostics;
            } catch (err: unknown) {
                lastError = err;
                console.warn(`[AI Diagnostics] Model ${model} failed:`, getErrorMessage(err));
            }
        }

        throw lastError || new Error("Aucun modele n'a retourne de diagnostics exploitables.");
    } catch (error: unknown) {
        console.error("[AI Diagnostics] Error:", error);
        return { error: getErrorMessage(error) || "Erreur lors du scan IA." };
    }
}

function ensureAllBlockingDecisionsResolved(
    diagnostics: ImportDiagnosticsResult,
    decisions: Record<string, ImportDecisionStatus>
): { ok: true } | { ok: false; error: string } {
    for (const blocking of diagnostics.blockingDecisions) {
        const decision = decisions[blocking.id];
        if (decision !== "accept" && decision !== "reject") {
            return { ok: false, error: `Decision manquante pour: ${blocking.label}` };
        }
    }
    return { ok: true };
}

function detectAliasCycle(aliases: Record<string, string>): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: string): boolean => {
        if (visiting.has(node)) return true;
        if (visited.has(node)) return false;

        visiting.add(node);
        const next = aliases[node];
        if (next && aliases[next] && dfs(next)) return true;

        visiting.delete(node);
        visited.add(node);
        return false;
    };

    for (const key of Object.keys(aliases)) {
        if (dfs(key)) return true;
    }
    return false;
}

function validateResolvedMappings(
    diagnostics: ImportDiagnosticsResult,
    decisions: Record<string, ImportDecisionStatus>,
    mappings: ScriptMappings
): { ok: true; sanitized: ScriptMappings } | { ok: false; error: string } {
    const decisionsCheck = ensureAllBlockingDecisionsResolved(diagnostics, decisions);
    if (!decisionsCheck.ok) return decisionsCheck;

    const canonical = buildCanonicalCharacters(
        mappings.canonical_characters && mappings.canonical_characters.length > 0
            ? mappings.canonical_characters
            : diagnostics.canonicalCharacters
    );
    const canonicalSet = new Set(canonical);

    const aliases: Record<string, string> = {};
    for (const [rawSource, rawTarget] of Object.entries(mappings.aliases || {})) {
        const source = normalizeCharacterLabel(rawSource || "");
        const target = normalizeCharacterLabel(rawTarget || "");
        if (!source || !target) continue;

        if (!canonicalSet.has(target)) {
            return { ok: false, error: `Alias invalide: cible hors liste canonique (${source} -> ${target}).` };
        }

        if (source === target) {
            return { ok: false, error: `Alias invalide: source identique a la cible (${source}).` };
        }

        aliases[source] = target;
    }

    if (detectAliasCycle(aliases)) {
        return { ok: false, error: "Alias invalide: cycle detecte." };
    }

    const globalCollectives = (mappings.collectives?.global || [])
        .map((item) => ({
            label: normalizeCharacterLabel(item.label || ""),
            members: Array.from(new Set((item.members || [])
                .map((member) => normalizeCharacterLabel(member))
                .filter((member) => canonicalSet.has(member)))),
        }))
        .filter((item) => item.label.length > 0);

    for (const collective of globalCollectives) {
        if (collective.members.length === 0) {
            return { ok: false, error: `Collectif global invalide (membres vides): ${collective.label}` };
        }
    }

    const bySceneCollectives = (mappings.collectives?.by_scene || [])
        .map((item) => ({
            scene_index: Math.max(0, Math.floor(Number(item.scene_index))),
            label: normalizeCharacterLabel(item.label || ""),
            members: Array.from(new Set((item.members || [])
                .map((member) => normalizeCharacterLabel(member))
                .filter((member) => canonicalSet.has(member)))),
        }))
        .filter((item) => item.label.length > 0);

    for (const collective of bySceneCollectives) {
        if (collective.members.length === 0) {
            return { ok: false, error: `Collectif scene invalide (membres vides): Scene ${collective.scene_index} / ${collective.label}` };
        }
    }

    // Ensure accepted alias suggestions are reflected in mappings
    for (const suggestion of diagnostics.aliasSuggestions) {
        const decision = decisions[suggestion.id];
        if (decision === "accept") {
            const mappedTarget = aliases[suggestion.source];
            if (!mappedTarget) {
                return { ok: false, error: `Alias accepte mais non applique: ${suggestion.source}` };
            }
        }
    }

    // Ensure accepted collective suggestions are reflected in mappings
    for (const suggestion of diagnostics.collectiveSuggestions) {
        const decision = decisions[suggestion.id];
        if (decision !== "accept") continue;

        if (suggestion.scope === "global") {
            const found = globalCollectives.find((item) => item.label === suggestion.label);
            if (!found) {
                return { ok: false, error: `Collectif global accepte mais absent du mapping: ${suggestion.label}` };
            }
        } else {
            const found = bySceneCollectives.find((item) => item.label === suggestion.label && item.scene_index === suggestion.sceneIndex);
            if (!found) {
                return { ok: false, error: `Collectif scene accepte mais absent du mapping: Scene ${suggestion.sceneIndex} / ${suggestion.label}` };
            }
        }
    }

    return {
        ok: true,
        sanitized: {
            canonical_characters: canonical,
            aliases,
            collectives: {
                global: globalCollectives,
                by_scene: bySceneCollectives,
            },
        },
    };
}

export async function saveScriptWithImportValidation(
    script: ParsedScript,
    submission: ImportValidationSubmission
): Promise<{ success: true } | { error: string }> {
    try {
        const validated = validateResolvedMappings(submission.diagnostics, submission.decisions, submission.mappings);
        if (!validated.ok) {
            return { error: validated.error };
        }

        const finalScript: ParsedScript = {
            ...script,
            schema_version: 2,
            mappings: validated.sanitized,
        };

        await saveScript(finalScript);
        return { success: true };
    } catch (error: unknown) {
        console.error("[Import Validation Save] Error:", error);
        return { error: getErrorMessage(error) || "Erreur lors de la sauvegarde du script." };
    }
}

/**
 * Get user's subscription tier for client-side UI decisions
 */
export async function getUserTierAction(): Promise<"free" | "solo_pro" | "troupe" | "troupe_xl"> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return "free";

    const { getEffectiveTier } = await import("@/lib/subscription");
    return await getEffectiveTier(user.id);
}

export async function saveScript(script: ParsedScript) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("scripts")
        .insert({
            user_id: user.id,
            title: script.title || "Untitled Script",
            content: script,
        });

    if (error) {
        console.error("Error saving script:", error);
        throw new Error("Failed to save script");
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
}

export async function updateScriptContent(scriptId: string, newScript: ParsedScript) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check ownership
    const { data: existingScript } = await supabase
        .from("scripts")
        .select("user_id")
        .eq("id", scriptId)
        .single();

    if (!existingScript || existingScript.user_id !== user.id) {
        throw new Error("Unauthorized: You can only update your own scripts");
    }

    const { error } = await supabase
        .from("scripts")
        .update({
            title: newScript.title,
            content: newScript,
        })
        .eq("id", scriptId);

    if (error) {
        console.error("Error updating script:", error);
        throw new Error("Failed to update script");
    }

    revalidatePath("/dashboard");
}

export async function renameScriptAction(scriptId: string, newTitle: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check ownership
    const { data: existingScript } = await supabase
        .from("scripts")
        .select("user_id")
        .eq("id", scriptId)
        .single();

    if (!existingScript || existingScript.user_id !== user.id) {
        throw new Error("Unauthorized: You can only rename your own scripts");
    }

    const { error } = await supabase
        .from("scripts")
        .update({
            title: newTitle,
        })
        .eq("id", scriptId);

    if (error) {
        console.error("Error renaming script:", error);
        throw new Error("Failed to rename script");
    }

    revalidatePath("/dashboard");
}

export async function getScripts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Fetch only user's own scripts (catalog is separate)
    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at, user_id, is_public")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching scripts:", error);
        return [];
    }

    return data.map((row) => ({
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        characterCount: row.content?.characters?.length || 0,
        lineCount: row.content?.lines?.length || 0,
        is_public: row.is_public || false,
        is_owner: true, // Always true since we only fetch user's scripts
    }));
}

export async function togglePublicStatus(scriptId: string, currentStatus: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isPlatformAdminEmail(user.email)) {
        throw new Error("Unauthorized: Only Admin can manage library.");
    }

    const { error } = await supabase
        .from("scripts")
        .update({ is_public: !currentStatus })
        .eq("id", scriptId);

    if (error) throw new Error("Failed to update public status");

    revalidatePath("/dashboard");
}

export async function getScriptById(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Allow access if owner OR if public
    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at, user_id, is_public")
        .eq("id", id)
        .single();

    if (error || !data) {
        return null;
    }

    // Security Check: Must be owner OR script must be public
    if (data.user_id !== user.id && !data.is_public) {
        throw new Error("Unauthorized access to this script.");
    }

    return {
        id: data.id,
        title: data.title,
        ...data.content,
        created_at: data.created_at,
        is_public: data.is_public
    };
}

export async function deleteScript(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check if script is public before deleting
    const { data: script } = await supabase.from("scripts").select("is_public, user_id").eq("id", id).single();

    if (script?.is_public && !isPlatformAdminEmail(user.email)) {
        throw new Error("Cannot delete a public library script.");
    }

    const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Standard users can only delete their own. Admin usually owns the public ones anyway.

    if (error) {
        console.error("Error deleting script:", error);
        throw new Error("Failed to delete script");
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
}
export async function parsePdfAction(formData: FormData): Promise<ParseResult | { error: string }> {

    const file = formData.get("file") as File;
    const validation = validatePdfFile(file ?? null);
    if (!validation.ok) return { error: validation.error };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // REMOVED AI VISION FORCING - Reverting to robust heuristic parsing
        console.log("[Action] Using Heuristic-Guided parsing (No AI)");
        return await parseWithRegex(buffer);

    } catch (error) {
        console.error("Error parsing PDF:", error);
        return { error: "Failed to parse PDF file." };
    }
}



// Helper function for regex-based parsing
async function parseWithRegex(
    buffer: Buffer,
    validatedCharacters?: string[],
    aliasMap?: Record<string, string>,
    options: ParserOptions = {}
): Promise<ParseResult | { error: string }> {

    const pdf = require("pdf-parse/lib/pdf-parse.js");
    const { parseScript } = await import("@/lib/parser");

    // OPTION 1: Try standard pdf-parse text first (better for some fonts)
    const standardResult = await pdf(buffer);
    const standardText = standardResult.text;

    // Check if standard extraction looks good (has PERSO lines and no obvious corruption)
    const hasPersoLines = /^PERSO\s+/im.test(standardText);
    const hasCorruption = /[a-z][A-Z][a-z]/.test(standardText); // Pattern like "aSl" indicates font issues

    console.log("[Action] Standard extraction check - PERSO:", hasPersoLines, "Corruption:", hasCorruption);

    let cleanRawText: string;
    let allItems: { str: string; x: number; y: number; w: number }[] = [];

    // For PERSO format with clean text, use standard extraction
    if (hasPersoLines && !hasCorruption) {
        console.log("[Action] Using standard pdf-parse text extraction");
        cleanRawText = standardText;
    } else {
        console.log("[Action] Using custom text reconstruction (layout-aware)");

        const render_page = (pageData: any) => {
            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            };
            return pageData.getTextContent(render_options).then((textContent: any) => {
                for (const item of textContent.items) {
                    const str = item.str;
                    const x = item.transform[4];
                    const y = item.transform[5];
                    const w = item.width;

                    if (str.trim().length === 0 && w < 2) continue;
                    allItems.push({ str, x, y, w });
                }
                return "";
            });
        };

        await pdf(buffer, { pagerender: render_page });

        // RECONSTRUCTION: Build text respecting visual layout
        let cleanRawText = "";
        let lastY = -1;
        let lastX = -1;
        let lastWidth = 0;

        for (const item of allItems) {
            const isNewLine = lastY !== -1 && Math.abs(item.y - lastY) > 6;

            if (isNewLine) {
                cleanRawText += "\n";
                lastX = -1;
            } else {
                if (lastX !== -1) {
                    const gap = item.x - (lastX + lastWidth);
                    if (gap > 2) {
                        cleanRawText += " ";
                    }
                }
            }

            cleanRawText += item.str;

            lastY = item.y;
            lastX = item.x;
            lastWidth = item.w;
        }

        console.log("[Action] Text Reconstructed. Length:", cleanRawText.length);

        // DIAGNOSTIC: Detect text corruption (afflige -> aSlige issue)
        if (cleanRawText.toLowerCase().includes('slige') || cleanRawText.includes('aS')) {
            console.log("[Action] WARNING: Detected potential text corruption (aSlige pattern)");
            // Log a sample of the raw items around the corruption
            const corruptedItems = allItems.filter(item =>
                item.str.toLowerCase().includes('slige') || item.str.includes('aS')
            );
            if (corruptedItems.length > 0) {
                console.log("[Action] Corrupted items:", corruptedItems.slice(0, 5));
            }
        }

        // LIGATURE NORMALIZATION: Fix common PDF OCR issues
        // Some PDFs use typographic ligatures that pdf-parse doesn't decode properly
        const ligatureMap: Record<string, string> = {
            '\uFB00': 'ff',  // ﬀ
            '\uFB01': 'fi',  // ﬁ
            '\uFB02': 'fl',  // ﬂ
            '\uFB03': 'ffi', // ﬃ
            '\uFB04': 'ffl', // ﬄ
            '\uFB05': 'st',  // ﬅ (long st)
            '\uFB06': 'st',  // ﬆ
            '\u0132': 'IJ',  // Ĳ
            '\u0133': 'ij',  // ĳ
            '\u0152': 'OE',  // Œ
            '\u0153': 'oe',  // œ
            '\u00C6': 'AE',  // Æ
            '\u00E6': 'ae',  // æ
        };

        for (const [ligature, replacement] of Object.entries(ligatureMap)) {
            cleanRawText = cleanRawText.replace(new RegExp(ligature, 'g'), replacement);
        }

        // FONT CORRUPTION FIX: Some PDFs decode "ff" ligature as "S"
        // Pattern: vowel + S + lowercase letter → vowel + ff + letter
        // Examples: aSlige → afflige, aSaires → affaires, eSet → effet
        const fontCorruptionFixes: [RegExp, string][] = [
            [/aS([aeioulr])/g, 'aff$1'],  // affaire, afflige, affronter
            [/eS([aeiou])/g, 'eff$1'],    // effet, efface
            [/oS([aeiou])/g, 'off$1'],    // offre, offense
            [/iS([aeiou])/g, 'iff$1'],    // difficile
            [/uS([aeiou])/g, 'uff$1'],    // souffrir
        ];

        for (const [pattern, replacement] of fontCorruptionFixes) {
            cleanRawText = cleanRawText.replace(pattern, replacement);
        }
        console.log("[Action] Applied ligature and font corruption fixes");

        const script = parseScript(cleanRawText, validatedCharacters, aliasMap, options);


        if (script.lines.length === 0) {
            return { error: "Could not detect any dialogue lines. Ensure the script uses standard formatting (CHARACTER NAMES in CAPS)." };
        }

        return script;
    }

    // Standard extraction path (PERSO format with clean text)
    const script = parseScript(cleanRawText, validatedCharacters, aliasMap, options);


    if (script.lines.length === 0) {
        return { error: "Could not detect any dialogue lines. Ensure the script uses standard formatting (CHARACTER NAMES in CAPS)." };
    }

    return script;
}

export async function detectCharactersAction(formData: FormData): Promise<{ title?: string, characters: string[] } | { error: string }> {
    const file = formData.get("file") as File;
    const validation = validatePdfFile(file ?? null);
    if (!validation.ok) return { error: validation.error };

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        const { detectCharactersHeuristic } = await import("@/lib/parser");
        const pdf = require("pdf-parse/lib/pdf-parse.js");

        // Use the SAME text reconstruction as finalizeParsingAction
        // This ensures characters detected here will also be found in parsing
        let allItems: { str: string; x: number; y: number; w: number }[] = [];

        const render_page = (pageData: any) => {
            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            };
            return pageData.getTextContent(render_options).then((textContent: any) => {
                for (const item of textContent.items) {
                    const str = item.str;
                    const x = item.transform[4];
                    const y = item.transform[5];
                    const w = item.width;

                    if (str.trim().length === 0 && w < 2) continue;
                    allItems.push({ str, x, y, w });
                }
                return "";
            });
        };

        await pdf(buffer, { pagerender: render_page });

        // Reconstruct text (same logic as parseWithRegex)
        let cleanRawText = "";
        let lastY = -1;
        let lastX = -1;
        let lastWidth = 0;

        for (const item of allItems) {
            const isNewLine = lastY !== -1 && Math.abs(item.y - lastY) > 6;

            if (isNewLine) {
                cleanRawText += "\n";
                lastX = -1;
            } else {
                if (lastX !== -1) {
                    const gap = item.x - (lastX + lastWidth);
                    if (gap > 2) {
                        cleanRawText += " ";
                    }
                }
            }

            cleanRawText += item.str;

            lastY = item.y;
            lastX = item.x;
            lastWidth = item.w;
        }

        console.log("[Action] Detection using reconstructed text. Length:", cleanRawText.length);

        // Apply same ligature normalization as parseWithRegex
        const ligatureMap: Record<string, string> = {
            '\uFB00': 'ff', '\uFB01': 'fi', '\uFB02': 'fl', '\uFB03': 'ffi', '\uFB04': 'ffl',
            '\uFB05': 'st', '\uFB06': 'st', '\u0132': 'IJ', '\u0133': 'ij',
            '\u0152': 'OE', '\u0153': 'oe', '\u00C6': 'AE', '\u00E6': 'ae',
        };
        for (const [ligature, replacement] of Object.entries(ligatureMap)) {
            cleanRawText = cleanRawText.replace(new RegExp(ligature, 'g'), replacement);
        }

        // Use autoGroupCharacters: false to detect "VOIX DE X" as separate chars
        return detectCharactersHeuristic(cleanRawText, { autoGroupCharacters: false });
    } catch (error: any) {

        console.error("[Action] Detect error:", error);
        return { error: error.message };
    }
}

export async function finalizeParsingAction(formData: FormData, characters: string[], aliasMap?: Record<string, string>): Promise<ParseResult | { error: string }> {

    const file = formData.get("file") as File;
    const validation = validatePdfFile(file ?? null);
    if (!validation.ok) return { error: validation.error };

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        // Use the guided parse with validated characters and aliases
        // Enable strict whitelist and auto-grouping OFF (user maps manually) and PRESERVE ORIGINAL NAME
        return await parseWithRegex(buffer, characters, aliasMap, {
            strictWhitelist: true,
            autoGroupCharacters: false,
            preserveOriginalName: true
        });
    } catch (error: any) {

        console.error("[Action] Finalize error:", error);
        return { error: error.message };
    }
}

// ===== CATALOG ACTIONS =====

export interface CatalogScript {
    id: string;
    title: string;
    characterCount: number;
    lineCount: number;
    author?: string;
}

/**
 * Fetch all public scripts for the catalog browser
 */
export async function getCatalogScripts(): Promise<CatalogScript[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content")
        .eq("is_public", true)
        .order("title", { ascending: true });

    if (error) {
        console.error("Error fetching catalog:", error);
        return [];
    }

    return data.map((row) => ({
        id: row.id,
        title: row.title,
        characterCount: row.content?.characters?.length || 0,
        lineCount: row.content?.lines?.length || 0,
        author: row.content?.author || undefined,
    }));
}

/**
 * Import a script from the public catalog to user's personal library
 */
export async function importFromCatalog(sourceScriptId: string): Promise<{ success: boolean; newScriptId?: string; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Non authentifié" };
    }

    // 1. Fetch the source script
    const { data: sourceScript, error: fetchError } = await supabase
        .from("scripts")
        .select("title, content")
        .eq("id", sourceScriptId)
        .eq("is_public", true)
        .single();

    if (fetchError || !sourceScript) {
        console.error("Error fetching source script:", fetchError);
        return { success: false, error: "Script non trouvé dans le catalogue" };
    }

    // 2. Create a copy in user's personal library
    const { data: newScript, error: insertError } = await supabase
        .from("scripts")
        .insert({
            user_id: user.id,
            title: sourceScript.title,
            content: sourceScript.content,
            is_public: false, // Personal copy is private
        })
        .select("id")
        .single();

    if (insertError || !newScript) {
        console.error("Error creating script copy:", insertError);
        return { success: false, error: "Erreur lors de la copie du script" };
    }

    revalidatePath("/dashboard");
    return { success: true, newScriptId: newScript.id };
}
