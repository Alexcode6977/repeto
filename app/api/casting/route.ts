import { NextRequest, NextResponse } from "next/server";
import { generateVoiceAssignments } from "@/lib/voice-matching-core";

function sanitizeCharacters(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((value) => (typeof value === "string" ? value : ""))
        .filter((value) => value.trim().length > 0);
}

function sanitizeScriptLines(raw: unknown): Array<{ character: string; text: string; type: "dialogue" | "stage_direction" | "scene_heading" }> | null {
    if (!Array.isArray(raw)) return null;
    return raw
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const candidate = item as Record<string, unknown>;
            const typeValue = typeof candidate.type === "string" ? candidate.type : "dialogue";
            const safeType = (typeValue === "dialogue" || typeValue === "stage_direction" || typeValue === "scene_heading")
                ? typeValue
                : "dialogue";
            return {
                character: typeof candidate.character === "string" ? candidate.character : "",
                text: typeof candidate.text === "string" ? candidate.text : "",
                type: safeType,
            };
        })
        .filter((line): line is { character: string; text: string; type: "dialogue" | "stage_direction" | "scene_heading" } => Boolean(line));
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const characters = sanitizeCharacters(body?.characters);
        const scriptContextLines = sanitizeScriptLines(body?.scriptContextLines);

        if (characters.length === 0) {
            return NextResponse.json([]);
        }

        const { assignments, source } = await generateVoiceAssignments({
            characters,
            scriptContextLines,
            apiKey: process.env.OPENAI_API_KEY,
            preferAi: true,
            timeoutMs: Number(process.env.OPENAI_CASTING_TIMEOUT_MS || 12000),
            model: process.env.OPENAI_CASTING_MODEL || "gpt-4o-mini",
        });

        console.log(`[API Casting] ${assignments.length} voix attribuées (${source}).`);
        return NextResponse.json(assignments);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Erreur casting inconnue";
        console.error("[API Casting] Error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
