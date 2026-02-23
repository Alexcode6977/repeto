import OpenAI from "openai";
import { GOOGLE_VOICES } from "@/lib/data/google-voices";
import type { ScriptLine } from "@/lib/types";

export interface VoiceMatchingScores {
    genderScore: number;
    ageScore: number;
    pitchScore: number;
    reliabilityScore: number;
    registerScore: number;
    projectionScore: number;
    speedScore: number;
    textureScore: number;
    temperatureScore: number;
    energyScore: number;
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

const DEFAULT_VOICE_ID = "fr-FR-Chirp3-HD-Aoede";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 12000;
const MAX_CHARACTERS_FOR_AI = 80;
const MAX_SAMPLES_PER_CHARACTER = 3;
const MAX_SAMPLE_LENGTH = 180;

const CASTING_SYSTEM_PROMPT = `Tu es un directeur de casting vocal pour des pieces de theatre francophones.
Tu renvoies UNIQUEMENT un objet JSON valide avec ce schema exact:
{
  "profiles": [
    {
      "characterName": "NOM",
      "scores": {
        "genderScore": 1-4,
        "ageScore": 1-4,
        "pitchScore": 1-4,
        "reliabilityScore": 1-4,
        "registerScore": 1-4,
        "projectionScore": 1-4,
        "speedScore": 1-4,
        "textureScore": 1-4,
        "temperatureScore": 1-4,
        "energyScore": 1-4
      },
      "artisticAnalysis": "max 18 mots"
    }
  ]
}
Contraintes:
- Un profil pour chaque personnage demande, sans ajout.
- Toutes les notes sont numeriques (1 a 4).
- reliabilityScore = 4 pour narrateur, didascalies ou voix off.
- Si information insuffisante, rester neutre autour de 3.`;

interface CharacterStats {
    samples: string[];
    lineCount: number;
    words: number;
    exclamations: number;
    questions: number;
    ellipsis: number;
    formalMarkers: number;
    informalMarkers: number;
    warmMarkers: number;
    coldMarkers: number;
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
    return {
        samples: [],
        lineCount: 0,
        words: 0,
        exclamations: 0,
        questions: 0,
        ellipsis: 0,
        formalMarkers: 0,
        informalMarkers: 0,
        warmMarkers: 0,
        coldMarkers: 0,
    };
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
        if (text.includes("!")) stats.exclamations += 1;
        if (text.includes("?")) stats.questions += 1;
        if (text.includes("...")) stats.ellipsis += 1;
        if (/\b(vous|monsieur|madame|s['’]il vous plait|je vous prie)\b/i.test(text)) stats.formalMarkers += 1;
        if (/\b(tu|toi|hein|mec|putain|merde|t['’]es)\b/i.test(text)) stats.informalMarkers += 1;
        if (/\b(merci|cher|chere|aime|pardon|douceur|ami)\b/i.test(text)) stats.warmMarkers += 1;
        if (/\b(haine|ordre|silence|jamais|mort|deteste|froid)\b/i.test(text)) stats.coldMarkers += 1;

        if (stats.samples.length < MAX_SAMPLES_PER_CHARACTER) {
            stats.samples.push(text.slice(0, MAX_SAMPLE_LENGTH));
        }
    }

    return statsByCharacter;
}

function buildHeuristicProfile(characterName: string, stats: CharacterStats): VoiceMatchingProfile {
    const scores: VoiceMatchingScores = {
        genderScore: 3,
        ageScore: 3,
        pitchScore: 3,
        reliabilityScore: 3,
        registerScore: 3,
        projectionScore: 3,
        speedScore: 3,
        textureScore: 2,
        temperatureScore: 3,
        energyScore: 3,
    };

    const name = characterName;
    const narrationLike = /\b(DIDASCALIES?|NARRATEUR|NARRATION|VOIX OFF|CHOEUR|CHŒUR)\b/.test(name);

    if (/\b(MADAME|MLLE|MADEMOISELLE|REINE|PRINCESSE|COMTESSE|DUCHESSE|FEMME|FILLE|MERE|MAMAN|SOEUR|TANTE)\b/.test(name)) {
        scores.genderScore = 4;
    }
    if (/\b(MONSIEUR|ROI|PRINCE|COMTE|DUC|HOMME|GARCON|PERE|PAPA|FRERE|ONCLE|SEIGNEUR)\b/.test(name)) {
        scores.genderScore = 2;
    }

    if (/\b(ENFANT|JEUNE|PETIT|PETITE|ADOLESCENT|FILS|FILLE)\b/.test(name)) {
        scores.ageScore = 2;
    }
    if (/\b(VIEUX|VIEILLE|SENIOR|MERE|PERE|GRAND[- ]MERE|GRAND[- ]PERE|ANCIEN)\b/.test(name)) {
        scores.ageScore = 4;
    }

    if (narrationLike) {
        scores.reliabilityScore = 4;
        scores.projectionScore = 2;
        scores.speedScore = 2;
        scores.registerScore = 3;
    }

    if (stats.lineCount > 0) {
        const avgWords = stats.words / Math.max(1, stats.lineCount);
        const exclamationRate = stats.exclamations / Math.max(1, stats.lineCount);
        const questionRate = stats.questions / Math.max(1, stats.lineCount);
        const ellipsisRate = stats.ellipsis / Math.max(1, stats.lineCount);

        if (avgWords >= 18) {
            scores.reliabilityScore += 0.7;
            scores.registerScore += 0.7;
            scores.speedScore -= 0.4;
        } else if (avgWords <= 7) {
            scores.speedScore += 0.5;
            scores.energyScore += 0.3;
        }

        if (exclamationRate >= 0.25) {
            scores.projectionScore += 0.9;
            scores.energyScore += 0.8;
            scores.speedScore += 0.4;
        }

        if (questionRate >= 0.30) {
            scores.energyScore += 0.4;
        }

        if (ellipsisRate >= 0.2) {
            scores.speedScore -= 0.8;
            scores.textureScore += 0.4;
        }

        if (stats.formalMarkers >= 2 && stats.formalMarkers > stats.informalMarkers) {
            scores.registerScore += 0.8;
            scores.temperatureScore -= 0.2;
        }

        if (stats.informalMarkers >= 2 && stats.informalMarkers > stats.formalMarkers) {
            scores.registerScore -= 0.8;
            scores.energyScore += 0.4;
            scores.textureScore += 0.2;
        }

        if (stats.warmMarkers >= 2 && stats.warmMarkers >= stats.coldMarkers) {
            scores.temperatureScore += 0.7;
        }

        if (stats.coldMarkers >= 2 && stats.coldMarkers > stats.warmMarkers) {
            scores.temperatureScore -= 0.7;
            scores.textureScore += 0.4;
        }
    }

    if (scores.genderScore <= 2.2) scores.pitchScore -= 0.6;
    if (scores.genderScore >= 3.8) scores.pitchScore += 0.3;
    if (scores.ageScore >= 3.8) scores.pitchScore -= 0.2;
    if (scores.ageScore <= 2.2) scores.pitchScore += 0.2;

    const normalizedScores: VoiceMatchingScores = {
        genderScore: clampScore(scores.genderScore),
        ageScore: clampScore(scores.ageScore),
        pitchScore: clampScore(scores.pitchScore),
        reliabilityScore: clampScore(scores.reliabilityScore),
        registerScore: clampScore(scores.registerScore),
        projectionScore: clampScore(scores.projectionScore),
        speedScore: clampScore(scores.speedScore),
        textureScore: clampScore(scores.textureScore),
        temperatureScore: clampScore(scores.temperatureScore),
        energyScore: clampScore(scores.energyScore),
    };

    const traits: string[] = [];
    if (normalizedScores.projectionScore >= 3.6 || normalizedScores.energyScore >= 3.6) traits.push("intense");
    if (normalizedScores.registerScore >= 3.6) traits.push("registre soutenu");
    if (normalizedScores.temperatureScore <= 2.0) traits.push("distance emotionnelle");
    if (normalizedScores.temperatureScore >= 3.6) traits.push("ton chaleureux");
    if (narrationLike) traits.push("narration stable");
    if (traits.length === 0) traits.push("profil equilibre");

    return {
        characterName,
        scores: normalizedScores,
        artisticAnalysis: `Heuristique: ${traits.slice(0, 2).join(", ")}.`,
    };
}

function parseJsonObject(payload: string): Record<string, unknown> | null {
    const cleaned = (payload || "").trim();
    if (!cleaned) return null;

    try {
        return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
            } catch {
                return null;
            }
        }
        return null;
    }
}

function buildAiPayload(
    characters: string[],
    statsByCharacter: Map<string, CharacterStats>
): string {
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

    return JSON.stringify(payload);
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

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: CASTING_SYSTEM_PROMPT },
            { role: "user", content: buildAiPayload(characters, statsByCharacter) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_completion_tokens: 1100,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = parseJsonObject(content);
    if (!parsed) return null;

    const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    const rawByCharacter = new Map<string, Record<string, unknown>>();

    for (const item of rawProfiles) {
        if (!item || typeof item !== "object") continue;
        const candidate = item as Record<string, unknown>;
        const normalizedName = normalizeCharacterLabel(String(candidate.characterName || ""));
        if (!normalizedName || rawByCharacter.has(normalizedName)) continue;
        rawByCharacter.set(normalizedName, candidate);
    }

    const profiles: VoiceMatchingProfile[] = [];
    for (const characterName of characters) {
        const rawProfile = rawByCharacter.get(characterName);
        const fallback = buildHeuristicProfile(characterName, statsByCharacter.get(characterName) || createEmptyStats());
        const rawScores = rawProfile && typeof rawProfile.scores === "object" && rawProfile.scores
            ? rawProfile.scores as Record<string, unknown>
            : {};

        profiles.push({
            characterName,
            scores: {
                genderScore: sanitizeScore(rawScores.genderScore, fallback.scores.genderScore),
                ageScore: sanitizeScore(rawScores.ageScore, fallback.scores.ageScore),
                pitchScore: sanitizeScore(rawScores.pitchScore, fallback.scores.pitchScore),
                reliabilityScore: sanitizeScore(rawScores.reliabilityScore, fallback.scores.reliabilityScore),
                registerScore: sanitizeScore(rawScores.registerScore, fallback.scores.registerScore),
                projectionScore: sanitizeScore(rawScores.projectionScore, fallback.scores.projectionScore),
                speedScore: sanitizeScore(rawScores.speedScore, fallback.scores.speedScore),
                textureScore: sanitizeScore(rawScores.textureScore, fallback.scores.textureScore),
                temperatureScore: sanitizeScore(rawScores.temperatureScore, fallback.scores.temperatureScore),
                energyScore: sanitizeScore(rawScores.energyScore, fallback.scores.energyScore),
            },
            artisticAnalysis: normalizeText(String(rawProfile?.artisticAnalysis || "")) || fallback.artisticAnalysis,
        });
    }

    return profiles;
}

function computeCompatibility(scores: VoiceMatchingScores, voice: typeof GOOGLE_VOICES[number]): number {
    const weightedDelta =
        Math.abs(scores.genderScore - voice.genderScore) * 1.3 +
        Math.abs(scores.ageScore - (voice.ageScore || 3)) * 1.2 +
        Math.abs(scores.pitchScore - (voice.pitchScore || 3)) * 1.0 +
        Math.abs(scores.reliabilityScore - (voice.narrativeReliabilityScore || 3)) * 1.0 +
        Math.abs(scores.registerScore - (voice.registerScore || 3)) * 0.9 +
        Math.abs(scores.projectionScore - (voice.projectionScore || 3)) * 0.9 +
        Math.abs(scores.speedScore - (voice.speedScore || 3)) * 0.7 +
        Math.abs(scores.textureScore - (voice.textureScore || 3)) * 0.6 +
        Math.abs(scores.temperatureScore - (voice.temperatureScore || 3)) * 0.7 +
        Math.abs(scores.energyScore - (voice.energyScore || 3)) * 0.5;

    const maxWeightedDelta =
        3 * 1.3 +
        3 * 1.2 +
        3 * 1.0 +
        3 * 1.0 +
        3 * 0.9 +
        3 * 0.9 +
        3 * 0.7 +
        3 * 0.6 +
        3 * 0.7 +
        3 * 0.5;

    return Math.max(0, Math.round(100 - ((weightedDelta / maxWeightedDelta) * 100)));
}

function selectVoiceForProfile(
    profile: VoiceMatchingProfile,
    usageByVoice: Map<string, number>
): { voiceId: string; compatibility: number } {
    let bestVoiceId = DEFAULT_VOICE_ID;
    let bestCompatibility = -1;
    let bestAdjustedScore = -Infinity;

    for (const voice of GOOGLE_VOICES) {
        if (Math.abs(profile.scores.genderScore - voice.genderScore) > 2.2) continue;
        if (Math.abs(profile.scores.ageScore - voice.ageScore) > 2.4) continue;

        const compatibility = computeCompatibility(profile.scores, voice);
        const usagePenalty = (usageByVoice.get(voice.id) || 0) * 6;
        const adjustedScore = compatibility - usagePenalty;

        if (adjustedScore > bestAdjustedScore) {
            bestAdjustedScore = adjustedScore;
            bestCompatibility = compatibility;
            bestVoiceId = voice.id;
        }
    }

    if (bestCompatibility < 0) {
        const fallbackVoice = GOOGLE_VOICES.find((voice) => voice.id === DEFAULT_VOICE_ID);
        bestCompatibility = fallbackVoice ? computeCompatibility(profile.scores, fallbackVoice) : 0;
        bestVoiceId = fallbackVoice?.id || DEFAULT_VOICE_ID;
    }

    return { voiceId: bestVoiceId, compatibility: bestCompatibility };
}

function buildAssignmentsFromProfiles(
    profiles: VoiceMatchingProfile[],
    source: "ai" | "heuristic"
): VoiceMatchingAssignment[] {
    const usageByVoice = new Map<string, number>();
    const assignments: VoiceMatchingAssignment[] = [];

    for (const profile of profiles) {
        const { voiceId, compatibility } = selectVoiceForProfile(profile, usageByVoice);
        usageByVoice.set(voiceId, (usageByVoice.get(voiceId) || 0) + 1);

        const sourceLabel = source === "ai" ? "Profil IA" : "Profil heuristique";
        assignments.push({
            characterName: profile.characterName,
            voiceId,
            justification: `${sourceLabel} • match ${compatibility}% • ${profile.artisticAnalysis}`.slice(0, 260),
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
                    assignments: buildAssignmentsFromProfiles(aiProfiles, "ai"),
                    source: "ai",
                };
            }
        } catch (error) {
            console.warn("[Voice Matching Core] AI profiling failed, fallback heuristique:", error);
        }
    }

    return {
        assignments: buildAssignmentsFromProfiles(heuristicProfiles, "heuristic"),
        source: "heuristic",
    };
}
