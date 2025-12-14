"use server";

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export async function synthesizeSpeech(
    text: string,
    voice: OpenAIVoice = "nova"
): Promise<{ audio: string } | { error: string }> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return { error: "OPENAI_API_KEY not configured" };
        }

        const response = await openai.audio.speech.create({
            model: "tts-1", // or "tts-1-hd" for higher quality
            voice: voice,
            input: text,
            response_format: "mp3",
        });

        // Convert to base64 for client-side playback
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        return { audio: `data:audio/mp3;base64,${base64}` };
    } catch (error: any) {
        console.error("OpenAI TTS Error:", error);
        return { error: error.message || "Failed to synthesize speech" };
    }
}
