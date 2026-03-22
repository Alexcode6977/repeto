import { ParsedScript } from "@/lib/types";

export type SoloFavoriteLaunchMode = "reader" | "listen" | "rehearsal";
export type SoloFavoriteVisibility = "visible" | "hint" | "hidden";
export type SoloFavoriteTextMode = "full" | "cue" | "check";
export type SoloFavoritePlaybackSpeed = "normal" | "fast" | "veryfast";
export type SoloFavoriteToleranceLevel = "strict" | "moderate" | "permissive";

export interface SoloFavoriteBaseDraft {
    scriptId: string;
    characterName: string;
    ignoredCharacters: string[];
    showStageDirections: boolean;
}

export interface SoloReaderFavoriteDraft extends SoloFavoriteBaseDraft {
    launchMode: "reader";
    preset: {
        visibility: SoloFavoriteVisibility;
        mode: SoloFavoriteTextMode;
    };
}

export interface SoloListenFavoriteDraft extends SoloFavoriteBaseDraft {
    launchMode: "listen";
    preset: {
        listenMode: SoloFavoriteTextMode;
        startLineIndex: number;
        announceCharacter: boolean;
        playbackSpeed: SoloFavoritePlaybackSpeed;
    };
}

export interface SoloRehearsalFavoriteDraft extends SoloFavoriteBaseDraft {
    launchMode: "rehearsal";
    preset: {
        visibility: SoloFavoriteVisibility;
        mode: SoloFavoriteTextMode;
        startLineIndex: number;
        toleranceLevel: SoloFavoriteToleranceLevel;
        playbackSpeed: SoloFavoritePlaybackSpeed;
    };
}

export type SoloFavoriteDraft =
    | SoloReaderFavoriteDraft
    | SoloListenFavoriteDraft
    | SoloRehearsalFavoriteDraft;

export type SoloFavoriteSummary = SoloFavoriteDraft & {
    id: string;
    scriptTitle: string;
    author?: string | null;
    createdAt: string;
    updatedAt: string;
    lastUsedAt?: string | null;
};

export interface SoloFavoriteLaunchPayload {
    favorite: SoloFavoriteSummary;
    script: ParsedScript & {
        id: string;
        title: string;
        created_at?: string;
        is_public?: boolean;
    };
}

export interface SaveSoloFavoriteResult {
    status: "created" | "existing";
    favoriteId: string;
}

const VISIBILITY_OPTIONS = new Set<SoloFavoriteVisibility>(["visible", "hint", "hidden"]);
const TEXT_MODE_OPTIONS = new Set<SoloFavoriteTextMode>(["full", "cue", "check"]);
const PLAYBACK_SPEED_OPTIONS = new Set<SoloFavoritePlaybackSpeed>(["normal", "fast", "veryfast"]);
const TOLERANCE_OPTIONS = new Set<SoloFavoriteToleranceLevel>(["strict", "moderate", "permissive"]);
const LAUNCH_MODE_OPTIONS = new Set<SoloFavoriteLaunchMode>(["reader", "listen", "rehearsal"]);

function normalizeString(value: string) {
    return value.trim();
}

function normalizeIgnoredCharacters(value: string[]) {
    return Array.from(
        new Set(
            value
                .map((entry) => normalizeString(entry))
                .filter(Boolean)
        )
    ).sort((left, right) => left.localeCompare(right, "fr"));
}

function normalizeStartLineIndex(value: number) {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
}

