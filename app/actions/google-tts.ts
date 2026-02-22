"use server";

import { GOOGLE_VOICES, type GoogleVoiceProfile } from "@/lib/data/google-voices";
export type { GoogleVoiceProfile };

/**
 * Renvoie la liste complète des voix Google Chirp disponibles
 */
export async function getGoogleTTSVoices(): Promise<GoogleVoiceProfile[]> {
    return GOOGLE_VOICES;
}

/**
 * Synthétise un court extrait pour l'attente / la pré-écoute
 */
export async function synthesizeGoogleTTSPreview(voiceName: string, text: string): Promise<string> {
    if (!process.env.GOOGLE_TTS_API_KEY) {
        throw new Error("Clé API Google TTS non configurée.");
    }

    const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`;

    // Le voiceName peut être "Aoede" ou "fr-FR-Chirp3-HD-Aoede"
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
        console.error("[GoogleTTS] Error synthesizing preview:", errorData);
        throw new Error("Échec de la génération audio Google TTS.");
    }

    const data = await response.json();
    if (!data.audioContent) {
        throw new Error("Réponse Google TTS vide.");
    }

    // audioContent est en base64
    return `data:audio/mp3;base64,${data.audioContent}`;
}
