"use server";

import { parseScript, ParserOptions, ParseResult } from "@/lib/parser";
import { ParsedScript, ScriptMappings } from "@/lib/types";


import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { getEffectiveTier } from "@/lib/subscription";
import { COLLECTIVE_ROLES } from "@/lib/constants";
import { generateVoiceAssignments } from "@/lib/voice-matching-core";
import { upsertVoiceAssignmentsBatch } from "@/lib/actions/voice-cache";

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

EXEMPLES

Entree brute:
ARNOLPHE. – Vous allez... Il la regarde. Non.
Agnès
Qu'est-ce ? 12

Sortie attendue:
[ARNOLPHE]
Vous allez... (Il la regarde.) Non.

[AGNÈS]
Qu'est-ce ?

Entree brute:
SCENE III ELMIRE, TARTUFFE
TARTUFFE, apercevant Elmire
Que le Ciel a jamais par sa
toute bonté,

Sortie attendue:
SCÈNE III

[TARTUFFE]
(Apercevant Elmire.) Que le Ciel à jamais par sa toute bonté,

IMPORTANT
- Retourner UNIQUEMENT le script nettoye final.
- Ne retourner aucune explication, aucun commentaire, aucun markdown.`;

function parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

function parseModelList(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

const AI_IMPORT_PROFILE = (process.env.OPENAI_IMPORT_PROFILE || "eco").toLowerCase();
const AI_CLEANING_PRIMARY_MODEL = process.env.OPENAI_IMPORT_CLEANING_MODEL || "gpt-5-pro";
const AI_CLEANING_FALLBACK_MODELS = parseModelList(process.env.OPENAI_IMPORT_CLEANING_FALLBACK_MODELS);
const AI_DIAGNOSTICS_PRIMARY_MODEL = process.env.OPENAI_IMPORT_DIAGNOSTICS_MODEL || (AI_IMPORT_PROFILE === "max" ? "gpt-5-pro" : "gpt-5-mini");
const AI_DIAGNOSTICS_FALLBACK_MODELS = parseModelList(process.env.OPENAI_IMPORT_DIAGNOSTICS_FALLBACK_MODELS);

const AI_CLEANING_MAX_INPUT_CHARS = parsePositiveInt(process.env.OPENAI_IMPORT_CLEANING_MAX_INPUT_CHARS, AI_IMPORT_PROFILE === "max" ? 110000 : 100000);
const AI_CLEANING_MAX_OUTPUT_TOKENS = parsePositiveInt(process.env.OPENAI_IMPORT_CLEANING_MAX_OUTPUT_TOKENS, AI_IMPORT_PROFILE === "max" ? 16000 : 14000);
const AI_DIAGNOSTICS_MAX_OUTPUT_TOKENS = parsePositiveInt(process.env.OPENAI_IMPORT_DIAGNOSTICS_MAX_OUTPUT_TOKENS, AI_IMPORT_PROFILE === "max" ? 7000 : 2200);
const AI_CLEANING_TIMEOUT_MS = parsePositiveInt(process.env.OPENAI_IMPORT_CLEANING_TIMEOUT_MS, AI_IMPORT_PROFILE === "max" ? 240000 : 200000);
const AI_DIAGNOSTICS_TIMEOUT_MS = parsePositiveInt(process.env.OPENAI_IMPORT_DIAGNOSTICS_TIMEOUT_MS, AI_IMPORT_PROFILE === "max" ? 180000 : 90000);

const DIAGNOSTICS_MAX_LINES = parsePositiveInt(process.env.OPENAI_IMPORT_DIAGNOSTICS_MAX_LINES, AI_IMPORT_PROFILE === "max" ? 2200 : 1400);
const DIAGNOSTICS_MAX_LINE_TEXT = parsePositiveInt(process.env.OPENAI_IMPORT_DIAGNOSTICS_MAX_LINE_TEXT, AI_IMPORT_PROFILE === "max" ? 240 : 180);

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
    voiceAssignments?: Array<{ characterName: string, voiceId: string, justification: string }>;
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

function isQuotaOrBillingError(error: unknown): boolean {
    const candidate = error as {
        code?: string;
        message?: string;
        error?: { code?: string; type?: string; message?: string };
    };

    const code = (candidate.code || candidate.error?.code || "").toLowerCase();
    const message = `${candidate.message || ""} ${candidate.error?.message || ""}`.toLowerCase();

    if (code === "insufficient_quota" || code === "billing_hard_limit_reached") return true;
    return (
        message.includes("exceeded your current quota")
        || message.includes("insufficient_quota")
        || message.includes("billing")
        || message.includes("credit balance")
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    const candidate = error as { message?: unknown };
    return typeof candidate.message === "string" && candidate.message ? candidate.message : "Unknown error";
}

function normalizeCharacterLabel(value: string): string {
    return (value || "")
        .replace(/[’ʼ]/g, "'")
        .toUpperCase()
        .replace(/[.,:;]+$/g, "")
        .replace(/^VOIX\s+DE\s+LA\s+/i, "")
        .replace(/^VOIX\s+DU\s+/i, "")
        .replace(/^VOIX\s+DES\s+/i, "")
        .replace(/^VOIX\s+DE\s+/i, "")
        .replace(/^VOIX\s+(?:[A-ZÀ-ÖØ-Þ]+\s+)*D['’ʼ]\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

function buildCanonicalCharacters(characters: string[]): string[] {
    const unique = new Set<string>();
    for (const character of characters) {
        const normalized = normalizeCharacterLabel(character || "");
        if (normalized) unique.add(normalized);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "fr"));
}

function resolveCanonicalCharactersFromScript(script: Partial<ParsedScript> | null | undefined): string[] {
    const fromMappings = script?.mappings?.canonical_characters;
    if (Array.isArray(fromMappings) && fromMappings.length > 0) {
        return buildCanonicalCharacters(fromMappings);
    }
    return buildCanonicalCharacters(script?.characters || []);
}

function normalizeConfidence(value: unknown, fallback = 0.5): number {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(0, Math.min(1, value));
}

function normalizeForMatching(value: string): string {
    return normalizeCharacterLabel(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9\s']/g, " ")
        .replace(/'+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const LINKING_STOP_WORDS = new Set([
    "DE", "DU", "DES", "D", "LE", "LA", "LES", "L", "ET", "A", "AU", "AUX", "THE", "OF",
]);

function tokenizeLabelForMatching(value: string): string[] {
    const normalized = normalizeForMatching(value);
    if (!normalized) return [];
    return normalized
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !LINKING_STOP_WORDS.has(token));
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + cost
            );
        }
    }

    return matrix[b.length][a.length];
}

function similarityRatio(a: string, b: string): number {
    const left = normalizeForMatching(a);
    const right = normalizeForMatching(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    const distance = levenshteinDistance(left, right);
    return Math.max(0, 1 - (distance / Math.max(left.length, right.length)));
}

function buildDialogueCountByLabel(script: ParsedScript): Map<string, number> {
    const counts = new Map<string, number>();
    (script.lines || []).forEach((line) => {
        if (line.type !== "dialogue") return;
        const label = normalizeCharacterLabel(line.character || "");
        if (!label) return;
        counts.set(label, (counts.get(label) || 0) + 1);
    });
    return counts;
}

function buildLabelScenes(script: ParsedScript): Map<string, Set<number>> {
    const byLabel = new Map<string, Set<number>>();
    (script.lines || []).forEach((line, idx) => {
        if (line.type !== "dialogue") return;
        const label = normalizeCharacterLabel(line.character || "");
        if (!label) return;
        const sceneStart = getSceneStartForLine(script, idx);
        const set = byLabel.get(label) || new Set<number>();
        set.add(sceneStart);
        byLabel.set(label, set);
    });
    return byLabel;
}

function computeJaccard(left: Set<number> | undefined, right: Set<number> | undefined): number {
    if (!left || !right || left.size === 0 || right.size === 0) return 0;
    let intersection = 0;
    left.forEach((value) => {
        if (right.has(value)) intersection += 1;
    });
    const union = left.size + right.size - intersection;
    return union > 0 ? intersection / union : 0;
}

function buildContextVotes(
    script: ParsedScript,
    canonicalSet: Set<string>
): Map<string, Map<string, number>> {
    const votes = new Map<string, Map<string, number>>();
    const lines = script.lines || [];
    const WINDOW = 6;

    const addVote = (source: string, target: string, score: number) => {
        const sourceVotes = votes.get(source) || new Map<string, number>();
        sourceVotes.set(target, (sourceVotes.get(target) || 0) + score);
        votes.set(source, sourceVotes);
    };

    for (let idx = 0; idx < lines.length; idx += 1) {
        const line = lines[idx];
        if (line.type !== "dialogue") continue;

        const source = normalizeCharacterLabel(line.character || "");
        if (!source || canonicalSet.has(source) || isCollectiveLabelCandidate(source)) continue;

        let previousCanonical: string | null = null;
        for (let p = idx - 1; p >= Math.max(0, idx - WINDOW); p -= 1) {
            const candidate = lines[p];
            if (candidate.type !== "dialogue") continue;
            const label = normalizeCharacterLabel(candidate.character || "");
            if (canonicalSet.has(label) && !isCollectiveLabelCandidate(label)) {
                previousCanonical = label;
                break;
            }
        }

        let nextCanonical: string | null = null;
        for (let n = idx + 1; n <= Math.min(lines.length - 1, idx + WINDOW); n += 1) {
            const candidate = lines[n];
            if (candidate.type !== "dialogue") continue;
            const label = normalizeCharacterLabel(candidate.character || "");
            if (canonicalSet.has(label) && !isCollectiveLabelCandidate(label)) {
                nextCanonical = label;
                break;
            }
        }

        if (previousCanonical) addVote(source, previousCanonical, 0.6);
        if (nextCanonical) addVote(source, nextCanonical, 0.6);
    }

    return votes;
}

function isLikelyCanonicalCharacterLabel(label: string, dialogueCount: number): boolean {
    if (!label) return false;
    if (isCollectiveLabelCandidate(label)) return false;
    if (extractPotentialSpeakerParts(label).length > 1) return false;

    const tokens = tokenizeLabelForMatching(label);
    const hasRelationalLinker = /\b(?:DE|DU|DES|OF|FROM)\b/i.test(label);

    if (dialogueCount >= 3) return true;
    if (tokens.length <= 2 && label.length <= 22) return true;
    if (!hasRelationalLinker && tokens.length <= 3 && label.length <= 26) return true;
    return false;
}

function buildDeterministicAliasSuggestionsFromScript(
    script: ParsedScript,
    allCandidateCharacters: string[],
    canonicalCharacters: string[]
): AliasSuggestion[] {
    const allLabels = Array.from(new Set(allCandidateCharacters.map((value) => normalizeCharacterLabel(value)).filter(Boolean)));
    const canonicalSet = new Set(canonicalCharacters);
    const dialogueCounts = buildDialogueCountByLabel(script);
    const sceneByLabel = buildLabelScenes(script);
    const contextVotes = buildContextVotes(script, canonicalSet);
    const suggestions = new Map<string, AliasSuggestion>();

    const unresolvedSources = allLabels.filter((label) => (
        !canonicalSet.has(label)
        && !isCollectiveLabelCandidate(label)
        && extractPotentialSpeakerParts(label).length <= 1
    ));

    for (const source of unresolvedSources) {
        const sourceTokens = tokenizeLabelForMatching(source);
        const sourceScenes = sceneByLabel.get(source);
        const sourceCount = dialogueCounts.get(source) || 1;
        const votes = contextVotes.get(source) || new Map<string, number>();
        const totalVotes = Array.from(votes.values()).reduce((acc, value) => acc + value, 0);

        let bestCandidate: AliasSuggestion | null = null;

        for (const target of canonicalCharacters) {
            if (source === target) continue;
            if (isCollectiveLabelCandidate(target)) continue;

            const targetTokens = tokenizeLabelForMatching(target);
            const targetScenes = sceneByLabel.get(target);
            const targetCount = dialogueCounts.get(target) || 1;
            const isTokenSubset = targetTokens.length > 0 && targetTokens.every((token) => sourceTokens.includes(token));
            const hasStrictWordMatch = new RegExp(`(?:^|\\s)${escapeRegExp(target)}(?:$|\\s)`, "i").test(source);
            const sim = similarityRatio(source, target);
            const sceneSimilarity = computeJaccard(sourceScenes, targetScenes);
            const targetVotes = votes.get(target) || 0;
            const contextScore = totalVotes > 0 ? targetVotes / totalVotes : 0;

            let confidence = 0;
            let reason = "Appellation alternative détectée. Vérifiez si elle correspond au personnage canonique proposé.";

            if (isTokenSubset && sourceTokens.length > targetTokens.length) {
                const coverage = targetTokens.length / sourceTokens.length;
                confidence = 0.56 + (coverage * 0.22) + (targetCount >= sourceCount ? 0.08 : 0) + (hasStrictWordMatch ? 0.1 : 0);
                reason = "Le libellé semble être une variante descriptive du personnage canonique.";
            } else if (sim >= 0.86 && target.length <= source.length) {
                confidence = 0.5 + (sim * 0.35) + (targetCount >= sourceCount ? 0.06 : 0);
                reason = "Le libellé semble proche d’une autre appellation déjà canonique.";
            } else if (contextScore >= 0.45 || (sceneSimilarity >= 0.6 && contextScore >= 0.2)) {
                confidence = 0.42 + (contextScore * 0.34) + (sceneSimilarity * 0.2);
                reason = "Le contexte des répliques suggère une liaison avec ce personnage canonique.";
            }

            confidence = Math.max(0, Math.min(0.98, confidence));
            if (confidence < 0.4) continue;

            const candidate: AliasSuggestion = {
                id: `alias:${source}->${target}`,
                source,
                target,
                confidence,
                reason,
                requiresDecision: true,
            };

            if (!bestCandidate || candidate.confidence > bestCandidate.confidence) {
                bestCandidate = candidate;
            }
        }

        if (bestCandidate) {
            suggestions.set(bestCandidate.id, bestCandidate);
        }
    }

    return Array.from(suggestions.values()).sort((a, b) => b.confidence - a.confidence);
}

function resolveCanonicalCharactersAndAliasSuggestions(
    script: ParsedScript,
    canonicalCharactersInput?: string[]
): { canonicalCharacters: string[]; deterministicAliasSuggestions: AliasSuggestion[] } {
    const sourceCharacters = buildCanonicalCharacters(
        canonicalCharactersInput && canonicalCharactersInput.length > 0
            ? canonicalCharactersInput
            : (script.characters || [])
    ).filter((label) => !isCollectiveLabelCandidate(label) && extractPotentialSpeakerParts(label).length <= 1);

    const dialogueCounts = buildDialogueCountByLabel(script);
    const canonicalSet = new Set<string>();
    sourceCharacters.forEach((label) => {
        if (isLikelyCanonicalCharacterLabel(label, dialogueCounts.get(label) || 0)) {
            canonicalSet.add(label);
        }
    });

    if (canonicalSet.size === 0) {
        sourceCharacters.forEach((label) => canonicalSet.add(label));
    }

    const canonicalCandidates = Array.from(canonicalSet).sort((a, b) => a.localeCompare(b, "fr"));
    const deterministicAliasSuggestions = buildDeterministicAliasSuggestionsFromScript(
        script,
        sourceCharacters,
        canonicalCandidates
    );

    let canonicalCharacters = Array.from(canonicalSet).sort((a, b) => a.localeCompare(b, "fr"));
    if (canonicalCharacters.length === 0) {
        canonicalCharacters = sourceCharacters;
    }

    const canonicalTargetSet = new Set(canonicalCharacters);
    const filteredDeterministicAliasSuggestions = deterministicAliasSuggestions.filter((item) => canonicalTargetSet.has(item.target));

    return {
        canonicalCharacters,
        deterministicAliasSuggestions: filteredDeterministicAliasSuggestions,
    };
}

function mergeAliasSuggestions(preferred: AliasSuggestion[], extras: AliasSuggestion[]): AliasSuggestion[] {
    const buildKey = (item: AliasSuggestion) => `${normalizeCharacterLabel(item.source)}->${normalizeCharacterLabel(item.target)}`;
    const merged = new Map<string, AliasSuggestion>();
    preferred.forEach((item) => {
        merged.set(buildKey(item), item);
    });
    extras.forEach((item) => {
        const key = buildKey(item);
        const existing = merged.get(key);
        if (!existing || item.confidence > existing.confidence) {
            merged.set(key, item);
        }
    });
    return Array.from(merged.values()).sort((a, b) => b.confidence - a.confidence);
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
                ? `${item.label} (Scène ${item.sceneIndex})`
                : item.label,
            reason: item.reason,
            confidence: item.confidence,
            requiresDecision: true as const,
        })),
        ...sceneDiagnostics.map((item) => ({
            id: item.id,
            kind: "scene" as const,
            label: `Scène ${item.sceneIndex}`,
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
                ? "Rôle collectif détecté dans cette scène à partir des locuteurs présents. Vérifiez les membres proposés."
                : "Rôle collectif détecté pour l’ensemble du script. Vérifiez les membres proposés.",
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
    const byScene = new Map<number, SceneDiagnostic[]>();
    Array.from(normalizedSceneDiagnosticMap.values())
        .filter((item) => item.issue !== "other")
        .forEach((item) => {
            const list = byScene.get(item.sceneIndex) || [];
            list.push(item);
            byScene.set(item.sceneIndex, list);
        });

    const normalizedSceneDiagnostics: SceneDiagnostic[] = [];
    byScene.forEach((items) => {
        const sorted = [...items].sort((a, b) => {
            const issuePriority = (issue: SceneDiagnostic["issue"]) => (
                issue === "ambiguous_label" ? 2 : issue === "uncertain_boundary" ? 1 : 0
            );
            const byIssue = issuePriority(b.issue) - issuePriority(a.issue);
            if (byIssue !== 0) return byIssue;
            return b.confidence - a.confidence;
        });

        const best = sorted[0];
        if (best && best.confidence >= 0.65) {
            normalizedSceneDiagnostics.push(best);
        }
    });

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
        if (isCollectiveLabelCandidate(source) || isCollectiveLabelCandidate(target)) continue;
        if (extractPotentialSpeakerParts(source).length > 1) continue;
        if (!canonicalSet.has(target)) continue;

        const id = `alias:${source}->${target}`;
        if (aliasSeen.has(id)) continue;
        aliasSeen.add(id);

        aliasSuggestions.push({
            id,
            source,
            target,
            confidence: normalizeConfidence(candidate.confidence, 0.65),
            reason: "Appellation alternative détectée. Vérifiez si elle correspond au personnage canonique proposé.",
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
            reason: scope === "scene"
                ? "Rôle collectif détecté pour cette scène. Vérifiez les membres."
                : "Rôle collectif détecté pour l’ensemble du script. Vérifiez les membres.",
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
            reason: issue === "ambiguous_label"
                ? "Un libellé de locuteur semble ambigu dans cette scène."
                : issue === "uncertain_boundary"
                    ? "La limite de cette scène semble incertaine."
                    : "Un point de contrôle a été détecté sur cette scène.",
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

import { cleanAndParseJSON } from "@/lib/utils/json-parser";

function parseAiDiagnosticsJson(payload: string): AiDiagnosticsRaw {
    return cleanAndParseJSON<AiDiagnosticsRaw>(payload);
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
2) Roles collectifs (CRUCIAL):
   - scope global pour labels stables de l'histoire (ex: LES DEUX CAVALIERS)
   - scope scene pour les labels contextuels (ex: TOUS, TOUS DEUX, ENSEMBLE)
   => REGLE D'INFERENCE OBLIGATOIRE "TOUS DEUX / LES DEUX" : Tu DOIS isoler cette réplique, regarder juste au-dessus les 2 derniers personnages uniques qui viennent de s'exprimer dans la scène, et ce sont obligatoirement eux les membres.
   => REGLE D'INFERENCE OBLIGATOIRE "TOUS / ENSEMBLE" : Au lieu de deviner, traverse toute la scène courante depuis son début, liste tous les personnages physiquement présents (qui ont parlé ou été explicitement mentionnés dans les didascalies comme présents). C'est la liste exacte des membres, n'extrapole pas avec des personnages d'autres scènes.
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
- Tous les champs "reason" doivent etre ecrits en francais.

Ne renvoie que du JSON valide.`;
}