export function normalizeSoloFavoriteDraft(draft: SoloFavoriteDraft): SoloFavoriteDraft {
    const base = {
        scriptId: normalizeString(draft.scriptId),
        characterName: normalizeString(draft.characterName),
        ignoredCharacters: normalizeIgnoredCharacters(draft.ignoredCharacters),
        showStageDirections: Boolean(draft.showStageDirections),
    };

    if (draft.launchMode === "reader") {
        return {
            ...base,
            launchMode: "reader",
            preset: {
                visibility: draft.preset.visibility,
                mode: draft.preset.mode,
            },
        };
    }

    if (draft.launchMode === "listen") {
        return {
            ...base,
            launchMode: "listen",
            preset: {
                listenMode: draft.preset.listenMode,
                startLineIndex: normalizeStartLineIndex(draft.preset.startLineIndex),
                announceCharacter: Boolean(draft.preset.announceCharacter),
                playbackSpeed: draft.preset.playbackSpeed,
            },
        };
    }

    return {
        ...base,
        launchMode: "rehearsal",
        preset: {
            visibility: draft.preset.visibility,
            mode: draft.preset.mode,
            startLineIndex: normalizeStartLineIndex(draft.preset.startLineIndex),
            toleranceLevel: draft.preset.toleranceLevel,
            playbackSpeed: draft.preset.playbackSpeed,
        },
    };
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
    }

    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entry]) => `"${key}":${stableStringify(entry)}`);
        return `{${entries.join(",")}}`;
    }

    return JSON.stringify(value);
}

export function buildSoloFavoriteFingerprint(draft: SoloFavoriteDraft) {
    return stableStringify(normalizeSoloFavoriteDraft(draft));
}

export function validateSoloFavoriteDraft(input: unknown): { success: true; draft: SoloFavoriteDraft } | { success: false; error: string } {
    if (!input || typeof input !== "object") {
        return { success: false, error: "Favori invalide." };
    }

    const candidate = input as Partial<SoloFavoriteDraft>;

    if (!candidate.scriptId || typeof candidate.scriptId !== "string") {
        return { success: false, error: "Script manquant." };
    }

    if (!candidate.characterName || typeof candidate.characterName !== "string") {
        return { success: false, error: "Personnage manquant." };
    }

    if (!Array.isArray(candidate.ignoredCharacters) || candidate.ignoredCharacters.some((entry) => typeof entry !== "string")) {
        return { success: false, error: "Liste de personnages ignorés invalide." };
    }

    if (typeof candidate.showStageDirections !== "boolean") {
        return { success: false, error: "Option didascalies invalide." };
    }

    if (!candidate.launchMode || !LAUNCH_MODE_OPTIONS.has(candidate.launchMode)) {
        return { success: false, error: "Mode de lancement invalide." };
    }

    if (!candidate.preset || typeof candidate.preset !== "object") {
        return { success: false, error: "Configuration du favori invalide." };
    }

    if (candidate.launchMode === "reader") {
        const preset = candidate.preset as SoloReaderFavoriteDraft["preset"];
        if (!VISIBILITY_OPTIONS.has(preset.visibility) || !TEXT_MODE_OPTIONS.has(preset.mode)) {
            return { success: false, error: "Configuration de lecture invalide." };
        }

        return {
            success: true,
            draft: normalizeSoloFavoriteDraft({
                scriptId: candidate.scriptId,
                characterName: candidate.characterName,
                ignoredCharacters: candidate.ignoredCharacters,
                showStageDirections: candidate.showStageDirections,
                launchMode: "reader",
                preset,
            }),
        };
    }

    if (candidate.launchMode === "listen") {
        const preset = candidate.preset as SoloListenFavoriteDraft["preset"];
        if (
            !TEXT_MODE_OPTIONS.has(preset.listenMode)
            || !PLAYBACK_SPEED_OPTIONS.has(preset.playbackSpeed)
            || typeof preset.announceCharacter !== "boolean"
            || typeof preset.startLineIndex !== "number"
        ) {
            return { success: false, error: "Configuration d'écoute invalide." };
        }

        return {
            success: true,
            draft: normalizeSoloFavoriteDraft({
                scriptId: candidate.scriptId,
                characterName: candidate.characterName,
                ignoredCharacters: candidate.ignoredCharacters,
                showStageDirections: candidate.showStageDirections,
                launchMode: "listen",
                preset,
            }),
        };
    }

    const preset = candidate.preset as SoloRehearsalFavoriteDraft["preset"];
    if (
        !VISIBILITY_OPTIONS.has(preset.visibility)
        || !TEXT_MODE_OPTIONS.has(preset.mode)
        || !PLAYBACK_SPEED_OPTIONS.has(preset.playbackSpeed)
        || !TOLERANCE_OPTIONS.has(preset.toleranceLevel)
        || typeof preset.startLineIndex !== "number"
    ) {
        return { success: false, error: "Configuration de répétition invalide." };
    }

    return {
        success: true,
        draft: normalizeSoloFavoriteDraft({
            scriptId: candidate.scriptId,
            characterName: candidate.characterName,
            ignoredCharacters: candidate.ignoredCharacters,
            showStageDirections: candidate.showStageDirections,
            launchMode: "rehearsal",
            preset,
        }),
    };
}

