import { createClient } from "@supabase/supabase-js";

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Variables d'environnement Supabase manquantes");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const scriptId = "8087bf50-5916-46d8-96dd-d85812c7a75e";

    const { data: dbScript, error: scriptError } = await supabase
        .from("scripts")
        .select("parsed_content")
        .eq("id", scriptId)
        .single();

    if (scriptError || !dbScript) {
        console.error("Script introuvable:", scriptError);
        return;
    }

    const lines = dbScript.parsed_content?.lines || [];
    const spokenLines = lines.filter((l: any) => l.type === "dialogue" || l.type === "stage_direction" || l.type === "scene_heading");

    console.log(`Starting processing for ${spokenLines.length} lines`);

    let processedCount = 0;
    const voiceMap = new Map<string, string>();

    for (const line of spokenLines.slice(0, 10)) { // just test first 10
        console.log(`Line ${line.id}: ${line.type}`);
        let voiceId;
        if (line.type === 'dialogue') {
            const charName = line.character;
            let cachedVoiceId = voiceMap.get(charName);
            if (!cachedVoiceId) {
                const { data } = await supabase
                    .from('play_voice_config')
                    .select('voice')
                    .eq('source_type', 'private_script')
                    .eq('source_id', scriptId)
                    .eq('character_name', charName)
                    .single();

                if (data?.voice) {
                    cachedVoiceId = data.voice;
                    voiceMap.set(charName, cachedVoiceId as string);
                } else {
                    cachedVoiceId = "Aoede";
                }
            }
            voiceId = cachedVoiceId;
        } else {
            voiceId = "fr-FR-Journey-D";
        }

        console.log(`Using voice ${voiceId} for ${line.type}`);

        const validVoiceId = voiceId || "Aoede";
        try {
            const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`;
            const fullVoiceId = validVoiceId.startsWith("fr-FR-") ? validVoiceId : `fr-FR-Chirp3-HD-${validVoiceId}`;

            const requestBody = {
                input: { text: line.text },
                voice: { languageCode: "fr-FR", name: fullVoiceId },
                audioConfig: { audioEncoding: "MP3" },
            };

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Google TTS error:", errorData);
            } else {
                console.log("TTS Success");
            }
        } catch (e) {
            console.error("Fetch error:", e);
        }
    }
}
run().catch(console.error);
