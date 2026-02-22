"use server";

import OpenAI from "openai";
import { ParsedScript } from "@/lib/types";
import { GOOGLE_VOICES } from "@/lib/data/google-voices";
import { updateVoiceAssignment } from "@/lib/actions/voice-cache";

const CASTING_PROMPT = `Tu es un DIRECTEUR DE CASTING IA expert. 
Ta mission est d'attribuer la meilleure voix Google TTS disponible à chaque personnage d'une pièce de théâtre, en te basant sur une analyse de leur nom et/ou d'un contexte déduit.

Voici la liste des voix disponibles au format JSON :
{VOICES_JSON}

Voici les personnages de la pièce :
{CHARACTERS_JSON}

RÈGLES D'ATTRIBUTION :
1. Le Narrateur/Didascalies doit utiliser la voix 'Aoede' a priori.
2. Respecte le genre et l'âge approximatif ou implicite du personnage (un roi sera probablement un homme mûr, une fillette une jeune fille, etc.).
3. Chaque personnage principal DOIT idéalement avoir une voix unique.
4. Tu peux attribuer la même voix à des personnages de passage si tu manques de voix.
5. Renvoie UNIQUEMENT un objet JSON valide contenant un tableau 'assignments' avec pour chaque personnage son 'characterName' et le 'voiceId' de la voix Google TTS choisie, ainsi qu'une très brève 'justification'. Ne renvoie RIEN D'AUTRE que le JSON brut (pas de balises markdown \`\`\`json).

Exemple de format de réponse JSON :
{
  "assignments": [
    { "characterName": "Narrateur", "voiceId": "Aoede", "justification": "Voix par défaut pour la narration." },
    { "characterName": "Hamlet", "voiceId": "Fenrir", "justification": "Voix jeune et intense pour le rôle principal." }
  ]
}
`;

export async function generateVoiceMatchings(characters: string[]): Promise<Array<{ characterName: string, voiceId: string, justification: string }> | null> {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("[Voice Matching] OPENAI_API_KEY absent, impossible de générer les voix.");
        return null;
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        console.log(`[Voice Matching] Starting auto-match for ${characters.length} characters...`);

        if (characters.length === 0) return null;

        const voicesData = GOOGLE_VOICES.map(v => ({
            id: v.id,
            name: v.name,
            gender: v.gender,
            age: v.age,
            description: v.description
        }));

        const finalPrompt = CASTING_PROMPT
            .replace("{VOICES_JSON}", JSON.stringify(voicesData))
            .replace("{CHARACTERS_JSON}", JSON.stringify(characters));

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: finalPrompt }
            ],
            response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0]?.message?.content?.trim();
        if (!rawContent) {
            console.error("[Voice Matching] No content returned from OpenAI");
            return null;
        }

        const data = JSON.parse(rawContent);
        return data.assignments || [];

    } catch (err) {
        console.error("[Voice Matching] Error during auto-matching generation:", err);
        return null;
    }
}

export async function autoMatchVoicesForScript(scriptId: string, script: ParsedScript) {
    const charactersList = script.characters || [];
    const assignments = await generateVoiceMatchings(charactersList);

    if (!assignments || assignments.length === 0) return;

    console.log("[Voice Matching] Auto-match successful, saving configs...", assignments);

    for (const assign of assignments) {
        if (assign.characterName && assign.voiceId) {
            await updateVoiceAssignment(
                "private_script",
                scriptId,
                assign.characterName,
                assign.voiceId,
                "google",
                { stability: 0.5, similarity_boost: 0.75 }
            );
        }
    }
}
