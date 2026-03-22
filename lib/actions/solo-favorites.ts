"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ParsedScript } from "@/lib/types";
import {
    type SaveSoloFavoriteResult,
    type SoloFavoriteDraft,
    type SoloFavoriteLaunchPayload,
    type SoloFavoriteSummary,
    buildSoloFavoriteFingerprint,
    normalizeSoloFavoriteDraft,
    validateSoloFavoriteDraft,
} from "@/lib/solo-favorites";

interface FavoriteRow {
    id: string;
    script_id: string;
    launch_mode: SoloFavoriteDraft["launchMode"];
    character_name: string;
    ignored_characters: string[];
    show_stage_directions: boolean;
    preset: SoloFavoriteDraft["preset"];
    created_at: string;
    updated_at: string;
    last_used_at: string | null;
    scripts?: {
        id?: string;
        title?: string;
        content?: ParsedScript & { author?: string };
        created_at?: string;
        is_public?: boolean;
    } | null;
}

function resolveCharacters(script: ParsedScript | undefined) {
    if (!script) return [];
    if (script.mappings?.canonical_characters?.length) {
        return script.mappings.canonical_characters;
    }
    return script.characters || [];
}

function mapFavoriteRowToSummary(row: FavoriteRow): SoloFavoriteSummary {
    const base = {
        scriptId: row.script_id,
        characterName: row.character_name,
        ignoredCharacters: row.ignored_characters || [],
        showStageDirections: row.show_stage_directions,
    };

    const normalized = row.launch_mode === "reader"
        ? normalizeSoloFavoriteDraft({
            ...base,
            launchMode: "reader",
            preset: row.preset as Extract<SoloFavoriteDraft, { launchMode: "reader" }>["preset"],
        })
        : row.launch_mode === "listen"
            ? normalizeSoloFavoriteDraft({
                ...base,
                launchMode: "listen",
                preset: row.preset as Extract<SoloFavoriteDraft, { launchMode: "listen" }>["preset"],
            })
            : normalizeSoloFavoriteDraft({
                ...base,
                launchMode: "rehearsal",
                preset: row.preset as Extract<SoloFavoriteDraft, { launchMode: "rehearsal" }>["preset"],
            });

    return {
        id: row.id,
        scriptTitle: row.scripts?.title || "Script sans titre",
        author: row.scripts?.content?.author || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUsedAt: row.last_used_at,
        ...normalized,
    };
}

export async function listSoloFavorites(): Promise<SoloFavoriteSummary[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from("solo_session_favorites")
        .select(`
            id,
            script_id,
            launch_mode,
            character_name,
            ignored_characters,
            show_stage_directions,
            preset,
            created_at,
            updated_at,
            last_used_at,
            scripts!inner(
                id,
                title,
                content,
                created_at,
                is_public
            )
        `)
        .eq("user_id", user.id)
        .order("last_used_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[Favorites] Failed to list favorites", error);
        return [];
    }

    return (data || []).map((row) => mapFavoriteRowToSummary(row as FavoriteRow));
}

export async function saveSoloFavorite(draftInput: SoloFavoriteDraft): Promise<SaveSoloFavoriteResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Non authentifié");
    }

    const validation = validateSoloFavoriteDraft(draftInput);
    if (!validation.success) {
        throw new Error(validation.error);
    }

    const draft = validation.draft;

    const { data: script, error: scriptError } = await supabase
        .from("scripts")
        .select("id")
        .eq("id", draft.scriptId)
        .eq("user_id", user.id)
        .single();

    if (scriptError || !script) {
        throw new Error("Ce script solo n'est plus disponible.");
    }

    const fingerprint = buildSoloFavoriteFingerprint(draft);

    const { data: existing, error: existingError } = await supabase
        .from("solo_session_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

    if (existingError) {
        console.error("[Favorites] Failed to check existing favorite", existingError);
        throw new Error("Impossible de vérifier les favoris existants.");
    }

    if (existing?.id) {
        return {
            status: "existing",
            favoriteId: existing.id,
        };
    }

    const now = new Date().toISOString();

    const { data: created, error } = await supabase
        .from("solo_session_favorites")
        .insert({
            user_id: user.id,
            script_id: draft.scriptId,
            launch_mode: draft.launchMode,
            character_name: draft.characterName,
            ignored_characters: draft.ignoredCharacters,
            show_stage_directions: draft.showStageDirections,
            preset: draft.preset,
            fingerprint,
            created_at: now,
            updated_at: now,
        })
        .select("id")
        .single();

    if (error || !created?.id) {
        console.error("[Favorites] Failed to create favorite", error);
        throw new Error("Impossible d'enregistrer ce favori.");
    }

    revalidatePath("/favoris");

    return {
        status: "created",
        favoriteId: created.id,
    };
}

export async function deleteSoloFavorite(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Non authentifié");
    }

    const { error } = await supabase
        .from("solo_session_favorites")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) {
        console.error("[Favorites] Failed to delete favorite", error);
        throw new Error("Impossible de supprimer ce favori.");
    }

    revalidatePath("/favoris");
}

export async function launchSoloFavorite(id: string): Promise<SoloFavoriteLaunchPayload> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Non authentifié");
    }

    const { data, error } = await supabase
        .from("solo_session_favorites")
        .select(`
            id,
            script_id,
            launch_mode,
            character_name,
            ignored_characters,
            show_stage_directions,
            preset,
            created_at,
            updated_at,
            last_used_at,
            scripts!inner(
                id,
                title,
                content,
                created_at,
                is_public
            )
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (error || !data) {
        throw new Error("Ce favori n'existe plus.");
    }

    const row = data as FavoriteRow;

    if (!row.scripts?.id || !row.scripts.content) {
        throw new Error("Le script lié à ce favori n'est plus disponible.");
    }

    const touchedAt = new Date().toISOString();
    const { error: updateError } = await supabase
        .from("solo_session_favorites")
        .update({
            last_used_at: touchedAt,
            updated_at: touchedAt,
        })
        .eq("id", id)
        .eq("user_id", user.id);

    if (updateError) {
        console.error("[Favorites] Failed to touch favorite", updateError);
    }

    revalidatePath("/favoris");

    const favorite = mapFavoriteRowToSummary({
        ...row,
        last_used_at: touchedAt,
        updated_at: touchedAt,
    });

    const scriptContent = row.scripts.content as ParsedScript;

    return {
        favorite,
        script: {
            id: row.scripts.id,
            title: row.scripts.title || "Script sans titre",
            created_at: row.scripts.created_at,
            is_public: row.scripts.is_public,
            ...scriptContent,
            characters: resolveCharacters(scriptContent),
        },
    };
}
