import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { getEffectiveTier } from "@/lib/subscription";
import type { ParsedScript, ScriptMetadata } from "@/lib/types";

type DashboardServiceClient = Awaited<ReturnType<typeof createClient>>;

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
        if (normalized) {
            unique.add(normalized);
        }
    }
    return Array.from(unique).sort((left, right) => left.localeCompare(right, "fr"));
}

function resolveCanonicalCharactersFromScript(script: Partial<ParsedScript> | null | undefined): string[] {
    const fromMappings = script?.mappings?.canonical_characters;
    if (Array.isArray(fromMappings) && fromMappings.length > 0) {
        return buildCanonicalCharacters(fromMappings);
    }
    return buildCanonicalCharacters(script?.characters || []);
}

function resolveLegacyVocalizationState(
    createdAt: string,
    vocalizationStatus: ScriptMetadata["vocalization_status"],
    vocalizationProgress: number | null
) {
    const isLegacy = new Date(createdAt) < new Date("2026-02-24T00:00:00Z");
    let finalStatus = vocalizationStatus;

    if (isLegacy && vocalizationStatus === "pending" && vocalizationProgress === 0) {
        finalStatus = "completed";
    }

    return {
        isLegacy,
        vocalizationStatus: finalStatus,
        vocalizationProgress: isLegacy ? 100 : vocalizationProgress,
    };
}

export async function getDashboardUserTier(userId: string): Promise<"free" | "solo_pro" | "troupe" | "troupe_xl"> {
    return await getEffectiveTier(userId);
}

export async function renameOwnedScript(
    supabase: DashboardServiceClient,
    userId: string,
    scriptId: string,
    newTitle: string
) {
    const { data: existingScript } = await supabase
        .from("scripts")
        .select("user_id")
        .eq("id", scriptId)
        .single();

    if (!existingScript || existingScript.user_id !== userId) {
        throw new Error("Unauthorized: You can only rename your own scripts");
    }

    const { error } = await supabase
        .from("scripts")
        .update({ title: newTitle })
        .eq("id", scriptId);

    if (error) {
        console.error("Error renaming script:", error);
        throw new Error("Failed to rename script");
    }
}

export async function listOwnedScripts(
    supabase: DashboardServiceClient,
    userId: string
): Promise<ScriptMetadata[]> {
    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at, user_id, is_public, vocalization_status, vocalization_progress")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching scripts:", error);
        return [];
    }

    return data.map((row) => {
        const content = row.content as ParsedScript | undefined;
        const vocalizationState = resolveLegacyVocalizationState(
            row.created_at,
            row.vocalization_status,
            row.vocalization_progress
        );

        return {
            id: row.id,
            title: row.title,
            created_at: row.created_at,
            characterCount: resolveCanonicalCharactersFromScript(content).length,
            lineCount: content?.lines?.length || 0,
            is_public: row.is_public || false,
            is_owner: true,
            vocalization_status: vocalizationState.vocalizationStatus,
            vocalization_progress: vocalizationState.vocalizationProgress ?? undefined,
        };
    });
}

export async function toggleScriptPublicStatus(
    supabase: DashboardServiceClient,
    userEmail: string | null | undefined,
    scriptId: string,
    currentStatus: boolean
) {
    if (!isPlatformAdminEmail(userEmail)) {
        throw new Error("Unauthorized: Only Admin can manage library.");
    }

    const { error } = await supabase
        .from("scripts")
        .update({ is_public: !currentStatus })
        .eq("id", scriptId);

    if (error) {
        throw new Error("Failed to update public status");
    }
}

export async function getAccessibleScriptById(
    supabase: DashboardServiceClient,
    userId: string,
    scriptId: string
) {
    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at, user_id, is_public")
        .eq("id", scriptId)
        .single();

    if (error || !data) {
        return null;
    }

    if (data.user_id !== userId && !data.is_public) {
        throw new Error("Unauthorized access to this script.");
    }

    const content = data.content as ParsedScript;

    return {
        id: data.id,
        title: data.title,
        ...content,
        characters: resolveCanonicalCharactersFromScript(content),
        created_at: data.created_at,
        is_public: data.is_public,
    };
}

export async function deleteOwnedScript(
    supabase: DashboardServiceClient,
    userId: string,
    userEmail: string | null | undefined,
    scriptId: string
) {
    const { data: script } = await supabase
        .from("scripts")
        .select("is_public, user_id")
        .eq("id", scriptId)
        .single();

    if (script?.is_public && !isPlatformAdminEmail(userEmail)) {
        throw new Error("Cannot delete a public library script.");
    }

    const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", scriptId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting script:", error);
        throw new Error("Failed to delete script");
    }
}
