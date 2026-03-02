import OpenAI from "openai";
import type { ScriptLine } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";

export interface VoiceCatalogEntry {
    id?: string;
    voice_id: string;
    target_role: string;
    score_genre: number;
    score_age: number;
    score_tonalite: number;
    score_comedien: number;
    score_didascalie: number;
    score_projection: number;
    score_vitesse: number;
    score_texture: number;
    score_temperature: number;
    score_energie: number;
}

export interface VoiceMatchingScores {
    score_genre: number;
    score_age: number;
    score_tonalite: number;
    score_comedien: number;
    score_didascalie: number;
    score_projection: number;
    score_vitesse: number;
    score_texture: number;
    score_temperature: number;
    score_energie: number;
}

export interface VoiceMatchingProfile {
    characterName: string;
    scores: VoiceMatchingScores;
    artisticAnalysis: string;
}

export interface VoiceMatchingAssignment {
    characterName: string;
    voiceId: string;
    justification: string;
}

export interface GenerateVoiceAssignmentsParams {
    characters: string[];
    scriptContextLines: Pick<ScriptLine, "character" | "text" | "type">[] | null;
    apiKey?: string;
    preferAi?: boolean;
    timeoutMs?: number;
    model?: string;
}

export interface GenerateVoiceAssignmentsResult {
    assignments: VoiceMatchingAssignment[];
    source: "ai" | "heuristic";
}

const DEFAULT_VOICE_ID = "Aoede";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_CHARACTERS_FOR_AI = 80;
const MAX_SAMPLES_PER_CHARACTER = 3;
const MAX_SAMPLE_LENGTH = 180;

const CASTING_SYSTEM_PROMPT = `Tu es un directeur de casting vocal pour des pièces de théâtre francophones.
Tu renvoies UNIQUEMENT un objet JSON valide avec ce schéma exact.
Note scrupuleusement de 1 à 4 chaque personnage selon les 10 critères précis suivants :
- score_genre: 1=Très Masculin, 4=Très Féminin
- score_age: 1=Enfant, 2=Ado/Jeune, 3=Adulte Mûr, 4=Senior
- score_tonalite: 1=Très Grave (Basse), 4=Très Aigu (Soprano)
- score_comedien: 1=Moyen (rôle basique), 4=Excellent (rôle exigeant)
- score_didascalie: 1=Moyenne, 4=Excellente (voix off idéale, narrateur)
- score_projection: 1=Chuchoté, 2=Intime, 3=Direct (parlé haut), 4=Exclamatif (Théâtral)
- score_vitesse: 1=Très Lente, 4=Trépidante
- score_texture: 1=Lisse/Pure, 2=Satinée, 3=Voilée, 4=Granuleuse
- score_temperature: 1=Glacial, 2=Froid, 3=Avenant, 4=Solaire
- score_energie: 1=Amorphe, 2=Posé, 3=Dynamique, 4=Explosif

{
  "profiles": [
    {
      "characterName": "NOM",
      "scores": {
        "score_genre": 1-4,
        "score_age": 1-4,
        "score_tonalite": 1-4,
        "score_comedien": 1-4,
        "score_didascalie": 1-4,
        "score_projection": 1-4,
        "score_vitesse": 1-4,
        "score_texture": 1-4,
        "score_temperature": 1-4,
        "score_energie": 1-4
      },
      "artisticAnalysis": "max 18 mots justificatifs"
    }
  ]
}
Contraintes:
- Un profil pour chaque personnage.
- Toutes les notes sont numériques (1 à 4), pas de floats sauf si incertain.
- Si le personnage est un narrateur/didascalie (indiqué par son nom ou son peu d'interaction): score_didascalie = 4.`;

interface CharacterStats {
    samples: string[];
    lineCount: number;
    words: number;
}

function clampScore(value: number): number {
    const bounded = Math.min(4, Math.max(1, value));
    return Math.round(bounded * 10) / 10;
}

function sanitizeScore(value: unknown, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return clampScore(fallback);
    return clampScore(parsed);
}

