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
const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

// Helper to determine provider from voice ID if not specified
function inferProvider(voice: string): 'openai' | 'elevenlabs' {
    // If it's a UUID/ID (usually 20 chars), it's ElevenLabs. 
    // If it's one of the 6 OpenAI names, it's OpenAI.
    if (OPENAI_VOICES.includes(voice)) return 'openai';
    return 'elevenlabs';
}

async function generateElevenLabsAudio(text: string, voiceId: string, settings?: any): Promise<ArrayBuffer> {
    if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error("Clé API ElevenLabs non configurée");
    }

    const modelId = "eleven_multilingual_v2"; // Good balance of quality/speed for French
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: settings || {
                stability: 0.5,
                similarity_boost: 0.75
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[ElevenLabs] Error:", errorText);
        throw new Error(`ElevenLabs API Error: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
}

export async function synthesizeSpeech(
    text: string,
    voice: string = "21m00Tcm4TlvDq8ikWAM", // Default to Rachel (ElevenLabs)
    troupeId?: string
): Promise<{ audio: string } | { error: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Veuillez vous connecter pour utiliser les voix IA." };

        // Check subscription tier (including troupe membership)
        const hasAccess = await hasAiVoiceAccess(user.id, troupeId);

        if (!hasAccess) {
            return { error: "Abonnement Solo Pro ou Troupe requis pour les voix IA." };
        }

        // Determine provider
        const provider = inferProvider(voice);

        // --- CACHING LOGIC ---
        // 1. Create a unique hash for the request (Text + Voice + Provider)
        const contentToHash = `${text.trim()}|${voice}|${provider}`;
        const textHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

        // 2. Check if we already have this audio in our cache
        const { data: cachedEntry } = await supabase
            .from('audio_cache')
            .select('audio_path')
            .eq('text_hash', textHash)
            .single();

        if (cachedEntry) {
            const { data: publicUrlData } = supabase
                .storage
                .from('audio-cache')
                .getPublicUrl(cachedEntry.audio_path);

            console.log(`[TTS] Cache HIT for hash ${textHash.substring(0, 8)} (${provider})`);
            return { audio: publicUrlData.publicUrl };
        }

        console.log(`[TTS] Cache MISS for hash ${textHash.substring(0, 8)} - Generating via ${provider}...`);

        let buffer: ArrayBuffer;

        if (provider === 'openai') {
            if (!process.env.OPENAI_API_KEY) {
                return { error: "OPENAI_API_KEY not configured" };
            }
            const response = await openai.audio.speech.create({
                model: "tts-1",
                voice: voice as OpenAIVoice,
                input: text,
                response_format: "mp3",
            });
            buffer = await response.arrayBuffer();
        } else {
            // ElevenLabs
            try {
                buffer = await generateElevenLabsAudio(text, voice);
            } catch (e: any) {
                return { error: e.message };
            }
        }

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
                    provider: provider,
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
        console.error("TTS Error:", error);
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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Veuillez vous connecter pour utiliser les voix IA." };

        // Check subscription tier
        const hasAccess = await hasAiVoiceAccess(user.id, troupeId);
        if (!hasAccess) {
            return { error: "Abonnement Solo Pro ou Troupe requis pour les voix IA." };
        }

        // 2. Get the voice for this character from config
        const voiceConfig = await getCharacterVoice(sourceType, sourceId, characterName);
        if (!voiceConfig) {
            return { error: `Aucune voix configurée pour ${characterName}. Veuillez d'abord configurer les voix.` };
        }

        const { voice, provider, settings } = voiceConfig;

        // --- HASH CALCULATION ---
        // We need the hash to check the cache specifically for this segment text
        const contentToHash = `${text.trim()}|${voice}|${provider}`;
        const textHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

        // 1. Check play-based cache first (using Hash)
        const cachedAudioUrl = await getCachedAudio(sourceType, sourceId, lineIndex, characterName, textHash);
        if (cachedAudioUrl) {
            console.log(`[TTS Play Cache] HIT for ${characterName} line ${lineIndex} segment ${textHash.substring(0, 8)}`);
            return { audio: cachedAudioUrl };
        }

        console.log(`[TTS Play Cache] MISS for ${characterName} line ${lineIndex} - Generating with voice ${voice} (${provider})...`);

        // 3. Generate audio
        let buffer: ArrayBuffer;

        if (provider === 'openai') {
            if (!process.env.OPENAI_API_KEY) return { error: "OPENAI_API_KEY not configured" };

            const response = await openai.audio.speech.create({
                model: "tts-1",
                voice: voice as OpenAIVoice,
                input: text,
                response_format: "mp3",
            });
            buffer = await response.arrayBuffer();
        } else {
            // ElevenLabs
            try {
                buffer = await generateElevenLabsAudio(text, voice, settings);
            } catch (e: any) {
                return { error: e.message };
            }
        }

        // contentToHash and textHash already calculated above
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
        console.error("TTS Play Cache Error:", error);
        return { error: error.message || "Failed to synthesize speech" };
    }
}

