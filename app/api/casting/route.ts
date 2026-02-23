import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GOOGLE_VOICES } from "@/lib/data/google-voices";

const CASTING_PROMPT = `Tu es un Expert en Direction Artistique. Ta mission est d'analyser le profil psychologique et vocal des personnages d'une pièce de théâtre.

Documents en entrée :
1. Référentiel Critères (Note de 1 à 4) : 
   - genreScore (1: Masculin, 4: Féminin)
   - ageScore (1: Enfant, 2: Jeune, 3: Mûr, 4: Senior)
   - pitchScore (1: Grave, 4: Aigu)
   - reliabilityScore (1: Instable/Émotif, 4: Fiable/Narrateur)
   - registerScore (1: Argot/Populaire, 4: Soutenu/Châtié)
   - projectionScore (1: Chuchoté/Secret, 4: Direct/Théâtral)
   - speedScore (1: Lent/Posé, 4: Rapide/Pressé)
   - textureScore (1: Lisse/Pur, 4: Granuleux/Cassé)
   - temperatureScore (1: Glacial/Froid, 4: Solaire/Chaud)

2. Texte de la pièce : (Un extrait du script pour l'analyse).

TA MISSION (PROFILAGE UNIQUEMENT) :
Pour chaque personnage fourni, analyse le texte et établis son "Score Cible" idéal (de 1 à 4) sur les 9 critères ci-dessus.

STRUCTURE DE RÉPONSE ATTENDUE (JSON STRICT) :
{
  "profiles": [
    { 
      "characterName": "Nom du perso", 
      "scores": { 
        "genderScore": number, 
        "ageScore": number, 
        "pitchScore": number,
        "reliabilityScore": number,
        "registerScore": number,
        "projectionScore": number,
        "speedScore": number,
        "textureScore": number,
        "temperatureScore": number
      },
      "artisticAnalysis": "Courte analyse de 10 mots max."
    }
  ]
}

REMARQUE : Pour les Didascalies ou Narrateur, le score de Fiabilité (reliabilityScore) doit être de 4.

Personnages à traiter :
{CHARACTERS_JSON}

Extrait du texte :
{SCRIPT_JSON}
`;

export async function POST(req: NextRequest) {
    try {
        const { characters, scriptContextLines } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = CASTING_PROMPT
            .replace("{CHARACTERS_JSON}", JSON.stringify(characters))
            .replace("{SCRIPT_JSON}", JSON.stringify(scriptContextLines));

        console.log(`[API Casting] Profiling ${characters.length} characters...`);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_completion_tokens: 2000
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("Empty AI response");

        const { profiles } = JSON.parse(content);

        // --- Algorithme de Calcul (Fiche Technique) ---
        const assignments = profiles.map((profile: any) => {
            const charScores = profile.scores;
            let bestVoice = null;
            let bestScore = -1;

            for (const voice of GOOGLE_VOICES) {
                // Filtre Bloquant : Genre ou Age diffèrent trop (> 1.5)
                if (Math.abs(charScores.genderScore - voice.genderScore) > 1.5) continue;
                if (Math.abs(charScores.ageScore - voice.ageScore) > 1.5) continue;

                // Somme des écarts sur les 9 critères
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

                // Formule de Score : 100 - (Somme_des_écarts / 27 * 100)
                const compatibility = Math.max(0, Math.floor(100 - (delta / 27 * 100)));

                if (compatibility > bestScore) {
                    bestScore = compatibility;
                    bestVoice = voice;
                }
            }

            return {
                characterName: profile.characterName,
                voiceId: bestVoice?.id || "fr-FR-Chirp3-HD-Aoede",
                justification: `Match à ${bestScore}% : ${profile.artisticAnalysis}`
            };
        });

        console.log(`[API Casting] Successfully matched ${assignments.length} characters.`);
        return NextResponse.json(assignments);

    } catch (error: any) {
        console.error("[API Casting] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
