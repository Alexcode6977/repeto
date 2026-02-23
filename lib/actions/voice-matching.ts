"use server";

import OpenAI from "openai";
import { ParsedScript, ScriptLine } from "@/lib/types";
import { GOOGLE_VOICES } from "@/lib/data/google-voices";
import { updateVoiceAssignment } from "@/lib/actions/voice-cache";

const CASTING_PROMPT = `Tu es un Expert en Direction Artistique. Ta mission est d'analyser le profil psychologique et vocal des personnages d'une pièce de théâtre.

Documents en entrée :
1. Référentiel Critères : (10 critères notés de 1 à 4 : Genre, Âge, Tonalité, Fiabilité, Registre, Projection, Vitesse, Texture, Température, Énergie).
2. Texte de la pièce : (Un extrait du script pour l'analyse).

TA MISSION (PROFILAGE UNIQUEMENT) :
Pour chaque personnage fourni, analyse le texte et établis son "Score Cible" idéal (de 1 à 4) sur les 10 critères suivants :
• genreScore : 1=Masculin, 4=Féminin
• ageScore : 1=Enfant, 2=Jeune, 3=Mûr, 4=Senior
• pitchScore : 1=Grave, 4=Aigu
• reliabilityScore : 1=Instable, 4=Fiable (Didascalies/Narrateur = 4)
• registerScore : 1=Argot, 4=Soutenu
• projectionScore : 1=Chuchoté, 4=Théâtral
• speedScore : 1=Lent, 4=Rapide
• textureScore : 1=Lisse, 4=Granuleux
• temperatureScore : 1=Froid, 4=Chaud
• energyScore : 1=Calme, 4=Explosif

STRUCTURE DE RÉPONSE ATTENDUE (STRICTE) :
Tu DOIS renvoyer UNIQUEMENT un objet JSON valide.
{
  "profiles": [
    { 
      "characterName": "Nom du perso", 
      "scores": { "genderScore": 2, "ageScore": 3, ... },
      "artisticAnalysis": "Courte analyse du tempérament (ex: Personnage autoritaire et froid, registre soutenu)."
    }
  ]
}

Personnages à traiter :
{CHARACTERS_JSON}

Extrait du texte de la pièce pour l'analyse :
{SCRIPT_JSON}
`;

export async function generateVoiceMatchings(characters: string[], scriptContextLines: Pick<ScriptLine, "character" | "text" | "type">[] | null): Promise<Array<{ characterName: string, voiceId: string, justification: string }> | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[Voice Matching] OPENAI_API_KEY is MISSING in environment variables.");
    return null;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 25000,
  });

  try {
    console.log(`[Voice Matching] Starting auto-match for ${characters.length} characters...`);

    if (characters.length === 0) return null;

    const scriptContext = scriptContextLines ? scriptContextLines.slice(0, 200).map(l => ({
      character: l.character,
      text: l.text,
      type: l.type
    })) : [];

    const prompt = CASTING_PROMPT
      .replace("{CHARACTERS_JSON}", JSON.stringify(characters))
      .replace("{SCRIPT_JSON}", JSON.stringify(scriptContext));

    console.log("[Voice Matching] Sending request to OpenAI (gpt-4o-mini)...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_completion_tokens: 2000
    });

    console.log("[Voice Matching] OpenAI response received.");
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("[Voice Matching] OpenAI returned empty content.");
      return null;
    }

    const { profiles } = JSON.parse(content);
    console.log(`[Voice Matching] Parsed ${profiles.length} profiles from IA.`);

    const assignments = profiles.map((profile: any) => {
      const charScores = profile.scores;
      let bestVoice: any = null;
      let bestScore = -1;

      for (const voice of GOOGLE_VOICES) {
        // Filtre bloquant Genre / Age (très important pour l'utilisateur)
        if (Math.abs(charScores.genderScore - voice.genderScore) > 1.5) continue;
        if (Math.abs(charScores.ageScore - voice.ageScore) > 1.5) continue;

        // Somme des écarts sur les 9 critères (EnergyScore est ignoré)
        const delta =
          Math.abs(charScores.genderScore - voice.genderScore) +
          Math.abs(charScores.ageScore - (voice.ageScore || 3)) +
          Math.abs(charScores.pitchScore - (voice.pitchScore || 3)) +
          Math.abs(charScores.reliabilityScore - (voice.narrativeReliabilityScore || 3)) +
          Math.abs(charScores.registerScore - (voice.registerScore || 3)) +
          Math.abs(charScores.projectionScore - (voice.projectionScore || 3)) +
          Math.abs(charScores.speedScore - (voice.speedScore || 3)) +
          Math.abs(charScores.textureScore - (voice.textureScore || 3)) +
          Math.abs(charScores.temperatureScore - (voice.temperatureScore || 3));

        // Max delta for 9 criteria (each 1-4, max diff 3) is 9 * 3 = 27
        const compatibility = Math.max(0, Math.floor(100 - (delta / 27 * 100)));
        if (compatibility > bestScore) {
          bestScore = compatibility;
          bestVoice = voice;
        }
      }

      return {
        characterName: profile.characterName,
        voiceId: bestVoice?.id || "fr-FR-Chirp3-HD-Aoede", // Fallback to a default voice
        justification: `Match à ${bestScore}% : ${profile.artisticAnalysis}`
      };
    });

    return assignments;
  } catch (err) {
    console.error("[Voice Matching] Error during auto-matching generation:", err);
    return null;
  }
}

export async function autoMatchVoicesForScript(scriptId: string, script: ParsedScript) {
  const charactersList = script.characters || [];
  const scriptContextLines = script.lines ? script.lines.slice(0, 800) : [];
  const assignments = await generateVoiceMatchings(charactersList, scriptContextLines);

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
