"use server";

import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { hasAiVoiceAccess } from "@/lib/subscription";
import {
    SourceType,
    getCachedAudio,
    cacheAudio,
    getCharacterVoice
} from "@/lib/actions/voice-cache";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export async function synthesizeSpeech(
    text: string,
    voice: OpenAIVoice = "nova",
    troupeId?: string // Optional: pass troupe context to check troupe subscription
): Promise<{ audio: string } | { error: string }> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return { error: "OPENAI_API_KEY not configured" };
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Veuillez vous connecter pour utiliser les voix IA." };

        // Check subscription tier (including troupe membership)
        const hasAccess = await hasAiVoiceAccess(user.id, troupeId);

        if (!hasAccess) {
            return { error: "Abonnement Solo Pro ou Troupe requis pour les voix IA." };
        }

        // --- CACHING LOGIC ---
        // 1. Create a unique hash for the request (Text + Voice)
        // strict normalization: trim whitespace, but keep case as it affects intonation
        const contentToHash = `${text.trim()}|${voice}`;
        const textHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

        // 2. Check if we already have this audio in our cache
        const { data: cachedEntry } = await supabase
            .from('audio_cache')
            .select('audio_path')
            .eq('text_hash', textHash)
            .single();

        if (cachedEntry) {
            // CACHE HIT!
            // Get public URL and return immediately without calling OpenAI
            const { data: publicUrlData } = supabase
                .storage
                .from('audio-cache')
                .getPublicUrl(cachedEntry.audio_path);

            console.log(`[TTS] Cache HIT for hash ${textHash.substring(0, 8)}`);
            return { audio: publicUrlData.publicUrl };
        }

        console.log(`[TTS] Cache MISS for hash ${textHash.substring(0, 8)} - Generating...`);

        // --- GENERATION LOGIC ---
        const response = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
            response_format: "mp3",
        });

        const buffer = await response.arrayBuffer();

        // 3. Store the file in Supabase Storage
        const fileName = `${textHash}.mp3`;

        const { error: uploadError } = await supabase
            .storage
            .from('audio-cache')
            .upload(fileName, buffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (uploadError) {
            console.error('[TTS] Failed to upload to cache:', uploadError);
            // Fallback: Just return base64 if storage fails, so user still gets audio
            const base64 = Buffer.from(buffer).toString("base64");
            return { audio: `data:audio/mp3;base64,${base64}` };
        }

        // 4. Record the entry in our database
        await supabase
            .from('audio_cache')
            .insert({
                text_hash: textHash,
                audio_path: fileName,
                metadata: {
                    text: text.substring(0, 100),
                    voice: voice,
                    generated_by: user.id
                }
            });

        // 5. Return the public URL
        const { data: publicUrlData } = supabase
            .storage
            .from('audio-cache')
            .getPublicUrl(fileName);

        return { audio: publicUrlData.publicUrl };

    } catch (error: any) {
        console.error("OpenAI TTS Error:", error);
        return { error: error.message || "Failed to synthesize speech" };
    }
}

/**
 * NEW: Synthesize speech using the play-based voice cache system
 * Uses fixed voice assignments per character per play
 */
export async function synthesizeSpeechWithPlayCache(
    text: string,
    characterName: string,
    lineIndex: number,
    sourceType: SourceType,
    sourceId: string,
    troupeId?: string
): Promise<{ audio: string } | { error: string }> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return { error: "OPENAI_API_KEY not configured" };
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Veuillez vous connecter pour utiliser les voix IA." };

        // Check subscription tier
        const hasAccess = await hasAiVoiceAccess(user.id, troupeId);
        if (!hasAccess) {
            return { error: "Abonnement Solo Pro ou Troupe requis pour les voix IA." };
        }

        // 1. Check play-based cache first
        const cachedAudioUrl = await getCachedAudio(sourceType, sourceId, lineIndex, characterName);
        if (cachedAudioUrl) {
            console.log(`[TTS Play Cache] HIT for ${characterName} line ${lineIndex}`);
            return { audio: cachedAudioUrl };
        }

        // 2. Get the voice for this character from config
        const voice = await getCharacterVoice(sourceType, sourceId, characterName);
        if (!voice) {
            return { error: `Aucune voix configurée pour ${characterName}. Veuillez d'abord configurer les voix.` };
        }

        console.log(`[TTS Play Cache] MISS for ${characterName} line ${lineIndex} - Generating with voice ${voice}...`);

        // 3. Generate audio
        const response = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
            response_format: "mp3",
        });

        const buffer = await response.arrayBuffer();
        const contentToHash = `${text.trim()}|${voice}`;
        const textHash = crypto.createHash('sha256').update(contentToHash).digest('hex');
        const fileName = `play_${sourceId.substring(0, 8)}_${textHash}.mp3`;

        // 4. Upload to storage
        const { error: uploadError } = await supabase
            .storage
            .from('audio-cache')
            .upload(fileName, buffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (uploadError) {
            console.error('[TTS Play Cache] Upload failed:', uploadError);
            const base64 = Buffer.from(buffer).toString("base64");
            return { audio: `data:audio/mp3;base64,${base64}` };
        }

        // 5. Get public URL
        const { data: publicUrlData } = supabase
            .storage
            .from('audio-cache')
            .getPublicUrl(fileName);

        const audioUrl = publicUrlData.publicUrl;

        // 6. Cache the audio URL in play_audio_cache
        await cacheAudio(sourceType, sourceId, lineIndex, characterName, textHash, audioUrl);

        return { audio: audioUrl };

    } catch (error: any) {
        console.error("OpenAI TTS Play Cache Error:", error);
        return { error: error.message || "Failed to synthesize speech" };
    }
}

