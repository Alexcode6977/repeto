"use server";

import { ParsedScript } from "@/lib/types";
import { ImportValidationSubmission } from "@/app/(protected)/dashboard/actions";
import { validateResolvedMappings, normalizeCharacterLabel } from "@/lib/actions/validation-utils";
import { generateVoiceAssignments } from "@/lib/voice-matching-core";
import { upsertVoiceAssignmentsBatch } from "@/lib/actions/voice-cache";
import { createPlay } from "@/lib/actions/play";

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
