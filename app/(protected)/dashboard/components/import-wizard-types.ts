import { ParsedScript } from "@/lib/types";

export type ValidationDecision = "accept" | "reject";
export type ValidationStep = 1 | 2 | 3 | 4;
export type ClassicImportStage = "read" | "detect" | "parse_pass_1" | "parse_pass_2" | "parse_pass_3" | "diagnostics";

export interface CollectiveResolutionState {
    label: string;
    scope: "global" | "scene";
    sceneIndex?: number;
    members: string[];
}

export const CLASSIC_IMPORT_STAGE_ORDER: ClassicImportStage[] = [
    "read",
    "detect",
    "parse_pass_1",
    "parse_pass_2",
    "parse_pass_3",
    "diagnostics",
];

export const CLASSIC_IMPORT_STAGE_LABELS: Record<ClassicImportStage, string> = {
    read: "Lecture du fichier",
    detect: "Détection des personnages",
    parse_pass_1: "Parsing passe 1",
    parse_pass_2: "Parsing passe 2",
    parse_pass_3: "Parsing passe 3",
    diagnostics: "Vérification finale",
};

export const THIRD_MULTI_TARGET = "__MULTI_PERSONNAGE__";

/** Normalise un label pour l'affichage — conserve "VOIX DE LUCIEN" tel quel. */
export function normalizeImportLabel(value: string): string {
    return (value || "")
        .replace(/['\u2019\u02bc]/g, "'")
        .toUpperCase()
        .replace(/[.,:;]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/** Résout le label canonique en strippant les préfixes "VOIX DE" — pour le matching uniquement. */
export function resolveCanonicalImportLabel(value: string): string {
    return normalizeImportLabel(value)
        .replace(/^VOIX\s+DE\s+LA\s+/i, "")
        .replace(/^VOIX\s+DU\s+/i, "")
        .replace(/^VOIX\s+DES\s+/i, "")
        .replace(/^VOIX\s+DE\s+/i, "")
        .replace(/^VOIX\s+(?:[A-Z\u00c0-\u00d6\u00d8-\u00de]+\s+)*D['\u2018\u2019\u02bc]\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function foldForComparison(value: string): string {
    return resolveCanonicalImportLabel(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9]/g, "");
}

export function isCollectiveLabel(label: string): boolean {
    const normalized = normalizeImportLabel(label);
    if (!normalized) return false;
    if (/^(LES MEMES|LES M\u00caMES|TOUS|TOUTES|ENSEMBLE)$/.test(normalized)) return true;
    if (/^(TOUS|TOUTES)\s+LES\s+(DEUX|TROIS|QUATRE|CINQ|[2-9])$/.test(normalized)) return true;
    if (/^(TOUS|TOUTES)\s+(DEUX|TROIS|QUATRE|CINQ|[2-9])$/.test(normalized)) return true;
    if (/\bET\b|,|\/|&/.test(normalized)) return true;
    return false;
}

export function isSceneScopedCollectiveLabel(label: string): boolean {
    const normalized = normalizeImportLabel(label);
    return /^(LES MEMES|LES M\u00caMES|TOUS|TOUTES|ENSEMBLE)$/.test(normalized)
        || /^(TOUS|TOUTES)\s+LES\s+(DEUX|TROIS|QUATRE|CINQ|[2-9])$/.test(normalized)
        || /^(TOUS|TOUTES)\s+(DEUX|TROIS|QUATRE|CINQ|[2-9])$/.test(normalized);
}

export function splitCollectiveTokens(label: string): string[] {
    return normalizeImportLabel(label)
        .split(/\bET\b|,|\/|&/g)
        .map((value) => normalizeImportLabel(value))
        .filter(Boolean);
}

export function isExplicitNamedCollectiveLabel(label: string, canonicalCharacters: string[]): boolean {
    const tokens = splitCollectiveTokens(label);
    if (tokens.length < 2) return false;
    const canonicalSet = new Set(canonicalCharacters.map((value) => normalizeImportLabel(value)));
    return tokens.every((token) => canonicalSet.has(token));
}

export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[a.length][b.length];
}

export function findBestAliasTarget(
    source: string,
    candidates: string[],
    counts: Map<string, number>
): string | null {
    const foldedSource = foldForComparison(source);
    if (!foldedSource) return null;

    let best: { candidate: string; score: number } | null = null;
    for (const candidate of candidates) {
        if (candidate === source) continue;

        const foldedCandidate = foldForComparison(candidate);
        if (!foldedCandidate) continue;

        const distance = levenshteinDistance(foldedSource, foldedCandidate);
        const maxLen = Math.max(foldedSource.length, foldedCandidate.length);
        const ratio = maxLen > 0 ? distance / maxLen : 1;

        if (distance > 2 || ratio > 0.34) continue;

        const frequencyBonus = Math.min(10, counts.get(candidate) || 0) / 20;
        const score = (1 - ratio) + frequencyBonus;
        if (!best || score > best.score) {
            best = { candidate, score };
        }
    }

    return best?.candidate || null;
}

export function formatSceneLineForReview(line: ParsedScript["lines"][number]): string {
    if (line.type === "dialogue") {
        return `[${normalizeImportLabel(line.character)}] ${line.text}`.trim();
    }
    return line.text;
}

export function getSceneOrderForLine(sceneStarts: number[], lineIndex: number): number {
    for (let i = sceneStarts.length - 1; i >= 0; i -= 1) {
        if (lineIndex >= sceneStarts[i]) return i;
    }
    return 0;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