export function getSoloFavoriteModeLabel(mode: SoloFavoriteLaunchMode) {
    if (mode === "reader") return "Lire";
    if (mode === "listen") return "Écouter";
    return "Répéter";
}

export function getSoloFavoriteActionLabel(mode: SoloFavoriteLaunchMode) {
    if (mode === "reader") return "Ouvrir";
    if (mode === "listen") return "Lancer";
    return "Lancer";
}

export function getSoloFavoriteChips(favorite: Pick<SoloFavoriteDraft, "launchMode" | "showStageDirections" | "preset">): string[] {
    if (favorite.launchMode === "reader") {
        const preset = favorite.preset as SoloReaderFavoriteDraft["preset"];
        return [
            preset.visibility === "visible" ? "Visible" : preset.visibility === "hint" ? "Indices" : "Caché",
            preset.mode === "full" ? "Intégral" : preset.mode === "cue" ? "Réplique" : "Solo",
            favorite.showStageDirections ? "Didascalies affichées" : "Didascalies masquées",
        ];
    }

    if (favorite.launchMode === "listen") {
        const preset = favorite.preset as SoloListenFavoriteDraft["preset"];
        return [
            preset.listenMode === "full" ? "Intégral" : preset.listenMode === "cue" ? "Réplique" : "Solo",
            preset.announceCharacter ? "Noms annoncés" : "Noms masqués",
            preset.playbackSpeed === "normal" ? "Vitesse normale" : preset.playbackSpeed === "fast" ? "Vitesse accélérée" : "Très rapide",
        ];
    }

    const preset = favorite.preset as SoloRehearsalFavoriteDraft["preset"];
    return [
        preset.visibility === "visible" ? "Visible" : preset.visibility === "hint" ? "Indices" : "Caché",
        preset.mode === "full" ? "Intégrale" : preset.mode === "cue" ? "Réplique" : "Solo",
        preset.toleranceLevel === "strict" ? "Tolérance stricte" : preset.toleranceLevel === "moderate" ? "Tolérance modérée" : "Tolérance permissive",
        preset.playbackSpeed === "normal" ? "Vitesse normale" : preset.playbackSpeed === "fast" ? "Vitesse accélérée" : "Très rapide",
    ];
}

export function getListenQuickStartStorageKey(scriptId: string) {
    return `souffleur_listen_settings_${scriptId}`;
}

export function getRehearsalQuickStartStorageKey(scriptId: string) {
    return `souffleur_rehearsal_settings_${scriptId}`;
}

export function getQuickStartStorageValueFromFavorite(draft: SoloFavoriteDraft) {
    if (draft.launchMode === "listen") {
        return {
            storageKey: getListenQuickStartStorageKey(draft.scriptId),
            payload: {
                listenMode: draft.preset.listenMode,
                announceCharacter: draft.preset.announceCharacter,
                startLineIndex: draft.preset.startLineIndex,
                playbackSpeed: draft.preset.playbackSpeed,
                timestamp: Date.now(),
            },
        };
    }

    if (draft.launchMode === "rehearsal") {
        return {
            storageKey: getRehearsalQuickStartStorageKey(draft.scriptId),
            payload: {
                rehearsalMode: draft.preset.mode,
                lineVisibility: draft.preset.visibility,
                startLineIndex: draft.preset.startLineIndex,
                toleranceLevel: draft.preset.toleranceLevel,
                playbackSpeed: draft.preset.playbackSpeed,
                timestamp: Date.now(),
            },
        };
    }

    return null;
}
