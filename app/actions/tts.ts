"use server";

import { createClient } from "@/lib/supabase/server";
import { hasAiVoiceAccess } from "@/lib/subscription";
import {
    SourceType,
    getCharacterVoice
} from "@/lib/actions/voice-cache";

const DEFAULT_GOOGLE_VOICE = "Aoede";

function normalizeVoiceId(voice: string): string {
    const candidate = (voice || "").trim();
    if (!candidate) return DEFAULT_GOOGLE_VOICE;
    return candidate;
}

async function generateGoogleChirpAudio(text: string, voiceName: string): Promise<string> {
    if (!process.env.GOOGLE_TTS_API_KEY) {
        throw new Error("Clé API Google TTS non configurée");
    }

    const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`;
    const fullVoiceId = voiceName.startsWith("fr-FR-") ? voiceName : `fr-FR-Chirp3-HD-${voiceName}`;

    const requestBody = {
        input: { text },
        voice: {
            languageCode: "fr-FR",
            name: fullVoiceId,
        },
        audioConfig: {
            audioEncoding: "MP3",
        },
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("[GoogleTTS] Error synthesizing speech:", errorData);
        throw new Error("Échec de la génération audio Google TTS.");
    }

    const data = await response.json();
    if (!data.audioContent) {
        throw new Error("Réponse Google TTS vide.");
    }

    return `data:audio/mp3;base64,${data.audioContent}`;
}

export async function synthesizeSpeech(
    text: string,
    voice: string = DEFAULT_GOOGLE_VOICE,
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

        const voiceId = normalizeVoiceId(voice);
        const dataUrl = await generateGoogleChirpAudio(text, voiceId);

        return { audio: dataUrl };
    } catch (error: any) {
        console.error("TTS Error:", error);
        return { error: error.message || "Failed to synthesize speech" };
    }
}

/**
 * Synthesize speech using the play-based voice cache system
 * Uses fixed voice assignments per character per play
 */
export async function synthesizeSpeechWithPlayCache(
    text: string,
    characterName: string,
    lineIndex: number, // Conservé pour la signature mais inutilisé vu l'absence de DB cache en Phase 1
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

        // Get the voice for this character from config
        const voiceConfig = await getCharacterVoice(sourceType, sourceId, characterName);
        if (!voiceConfig) {
            return { error: `Aucune voix configurée pour ${characterName}. Veuillez d'abord configurer les voix.` };
        }

        const { voice } = voiceConfig;
        const voiceId = normalizeVoiceId(voice);

        // Generate audio directly (sans système de cache base de données pour la Phase 1 du remplacement)
        const dataUrl = await generateGoogleChirpAudio(text, voiceId);

        return { audio: dataUrl };

    } catch (error: any) {
        console.error("TTS Play Generation Error:", error);
        return { error: error.message || "Failed to synthesize speech" };
    }
}