/**
 * Clean and restructure a messy script using AI.
 * Returns canonical text expected by parseScript ([CHAR], dialogue, (didascalies), ACTE/SCENE)
 */
/**
 * Split text into chunks of approximately `maxChars` characters,
 * breaking at paragraph boundaries (double newline) with overlap.
 */
function splitTextIntoChunks(text: string, maxChars: number, overlapChars: number = 500): string[] {
    if (text.length <= maxChars) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + maxChars, text.length);

        // Try to break at a paragraph boundary (double newline) near the end
        if (end < text.length) {
            const searchStart = Math.max(start + maxChars * 0.7, start); // Look in the last 30% of the chunk
            const searchRegion = text.substring(searchStart, end);
            const lastBreak = searchRegion.lastIndexOf("\n\n");
            if (lastBreak !== -1) {
                end = searchStart + lastBreak + 2; // Include the double newline
            }
        }

        chunks.push(text.substring(start, end));

        // Next chunk starts with overlap to avoid cutting mid-line
        start = Math.max(start + 1, end - overlapChars);
    }

    console.log(`[AI Clean] Split into ${chunks.length} chunks: ${chunks.map(c => c.length).join(", ")} chars`);
    return chunks;
}

/**
 * Remove duplicate lines at chunk boundaries caused by overlap.
 * Compares the last N lines of the previous result with the first N lines of the next.
 */
