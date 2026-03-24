"use server";

import { ParsedScript } from "@/lib/types";
import { ImportValidationSubmission } from "@/app/(protected)/dashboard/actions";
import { validateResolvedMappings, normalizeCharacterLabel } from "@/lib/actions/validation-utils";
import { generateVoiceAssignments } from "@/lib/voice-matching-core";
import { upsertVoiceAssignmentsBatch } from "@/lib/actions/voice-cache";
import { createPlay } from "@/lib/actions/play";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveTroupeScriptWithImportValidation(
    troupeId: string,
    script: ParsedScript,
    submission: ImportValidationSubmission
): Promise<{ success: true; scriptId: string } | { error: string }> {
    try {
        const validated = validateResolvedMappings(submission.diagnostics, submission.decisions, submission.mappings);
        if (!validated.ok) {
            return { error: validated.error };
        }

        const enrichedAliases: Record<string, string> = { ...(validated.sanitized.aliases || {}) };
        const canonicalSet = new Set(validated.sanitized.canonical_characters);

        const voixDePattern = /^VOIX\s+(?:DE\s+LA\s+|DU\s+|DES\s+|DE\s+|(?:[A-ZÀ-ÖØ-Þ]+\s+)*D['ʼ]\s*)/i;
        for (const line of (script.lines || [])) {
            if (line.type !== "dialogue") continue;
            const raw = normalizeCharacterLabel(line.character || "");
            if (!raw || canonicalSet.has(raw)) continue;
            if (!voixDePattern.test(raw)) continue;
            if (enrichedAliases[raw]) continue;

            const stripped = raw
                .replace(/^VOIX\s+DE\s+LA\s+/i, "")
                .replace(/^VOIX\s+DU\s+/i, "")
                .replace(/^VOIX\s+DES\s+/i, "")
                .replace(/^VOIX\s+DE\s+/i, "")
                .replace(/^VOIX\s+(?:[A-ZÀ-ÖØ-Þ]+\s+)*D['ʼ]\s*/i, "")
                .replace(/\s+/g, " ")
                .trim();
            if (stripped && canonicalSet.has(stripped)) {
                enrichedAliases[raw] = stripped;
            }
        }

        validated.sanitized.aliases = enrichedAliases;

        const finalScript: ParsedScript = {
            ...script,
            lines: script.lines || [],
            characters: validated.sanitized.canonical_characters,
            schema_version: 2,
            mappings: validated.sanitized,
        };

        const play = await createPlay(troupeId, finalScript.title || "Untitled Script", finalScript);
        if (!play) {
            return { error: "Failed to create play in troupe" };
        }
        const scriptId = play.id;

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
                "troupe_play",
                scriptId,
                assignmentsToPersist.map((assignment: any) => ({
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
    } catch (error) {
        console.error("[Troupe Import Validation] Unexpected error saving script:", error);
        return { error: "Erreur inattendue de sauvegarde." };
    }
}

export async function importCatalogToTroupe(
    troupeId: string,
    sourceScriptId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Fetch the public catalogue script with its full content
    const { data: sourceScript, error: fetchError } = await supabase
        .from("scripts")
        .select("title, content")
        .eq("id", sourceScriptId)
        .eq("is_public", true)
        .single();

    if (fetchError || !sourceScript) {
        return { success: false, error: "Script non trouvé dans le catalogue" };
    }

    const rawContent = sourceScript.content as ParsedScript;
    if (!rawContent || !rawContent.lines) {
        return { success: false, error: "Le script du catalogue est vide ou invalide" };
    }

    // Ensure required fields have safe defaults for createPlay
    const parsedScript: ParsedScript = {
        ...rawContent,
        lines: rawContent.lines.filter(Boolean),
        scenes: rawContent.scenes?.length ? rawContent.scenes : [{ index: 0, title: sourceScript.title }],
        characters: rawContent.characters || [],
    };

    try {
        await createPlay(troupeId, sourceScript.title, parsedScript);
        revalidatePath(`/troupes/${troupeId}/plays`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Erreur lors de l'import" };
    }
}
