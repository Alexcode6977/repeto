"use server";

import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

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

        // --- QUOTA CHECK ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Please log in to use AI voices." };

        const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium, ai_credits")
            .eq("id", user.id)
            .single();

        if (!profile) return { error: "User profile not found." };

        if (!profile.is_premium) {
            if (profile.ai_credits <= 0) {
                return { error: "QUOTA_EXCEEDED" };
            }

            // Decrement credit
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ ai_credits: profile.ai_credits - 1 })
                .eq("id", user.id);

            if (updateError) console.error("Failed to decrement credit", updateError);
        }
        // -------------------

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
