import { createClient } from "@/lib/supabase/client";
import type { ParsedScript, ScriptMetadata } from "@/lib/types";
import type {
    DashboardCurrentUserSnapshot,
    DashboardUserTier,
} from "@/lib/features/dashboard/types";
import type {
    SaveSoloFavoriteResult,
    SoloFavoriteDraft,
    SoloFavoriteLaunchPayload,
} from "@/lib/solo-favorites";
import {
    cancelVocalization,
    deleteScript,
    getScriptById,
    getScripts,
    getUserTierAction,
    renameScriptAction,
    togglePublicStatus,
} from "@/app/(protected)/dashboard/actions";
import { getScriptsWithVoiceConfig } from "@/lib/actions/voice-cache";
import {
    launchSoloFavorite,
    saveSoloFavorite,
} from "@/lib/actions/solo-favorites";

export async function getDashboardUserSnapshot(): Promise<DashboardCurrentUserSnapshot | null> {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

    const tier = await getUserTierAction();

    return {
        id: user.id,
        email: user.email ?? null,
        name: profile?.first_name || user.email?.split("@")[0] || "Artiste",
        tier: tier as DashboardUserTier,
    };
}

export async function listDashboardScripts(): Promise<ScriptMetadata[]> {
    const [scripts, voiceConfigIds] = await Promise.all([
        getScripts(),
        getScriptsWithVoiceConfig(),
    ]);

    return scripts.map((script) => ({
        ...script,
        hasVoiceConfig: voiceConfigIds.includes(script.id),
    }));
}

export async function fetchDashboardScript(scriptId: string): Promise<ParsedScript | null> {
    const script = await getScriptById(scriptId);
    return (script as ParsedScript | null) ?? null;
}

export async function renameDashboardScript(scriptId: string, newTitle: string) {
    await renameScriptAction(scriptId, newTitle);
}

export async function deleteDashboardScript(scriptId: string) {
    await deleteScript(scriptId);
}

export async function toggleDashboardScriptPublicStatus(script: ScriptMetadata) {
    await togglePublicStatus(script.id, Boolean(script.is_public));
}

export async function cancelDashboardVocalization(scriptId: string) {
    const result = await cancelVocalization(scriptId);

    if (!result.success) {
        throw new Error(result.error || "Impossible d'arrêter la génération audio.");
    }
}

export async function saveDashboardFavorite(draft: SoloFavoriteDraft): Promise<SaveSoloFavoriteResult> {
    return saveSoloFavorite(draft);
}

export async function launchDashboardFavorite(favoriteId: string): Promise<SoloFavoriteLaunchPayload> {
    return launchSoloFavorite(favoriteId);
}
