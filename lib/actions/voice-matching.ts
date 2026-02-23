"use server";

import { ParsedScript, ScriptLine } from "@/lib/types";
import { upsertVoiceAssignmentsBatch } from "@/lib/actions/voice-cache";
import { generateVoiceAssignments, VoiceMatchingAssignment } from "@/lib/voice-matching-core";

export async function generateVoiceMatchings(
  characters: string[],
  scriptContextLines: Pick<ScriptLine, "character" | "text" | "type">[] | null
): Promise<VoiceMatchingAssignment[] | null> {
  if (!characters || characters.length === 0) return [];

  const { assignments } = await generateVoiceAssignments({
    characters,
    scriptContextLines,
    apiKey: process.env.OPENAI_API_KEY,
    preferAi: true,
    timeoutMs: Number(process.env.OPENAI_CASTING_TIMEOUT_MS || 12000),
    model: process.env.OPENAI_CASTING_MODEL || "gpt-4o-mini",
  });

  return assignments;
}

export async function autoMatchVoicesForScript(scriptId: string, script: ParsedScript) {
  const charactersList = script.characters || [];
  if (charactersList.length === 0) return;

  const scriptContextLines = script.lines ? script.lines.slice(0, 800) : null;
  const { assignments } = await generateVoiceAssignments({
    characters: charactersList,
    scriptContextLines,
    apiKey: process.env.OPENAI_API_KEY,
    preferAi: true,
    timeoutMs: Number(process.env.OPENAI_CASTING_TIMEOUT_MS || 12000),
    model: process.env.OPENAI_CASTING_MODEL || "gpt-4o-mini",
  });

  if (!assignments || assignments.length === 0) return;

  const saveResult = await upsertVoiceAssignmentsBatch(
    "private_script",
    scriptId,
    assignments.map((assign) => ({
      characterName: assign.characterName,
      voiceId: assign.voiceId,
    })),
    "google",
    { stability: 0.5, similarity_boost: 0.75 }
  );

  if (!saveResult.success) {
    console.error("[Voice Matching] Batch save failed:", saveResult.error);
  }
}
