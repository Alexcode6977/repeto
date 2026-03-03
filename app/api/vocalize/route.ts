import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SourceType } from "@/lib/actions/voice-cache";
import { ScriptLine } from "@/lib/types";
import { parseSegments } from "@/lib/utils/stage-directions";

// Force Node.js runtime for long-running process (Edge might timeout too quickly for a whole play)
export const maxDuration = 300; // 5 minutes max on Vercel Pro, ignored on standard Node.js
export const dynamic = "force-dynamic";

const DEFAULT_GOOGLE_VOICE = "Aoede";
const DEFAULT_SYSTEM_VOICE = "fr-FR-Journey-D"; // Umbriel

function normalizeVoiceId(voice: string, isSystem: boolean = false): string {
    const candidate = (voice || "").trim();
    if (!candidate) return isSystem ? DEFAULT_SYSTEM_VOICE : DEFAULT_GOOGLE_VOICE;
    return candidate;
}

// Internal version of Google TTS generator that returns raw Buffer for storage
async function generateGoogleChirpAudioBuffer(text: string, voiceName: string, settings: any = {}): Promise<Buffer> {
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
            pitch: settings.pitch ?? 0,
            speakingRate: settings.speakingRate ?? 1.0,
            volumeGainDb: settings.volumeGainDb ?? 0,
        },
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("[VocalizeWorker] Error synthesizing speech:", errorData);
        throw new Error("Échec de la génération audio Google TTS.");
    }

    const data = await response.json();
    if (!data.audioContent) {
        throw new Error("Réponse Google TTS vide.");
    }

    return Buffer.from(data.audioContent, 'base64');
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { scriptId, sourceType = 'private_script' } = body;

        if (!scriptId) {
            return NextResponse.json({ error: "scriptId manquant" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Variables d'environnement Supabase manquantes");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log(`[VocalizeWorker] Demarrage de la vocalisation pour le script ${scriptId}`);

        // 1. Fetch the full script JSON
        console.log(`[VocalizeWorker] Fetching script ${scriptId} from DB...`);
        const { data: dbScript, error: scriptError } = await supabase
            .from("scripts")
            .select("content, vocalization_status")
            .eq("id", scriptId)
            .single();

        console.log(`[VocalizeWorker] Fetch result:`, { dbScript: !!dbScript, scriptError });

        if (scriptError || !dbScript) {
            console.error(`[VocalizeWorker] Script introuvable:`, scriptError);
            return NextResponse.json({ error: "Script introuvable", details: scriptError }, { status: 404 });
        }

        if (dbScript.vocalization_status === "completed" || dbScript.vocalization_status === "processing") {
            return NextResponse.json({ message: "Vocalisation déjà effectuée ou en cours." });
        }

        // Update status to processing early
        await supabase
            .from("scripts")
            .update({
                vocalization_status: "processing",
                vocalization_progress: 0
            })
            .eq("id", scriptId);


        const lines = dbScript.content?.lines || [];
        // Vocalize everything except metadata lines if any (currently dialogue, stage_direction, scene_heading are the main types)
        const spokenLines = lines.filter((l: ScriptLine) => l.type === "dialogue" || l.type === "stage_direction" || l.type === "scene_heading");
        const totalLines = spokenLines.length;

        if (totalLines === 0) {
            await supabase.from("scripts").update({ vocalization_status: "completed", vocalization_progress: 100 }).eq("id", scriptId);
            return NextResponse.json({ message: "Aucune ligne à vocaliser." });
        }

        // --- Asynchronous generation block ---
        // Utilisation de `after` de next/server pour garantir que la tâche tourne
        // en arrière-plan sur Vercel après le renvoi de la réponse HTTP.
        after(() => {
            processVocalization(scriptId, spokenLines, sourceType as SourceType).catch(err => {
                console.error(`[VocalizeWorker] Critical error during background processing:`, err);
            });
        });

        return NextResponse.json({ message: "Vocalisation lancée en tâche de fond.", totalLines });

    } catch (error: any) {
        console.error("[VocalizeWorker] Startup error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function processVocalization(scriptId: string, spokenLines: ScriptLine[], sourceType: SourceType) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Variables d'environnement Supabase manquantes dans le worker");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let processedCount = 0;

    console.log(`[VocalizeWorker] processVocalization started for ${spokenLines.length} lines.`);

    try {
        // Voice config Cache internally to avoid requerying DB for every line
        const voiceMap = new Map<string, { voiceId: string, settings: any }>();

        for (const line of spokenLines) {
            console.log(`[VocalizeWorker] Processing line ${line.id} of type ${line.type}`);

            // Fetch base character voice and settings if it's dialogue
            let charVoiceId = DEFAULT_GOOGLE_VOICE;
            let charSettings = {};
            if (line.type === 'dialogue') {
                const charName = line.character;
                let cachedConfig = voiceMap.get(charName);
                if (!cachedConfig) {
                    const { data } = await supabase
                        .from('play_voice_config')
                        .select('voice, settings')
                        .eq('source_type', sourceType)
                        .eq('source_id', scriptId)
                        .eq('character_name', charName)
                        .single();

                    if (data?.voice) {
                        cachedConfig = {
                            voiceId: normalizeVoiceId(data.voice),
                            settings: data.settings || {}
                        };
                        voiceMap.set(charName, cachedConfig);
                    } else {
                        cachedConfig = {
                            voiceId: DEFAULT_GOOGLE_VOICE,
                            settings: {}
                        };
                    }
                }
                charVoiceId = cachedConfig.voiceId;
                charSettings = cachedConfig.settings;
            }

            // Split line into segments to handle inline stage directions correctly matching UI playback
            const segments = parseSegments(line.text);

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                if (!segment.text.trim()) continue;

                let voiceId: string;
                let settingsForSegment: any = {};
                if (segment.isDirection || line.type !== 'dialogue') {
                    // Non-dialogue lines or inline stage directions use the system voice
                    voiceId = DEFAULT_SYSTEM_VOICE;
                } else {
                    voiceId = charVoiceId;
                    settingsForSegment = charSettings;
                }

                const cleanText = segment.isDirection
                    ? segment.text.replace(/^\s*\(|\)\s*$/g, "").trim()
                    : segment.text.trim();

                if (!cleanText) continue;

                // 2. Generate Audio buffer
                try {
                    const audioBuffer = await generateGoogleChirpAudioBuffer(cleanText, voiceId, settingsForSegment);

                    // 3. Upload to Supabase Storage
                    // Path: audio_cache/{scriptId}/{lineId}_{segmentIndex}.mp3
                    const filePath = `${scriptId}/${line.id}_${i}.mp3`;

                    const { error: uploadError } = await supabase.storage
                        .from("audio_cache")
                        .upload(filePath, audioBuffer, {
                            contentType: 'audio/mpeg',
                            upsert: true
                        });

                    if (uploadError) {
                        console.error(`[VocalizeWorker] Ligne ${line.id} seg ${i} - Upload error:`, uploadError);
                    }
                } catch (lineErr) {
                    console.error(`[VocalizeWorker] Ligne ${line.id} seg ${i} - TTS Generate error:`, lineErr);
                    // Continue to next segment even if one fails
                }
            }

            // 4. Update Progress periodically (e.g., every 5 lines or at the end)
            processedCount++;
            if (processedCount % 5 === 0 || processedCount === spokenLines.length) {
                const progress = Math.round((processedCount / spokenLines.length) * 100);
                await supabase
                    .from("scripts")
                    .update({ vocalization_progress: progress })
                    .eq("id", scriptId);
            }
        }

        // Finalize
        await supabase
            .from("scripts")
            .update({
                vocalization_status: "completed",
                vocalization_progress: 100
            })
            .eq("id", scriptId);

        console.log(`[VocalizeWorker] Terminé pour ${scriptId}. ${processedCount}/${spokenLines.length} téléchargés.`);

    } catch (globalError) {
        console.error(`[VocalizeWorker] Fatal error for script ${scriptId}:`, globalError);
        await supabase
            .from("scripts")
            .update({
                vocalization_status: "failed"
            })
            .eq("id", scriptId);
    }
}