function mergeChunkResults(results: string[]): string {
    if (results.length <= 1) return results[0] || "";

    let merged = results[0];

    for (let i = 1; i < results.length; i++) {
        const prevLines = merged.split("\n");
        const nextLines = results[i].split("\n");

        // Find overlap: check if the last N lines of prev match the first N lines of next
        const overlapWindow = Math.min(10, prevLines.length, nextLines.length);
        let bestOverlap = 0;

        for (let overlap = 1; overlap <= overlapWindow; overlap++) {
            const prevTail = prevLines.slice(-overlap).map(l => l.trim()).join("\n");
            const nextHead = nextLines.slice(0, overlap).map(l => l.trim()).join("\n");
            if (prevTail === nextHead) {
                bestOverlap = overlap;
            }
        }

        // Skip overlapping lines from the next chunk
        const uniqueNextLines = nextLines.slice(bestOverlap);
        merged = merged + "\n" + uniqueNextLines.join("\n");
    }

    return merged;
}

// Maximum chars per chunk: ~40K chars ≈ ~10K tokens, well within model limits
const AI_CHUNK_MAX_CHARS = 40000;
const AI_CHUNK_OVERLAP_CHARS = 500;

export async function cleanScriptWithAI(rawText: string): Promise<string | { error: string }> {
    try {
        console.log("[AI Clean] Starting AI cleaning, text length:", rawText.length);

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: AI_CLEANING_TIMEOUT_MS,
        });

        const modelsToTry = [
            AI_CLEANING_PRIMARY_MODEL,
            ...AI_CLEANING_FALLBACK_MODELS.filter((m) => m !== AI_CLEANING_PRIMARY_MODEL),
        ];

        // Split text into manageable chunks
        const chunks = splitTextIntoChunks(rawText, AI_CHUNK_MAX_CHARS, AI_CHUNK_OVERLAP_CHARS);
        console.log(`[AI Clean] Processing ${chunks.length} chunk(s)`);

        const chunkResults: string[] = [];

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            let lastError: unknown = null;
            let chunkCleaned = false;

            const chunkContext = chunks.length > 1
                ? `\n\n[CONTEXTE: Ceci est la partie ${chunkIdx + 1}/${chunks.length} du script. Traite-la independamment.]`
                : "";

            for (const model of modelsToTry) {
                try {
                    console.log(`[AI Clean] Chunk ${chunkIdx + 1}/${chunks.length} — model: ${model} — ${chunk.length} chars`);
                    const response = await openai.responses.create({
                        model,
                        input: [
                            { role: "system", content: AI_CLEANING_PROMPT + chunkContext },
                            { role: "user", content: chunk },
                        ],
                        reasoning: AI_IMPORT_PROFILE === "max"
                            ? (model === "gpt-5-pro" && chunk.length > 100000 ? { effort: "high" } : { effort: "medium" })
                            : { effort: "low" },
                        max_output_tokens: AI_CLEANING_MAX_OUTPUT_TOKENS,
                    });

                    const cleanedText = extractResponsesOutputText(response);
                    if (cleanedText) {
                        console.log(`[AI Clean] Chunk ${chunkIdx + 1} done — ${cleanedText.length} chars output`);
                        chunkResults.push(cleanedText);
                        chunkCleaned = true;
                        break;
                    }

                    lastError = new Error(`No output text returned by model ${model}`);
                    console.warn("[AI Clean] Empty response from model:", model);
                } catch (err: unknown) {
                    lastError = err;
                    console.warn(`[AI Clean] Model ${model} failed on chunk ${chunkIdx + 1}:`, getErrorMessage(err));
                    if (isQuotaOrBillingError(err)) {
                        break;
                    }
                }
            }

            if (!chunkCleaned) {
                throw lastError || new Error(`No model returned usable output for chunk ${chunkIdx + 1}`);
            }
        }

        // Merge chunk results, removing duplicate lines at boundaries
        const mergedResult = mergeChunkResults(chunkResults);
        console.log("[AI Clean] Final merged output:", mergedResult.length, "chars from", chunks.length, "chunks");
        return mergedResult;

    } catch (error: unknown) {
        console.error("[AI Clean] Error:", error);

        if (isTimeoutError(error)) {
            return { error: "Le nettoyage IA a pris trop de temps. Essayez avec un PDF plus court." };
        }

        if (isQuotaOrBillingError(error)) {
            return { error: "Quota OpenAI depasse. Rechargez les credits ou utilisez un modele moins couteux via OPENAI_IMPORT_PROFILE=eco." };
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

        const {
            canonicalCharacters,
            deterministicAliasSuggestions,
        } = resolveCanonicalCharactersAndAliasSuggestions(script, canonicalCharactersInput);

        if (canonicalCharacters.length === 0) {
            return buildEmptyDiagnostics(canonicalCharacters);
        }

        if (!process.env.OPENAI_API_KEY) {
            console.warn("[AI Diagnostics] OPENAI_API_KEY absent, fallback diagnostics vide.");
            const fallback = {
                ...buildEmptyDiagnostics(canonicalCharacters),
                aliasSuggestions: deterministicAliasSuggestions,
                blockingDecisions: buildBlockingDecisions(
                    deterministicAliasSuggestions,
                    [],
                    []
                ),
            };
            return mergeDiagnosticsWithDeterministicCollectives(fallback, script);
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: AI_DIAGNOSTICS_TIMEOUT_MS,
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
                    reasoning: AI_IMPORT_PROFILE === "max" ? { effort: "medium" } : { effort: "low" },
                    max_output_tokens: AI_DIAGNOSTICS_MAX_OUTPUT_TOKENS,
                });

                const output = extractResponsesOutputText(response);
                const raw = parseAiDiagnosticsJson(output);
                const sanitized = sanitizeAiDiagnostics(raw, canonicalCharacters);
                const mergedAliasSuggestions = mergeAliasSuggestions(
                    sanitized.aliasSuggestions,
                    deterministicAliasSuggestions
                );

                const diagnostics = mergeDiagnosticsWithDeterministicCollectives(
                    {
                        ...sanitized,
                        aliasSuggestions: mergedAliasSuggestions,
                        blockingDecisions: buildBlockingDecisions(
                            mergedAliasSuggestions,
                            sanitized.collectiveSuggestions,
                            sanitized.sceneDiagnostics
                        ),
                    },
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
                if (isQuotaOrBillingError(err)) {
                    break;
                }
            }
        }

        throw lastError || new Error("Aucun modele n'a retourne de diagnostics exploitables.");
    } catch (error: unknown) {
        console.error("[AI Diagnostics] Error:", error);
        if (isQuotaOrBillingError(error)) {
            return { error: "Quota OpenAI depasse. Rechargez les credits avant le scan final." };
        }
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

        // Front-end labels can differ while resolving to the same canonical form
        // (e.g. "VOIX DE ANNETTE" -> "ANNETTE"). Ignore those no-op aliases.
        if (source === target) {
            continue;
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
): Promise<{ success: true; scriptId: string } | { error: string }> {
    try {
        const validated = validateResolvedMappings(submission.diagnostics, submission.decisions, submission.mappings);
        if (!validated.ok) {
            return { error: validated.error };
        }

        // Build enriched aliases: include explicit ones + auto-detect "VOIX DE X" → "X"
        const enrichedAliases: Record<string, string> = { ...(validated.sanitized.aliases || {}) };
        const canonicalSet = new Set(validated.sanitized.canonical_characters);

        // Auto-generate aliases for "VOIX DE X" labels found in the script
        const voixDePattern = /^VOIX\s+(?:DE\s+LA\s+|DU\s+|DES\s+|DE\s+|(?:[A-ZÀ-ÖØ-Þ]+\s+)*D[''ʼ]\s*)/i;
        for (const line of (script.lines || [])) {
            if (line.type !== "dialogue") continue;
            const raw = normalizeCharacterLabel(line.character || "");
            if (!raw || canonicalSet.has(raw)) continue;
            if (!voixDePattern.test(raw)) continue;
            if (enrichedAliases[raw]) continue; // Already has an explicit alias

            // Strip the prefix to find the canonical target
            const stripped = raw
                .replace(/^VOIX\s+DE\s+LA\s+/i, "")
                .replace(/^VOIX\s+DU\s+/i, "")
                .replace(/^VOIX\s+DES\s+/i, "")
                .replace(/^VOIX\s+DE\s+/i, "")
                .replace(/^VOIX\s+(?:[A-ZÀ-ÖØ-Þ]+\s+)*D[''ʼ]\s*/i, "")
                .replace(/\s+/g, " ")
                .trim();
            if (stripped && canonicalSet.has(stripped)) {
                enrichedAliases[raw] = stripped;
            }
        }

        // Store enriched aliases in the sanitized mappings
        validated.sanitized.aliases = enrichedAliases;

        // Keep lines as-is — do NOT rewrite line.character
        const finalScript: ParsedScript = {
            ...script,
            lines: script.lines || [],
            characters: validated.sanitized.canonical_characters,
            schema_version: 2,
            mappings: validated.sanitized,
        };

        const scriptId = await saveScript(finalScript);

        const providedAssignments = (submission.voiceAssignments || [])
            .filter((assignment) => (assignment.characterName || "").trim() && (assignment.voiceId || "").trim());

        const assignmentsToPersist = providedAssignments.length > 0
            ? providedAssignments
            : (await generateVoiceAssignments({
                characters: finalScript.characters || [],
                scriptContextLines: finalScript.lines ? finalScript.lines.slice(0, 800) : null,
                preferAi: false,
            })).assignments;

        if (assignmentsToPersist.length > 0) {
            const saveVoicesResult = await upsertVoiceAssignmentsBatch(
                "private_script",
                scriptId,
                assignmentsToPersist.map((assignment) => ({
                    characterName: assignment.characterName,
                    voiceId: assignment.voiceId,
                })),
                "google",
                { stability: 0.5, similarity_boost: 0.75 }
            );

            if (!saveVoicesResult.success) {
                console.error("[Import Validation Save] Voice batch upsert failed:", saveVoicesResult.error);
            }
        }

        return { success: true, scriptId };
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

    const { data, error } = await supabase
        .from("scripts")
        .insert({
            user_id: user.id,
            title: script.title || "Untitled Script",
            content: script,
        })
        .select("id")
        .single();

    if (error) {
        console.error("Error saving script:", error);
        throw new Error("Failed to save script");
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return data.id as string;
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
        .select("id, title, content, created_at, user_id, is_public, vocalization_status, vocalization_progress")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching scripts:", error);
        return [];
    }

    return data.map((row) => {
        const content = row.content as ParsedScript | undefined;

        // Legacy scripts have 'pending' status due to DB default but no progress.
        // We consider them 'completed' if they were created before the vocalization feature (e.g. before Feb 24, 2026)
        // or if they have exactly 0 progress but are older than a day.
        const isLegacy = new Date(row.created_at) < new Date('2026-02-24T00:00:00Z');
        let finalStatus = row.vocalization_status;
        if (isLegacy && row.vocalization_status === 'pending' && row.vocalization_progress === 0) {
            finalStatus = 'completed';
        }

        return {
            id: row.id,
            title: row.title,
            created_at: row.created_at,
            characterCount: resolveCanonicalCharactersFromScript(content).length,
            lineCount: content?.lines?.length || 0,
            is_public: row.is_public || false,
            is_owner: true, // Always true since we only fetch user's scripts
            vocalization_status: finalStatus,
            vocalization_progress: isLegacy ? 100 : row.vocalization_progress
        };
    });
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

    const content = data.content as ParsedScript;
    const canonicalCharacters = resolveCanonicalCharactersFromScript(content);

    return {
        id: data.id,
        title: data.title,
        ...content,
        characters: canonicalCharacters,
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

        // Keep descriptive speaker labels separated at detection stage
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
        .select("title, content, vocalization_status, vocalization_progress")
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
            content: { ...(sourceScript.content as object), original_script_id: sourceScriptId },
            is_public: false, // Personal copy is private
            vocalization_status: sourceScript.vocalization_status || "completed",
            vocalization_progress: sourceScript.vocalization_progress || 100
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

export async function cancelVocalization(scriptId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Non authentifié" };
    }

    // Verify ownership
    const { data: script, error: fetchError } = await supabase
        .from("scripts")
        .select("user_id")
        .eq("id", scriptId)
        .single();

    if (fetchError || !script) {
        return { success: false, error: "Script introuvable" };
    }

    if (script.user_id !== user.id) {
        return { success: false, error: "Non autorisé" };
    }

    // Cancel vocalization by setting it to failed or completed (failed makes it clear it didn't finish)
    const { error: updateError } = await supabase
        .from("scripts")
        .update({
            vocalization_status: "failed", // We use failed to stop the spinner
        })
        .eq("id", scriptId);

    if (updateError) {
        console.error("Error cancelling vocalization:", updateError);
        return { success: false, error: "Erreur lors de l'annulation" };
    }

    revalidatePath("/dashboard");
    return { success: true };
}