function normalizeCharacterLabel(value: string): string {
    return (value || "")
        .replace(/[’ʼ]/g, "'")
        .toUpperCase()
        .replace(/[.,:;!?]+$/g, "")
        .replace(/^VOIX\s+DE\s+LA\s+/i, "")
        .replace(/^VOIX\s+DU\s+/i, "")
        .replace(/^VOIX\s+DES\s+/i, "")
        .replace(/^VOIX\s+DE\s+/i, "")
        .replace(/^VOIX\s+(?:[A-ZÀ-ÖØ-Þ]+\s+)*D['’ʼ]\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeText(value: string): string {
    return (value || "").replace(/\s+/g, " ").trim();
}

function buildCharacterList(rawCharacters: string[]): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    for (const raw of rawCharacters || []) {
        const clean = normalizeCharacterLabel(raw || "");
        if (!clean || seen.has(clean)) continue;
        seen.add(clean);
        output.push(clean);
    }
    return output;
}

function createEmptyStats(): CharacterStats {
    return { samples: [], lineCount: 0, words: 0 };
}

function computeCharacterStats(
    characters: string[],
    scriptContextLines: Pick<ScriptLine, "character" | "text" | "type">[] | null
): Map<string, CharacterStats> {
    const statsByCharacter = new Map<string, CharacterStats>();
    for (const character of characters) {
        statsByCharacter.set(character, createEmptyStats());
    }

    if (!Array.isArray(scriptContextLines) || scriptContextLines.length === 0) {
        return statsByCharacter;
    }

    for (const line of scriptContextLines) {
        if (!line || line.type !== "dialogue") continue;

        const normalizedCharacter = normalizeCharacterLabel(line.character || "");
        if (!normalizedCharacter) continue;

        const stats = statsByCharacter.get(normalizedCharacter);
        if (!stats) continue;

        const text = normalizeText(line.text || "");
        if (!text) continue;

        stats.lineCount += 1;
        stats.words += text.split(/\s+/).filter(Boolean).length;

        if (stats.samples.length < MAX_SAMPLES_PER_CHARACTER) {
            stats.samples.push(text.slice(0, MAX_SAMPLE_LENGTH));
        }
    }

    return statsByCharacter;
}

function buildHeuristicProfile(characterName: string, stats: CharacterStats): VoiceMatchingProfile {
    const scores: VoiceMatchingScores = {
        score_genre: 2.5,
        score_age: 3,
        score_tonalite: 2.5,
        score_comedien: 2,
        score_didascalie: 2,
        score_projection: 3,
        score_vitesse: 2,
        score_texture: 2,
        score_temperature: 3,
        score_energie: 2,
    };

    const narrationLike = /\b(DIDASCALIES?|NARRATEUR|NARRATION|VOIX OFF|CHOEUR|CHŒUR)\b/i.test(characterName);

    if (/\b(MADAME|MLLE|MADEMOISELLE|REINE|PRINCESSE|COMTESSE|DUCHESSE|FEMME|FILLE|MERE|MAMAN|SOEUR|TANTE)\b/i.test(characterName)) {
        scores.score_genre = 4;
    }
    if (/\b(MONSIEUR|ROI|PRINCE|COMTE|DUC|HOMME|GARCON|PERE|PAPA|FRERE|ONCLE|SEIGNEUR)\b/i.test(characterName)) {
        scores.score_genre = 1;
    }
    if (/\b(ENFANT|JEUNE|PETIT|PETITE|ADOLESCENT|FILS|FILLE)\b/i.test(characterName)) {
        scores.score_age = 2;
    }
    if (/\b(VIEUX|VIEILLE|SENIOR|GRAND[- ]MERE|GRAND[- ]PERE|ANCIEN)\b/i.test(characterName)) {
        scores.score_age = 4;
    }
    if (narrationLike) {
        scores.score_didascalie = 4;
        scores.score_projection = 2;
        scores.score_vitesse = 2;
    }

    return {
        characterName,
        scores,
        artisticAnalysis: `Heuristique de base.`,
    };
}

import { cleanAndParseJSON } from "@/lib/utils/json-parser";

function parseJsonObject(payload: string): Record<string, unknown> | null {
    try {
        return cleanAndParseJSON<Record<string, unknown>>(payload);
    } catch {
        return null;
    }
}

async function fetchAiProfiles(
    characters: string[],
    statsByCharacter: Map<string, CharacterStats>,
    apiKey: string,
    timeoutMs: number,
    model: string
): Promise<VoiceMatchingProfile[] | null> {
    if (!characters.length) return [];

    const openai = new OpenAI({
        apiKey,
        timeout: timeoutMs,
    });

    const payload = {
        characters,
        context: characters.map((characterName) => {
            const stats = statsByCharacter.get(characterName) || createEmptyStats();
            const avgWords = stats.lineCount > 0 ? Math.round((stats.words / stats.lineCount) * 10) / 10 : 0;
            return {
                characterName,
                lineCount: stats.lineCount,
                avgWords,
                sampleLines: stats.samples,
            };
        }),
    };

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: CASTING_SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(payload) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_completion_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = parseJsonObject(content);
    if (!parsed) return null;

    const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    const profiles: VoiceMatchingProfile[] = [];

    for (const characterName of characters) {
        const item = rawProfiles.find((p: any) => normalizeCharacterLabel(p.characterName || "") === characterName);
        const rawProfile = item as any;
        const fallback = buildHeuristicProfile(characterName, statsByCharacter.get(characterName) || createEmptyStats());
        const rawScores = rawProfile?.scores || {};

        profiles.push({
            characterName,
            scores: {
                score_genre: sanitizeScore(rawScores.score_genre, fallback.scores.score_genre),
                score_age: sanitizeScore(rawScores.score_age, fallback.scores.score_age),
                score_tonalite: sanitizeScore(rawScores.score_tonalite, fallback.scores.score_tonalite),
                score_comedien: sanitizeScore(rawScores.score_comedien, fallback.scores.score_comedien),
                score_didascalie: sanitizeScore(rawScores.score_didascalie, fallback.scores.score_didascalie),
                score_projection: sanitizeScore(rawScores.score_projection, fallback.scores.score_projection),
                score_vitesse: sanitizeScore(rawScores.score_vitesse, fallback.scores.score_vitesse),
                score_texture: sanitizeScore(rawScores.score_texture, fallback.scores.score_texture),
                score_temperature: sanitizeScore(rawScores.score_temperature, fallback.scores.score_temperature),
                score_energie: sanitizeScore(rawScores.score_energie, fallback.scores.score_energie),
            },
            artisticAnalysis: normalizeText(String(rawProfile?.artisticAnalysis || "")) || fallback.artisticAnalysis,
        });
    }

    return profiles;
}

function computeCompatibility(scores: VoiceMatchingScores, voice: VoiceCatalogEntry, weights: VoiceMatchingScores): number {
    const diff_genre = Math.abs(scores.score_genre - voice.score_genre) * weights.score_genre;
    const diff_age = Math.abs(scores.score_age - voice.score_age) * weights.score_age;
    const diff_tonalite = Math.abs(scores.score_tonalite - voice.score_tonalite) * weights.score_tonalite;
    const diff_comedien = Math.abs(scores.score_comedien - voice.score_comedien) * weights.score_comedien;
    const diff_didascalie = Math.abs(scores.score_didascalie - voice.score_didascalie) * weights.score_didascalie;
    const diff_projection = Math.abs(scores.score_projection - voice.score_projection) * weights.score_projection;
    const diff_vitesse = Math.abs(scores.score_vitesse - voice.score_vitesse) * weights.score_vitesse;
    const diff_texture = Math.abs(scores.score_texture - voice.score_texture) * weights.score_texture;
    const diff_temperature = Math.abs(scores.score_temperature - voice.score_temperature) * weights.score_temperature;
    const diff_energie = Math.abs(scores.score_energie - voice.score_energie) * weights.score_energie;

    const totalDiff = diff_genre + diff_age + diff_tonalite + diff_comedien + diff_didascalie +
        diff_projection + diff_vitesse + diff_texture + diff_temperature + diff_energie;

    const totalWeight = weights.score_genre + weights.score_age + weights.score_tonalite + weights.score_comedien +
        weights.score_didascalie + weights.score_projection + weights.score_vitesse + weights.score_texture +
        weights.score_temperature + weights.score_energie;

    // Formule: Score = 100 - ((Somme Ecarts pondérés / (Poids Total * 3)) * 100)
    // 3 = max difference per category (4-1=3)
    const maxPossibleDiff = totalWeight * 3;
    const compatibility = 100 - ((totalDiff / maxPossibleDiff) * 100);
    return Math.max(0, Math.round(compatibility));
}

function selectVoiceForProfile(
    profile: VoiceMatchingProfile,
    catalog: VoiceCatalogEntry[],
    usageByVoice: Map<string, number>,
    isNarrator: boolean,
    isPrincipal: boolean,
    weights: VoiceMatchingScores
): { voiceId: string; compatibility: number } {
    let bestVoiceId = DEFAULT_VOICE_ID;
    let bestCompatibility = -1;
    let bestAdjustedScore = -Infinity;

    for (const voice of catalog) {
        // Gender is now strictly filtered upstream by buildAssignmentsFromProfiles
        const compatibility = computeCompatibility(profile.scores, voice, weights);

        // Target role bonus
        let roleBonus = 0;
        const targetRole = (voice.target_role || "").toLowerCase();
        if (isNarrator && (targetRole.includes("didascalie") || targetRole.includes("note") || targetRole.includes("indication"))) {
            roleBonus = 8;
        } else if (isPrincipal && targetRole.includes("principal")) {
            roleBonus = 8;
        } else if (!isNarrator && !isPrincipal && (targetRole.includes("secondaire") || targetRole.includes("polyvalent"))) {
            roleBonus = 8;
        }

        // Prevent everyone having the exact same voice unnecessarily
        const usagePenalty = (usageByVoice.get(voice.voice_id) || 0) * 5;
        const adjustedScore = compatibility + roleBonus - usagePenalty;

        if (adjustedScore > bestAdjustedScore) {
            bestAdjustedScore = adjustedScore;
            bestCompatibility = compatibility;
            bestVoiceId = voice.voice_id;
        }
    }

    if (bestCompatibility < 0 && catalog.length > 0) {
        // Fallback without strict filters
        bestVoiceId = catalog[0].voice_id;
        bestCompatibility = computeCompatibility(profile.scores, catalog[0], weights);
    }

    return { voiceId: bestVoiceId, compatibility: bestCompatibility };
}

function buildAssignmentsFromProfiles(
    profiles: VoiceMatchingProfile[],
    catalog: VoiceCatalogEntry[],
    source: "ai" | "heuristic",
    statsByCharacter: Map<string, CharacterStats>
): VoiceMatchingAssignment[] {
    const usageByVoice = new Map<string, number>();
    const assignments: VoiceMatchingAssignment[] = [];

    // Determine word thresholds for 'principal' role
    const wordCounts = Array.from(statsByCharacter.values()).map(s => s.words).sort((a, b) => b - a);
    const top30PercentIndex = Math.max(0, Math.floor(wordCounts.length * 0.3) - 1);
    const top30PercentThreshold = wordCounts.length > 0 ? wordCounts[top30PercentIndex] : 500;

    for (const profile of profiles) {
        const stats = statsByCharacter.get(profile.characterName) || createEmptyStats();

        const isNarrator = profile.scores.score_didascalie >= 3.5 ||
            /\b(DIDASCALIES?|NARRATEUR|NARRATION|VOIX OFF|CHOEUR|CHŒUR)\b/i.test(profile.characterName);
        const isPrincipal = !isNarrator && (stats.words >= Math.min(500, top30PercentThreshold));

        const weights: VoiceMatchingScores = {
            score_genre: 0.0, // Genre is now a harsh filter, not a calculated weight
            score_age: 1.5,
            score_tonalite: 1.0,
            score_comedien: isPrincipal ? 2.0 : (isNarrator ? 0.5 : 1.0),
            score_didascalie: isNarrator ? 2.5 : 0.5,
            score_projection: 1.0,
            score_vitesse: 1.0,
            score_texture: 1.0,
            score_temperature: 1.0,
            score_energie: 1.0,
        };

        if (isNarrator) {
            weights.score_age = 1.0;
        }

        // STRICT GENDER FILTERING WITH EXCEPTION FOR BOYS
        let targetGenderScore = profile.scores.score_genre;
        const isYoungBoy = targetGenderScore <= 2.5 && profile.scores.score_age <= 1.5;

        if (isYoungBoy) {
            console.log(`[VoiceMatching] Boy exception triggered for ${profile.characterName}`);
            targetGenderScore = 4; // Force search in female voices
        }

        // We filter the catalog strictly based on gender (<= 2.5 is Male, > 2.5 is Female)
        let filteredCatalog = catalog.filter(voice => {
            const isTargetFemale = targetGenderScore > 2.5;
            const isVoiceFemale = voice.score_genre > 2.5;
            return isTargetFemale === isVoiceFemale;
        });

        // Fallback to full catalog if something is horribly wrong (should not happen with standard catalog)
        if (filteredCatalog.length === 0) {
            filteredCatalog = catalog;
        }

        const { voiceId, compatibility } = selectVoiceForProfile(profile, filteredCatalog, usageByVoice, isNarrator, isPrincipal, weights);
        usageByVoice.set(voiceId, (usageByVoice.get(voiceId) || 0) + 1);

        const sourceLabel = source === "ai" ? "IA" : "Heuris.";
        assignments.push({
            characterName: profile.characterName,
            voiceId: voiceId.startsWith("fr-FR-Chirp3-HD-") ? voiceId : `fr-FR-Chirp3-HD-${voiceId}`,
            justification: `[Match ${compatibility}%] ${profile.artisticAnalysis}`.slice(0, 260),
        });
    }

    return assignments;
}

export async function generateVoiceAssignments(
    params: GenerateVoiceAssignmentsParams
): Promise<GenerateVoiceAssignmentsResult> {
    const characters = buildCharacterList(params.characters || []);
    if (characters.length === 0) {
        return { assignments: [], source: "heuristic" };
    }

    // 1. Fetch voice catalog from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    let catalog: VoiceCatalogEntry[] = [];
    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase.from('voice_catalog').select('*');
        if (data) catalog = data as VoiceCatalogEntry[];
    }

    const statsByCharacter = computeCharacterStats(characters, params.scriptContextLines);
    const heuristicProfiles = characters.map((character) =>
        buildHeuristicProfile(character, statsByCharacter.get(character) || createEmptyStats())
    );

    const shouldUseAi = Boolean(params.preferAi !== false && params.apiKey && characters.length <= MAX_CHARACTERS_FOR_AI);

    if (shouldUseAi) {
        try {
            const aiProfiles = await fetchAiProfiles(
                characters,
                statsByCharacter,
                params.apiKey as string,
                params.timeoutMs || DEFAULT_TIMEOUT_MS,
                params.model || DEFAULT_MODEL
            );

            if (aiProfiles && aiProfiles.length > 0) {
                return {
                    assignments: buildAssignmentsFromProfiles(aiProfiles, catalog, "ai", statsByCharacter),
                    source: "ai",
                };
            }
        } catch (error) {
            console.warn("[Voice Matching Core] AI profiling failed, fallback heuristique:", error);
        }
    }

    return {
        assignments: buildAssignmentsFromProfiles(heuristicProfiles, catalog, "heuristic", statsByCharacter),
        source: "heuristic",
    };
}
