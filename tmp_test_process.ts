import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';

function parseSegments(text: string) {
    if (!text) return [];
    const parts = text.split(/(\(.*?\))/g);
    return parts
        .filter(part => part !== "")
        .map(part => {
            const trimmed = part.trim();
            const isDirection = trimmed.startsWith("(") && trimmed.endsWith(")");
            return { text: part, isDirection };
        });
}

function normalizeVoiceId(voice: string, isSystem: boolean = false): string {
    const candidate = (voice || "").trim();
    if (!candidate) return isSystem ? "fr-FR-Journey-D" : "Aoede";
    return candidate;
}

async function testProcess() {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    const ttsKeyMatch = envFile.match(/GOOGLE_TTS_API_KEY=(.+)/);

    if (!urlMatch || !keyMatch || !ttsKeyMatch) throw new Error("Config not found");

    const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
    const gttsKey = ttsKeyMatch[1].trim();
    const scriptId = "fe2b08eb-d930-4baa-8eb4-f9e09dc76321";

    const { data: dbScript, error: scriptError } = await supabase
        .from("scripts")
        .select("content, vocalization_status")
        .eq("id", scriptId)
        .single();

    if (!dbScript) throw new Error("Script not found");

    const lines = dbScript.content?.lines || [];
    const spokenLines = lines.filter((l: any) => l.type === "dialogue" || l.type === "stage_direction" || l.type === "scene_heading");
    console.log("Spoken lines found:", spokenLines.length);

    if (spokenLines.length === 0) return;

    // Test just the first 3 lines
    const testLines = spokenLines.slice(0, 3);
    const voiceMap = new Map();

    for (const line of testLines) {
        console.log(`Processing line ${line.id} of type ${line.type}`);

        let charVoiceId = "Aoede";
        let charSettings = {};
        if (line.type === 'dialogue') {
            const charName = line.character;
            let cachedConfig = voiceMap.get(charName);
            if (!cachedConfig) {
                const { data } = await supabase
                    .from('play_voice_config')
                    .select('voice, settings')
                    .eq('source_type', 'private_script')
                    .eq('source_id', scriptId)
                    .ilike('character_name', charName) // Use ilike just in case
                    .limit(1)
                    .single();

                if (data?.voice) {
                    cachedConfig = {
                        voiceId: normalizeVoiceId(data.voice),
                        settings: data.settings || {}
                    };
                    voiceMap.set(charName, cachedConfig);
                } else {
                    cachedConfig = { voiceId: "Aoede", settings: {} };
                }
            }
            charVoiceId = cachedConfig.voiceId;
            charSettings = cachedConfig.settings;
            console.log(`  Character: ${charName}, Voice assigned: ${charVoiceId}`);
        }

        const segments = parseSegments(line.text);
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (!segment.text.trim()) continue;

            let voiceId;
            let settingsForSegment = {};
            if (segment.isDirection || line.type !== 'dialogue') {
                voiceId = "fr-FR-Journey-D";
            } else {
                voiceId = charVoiceId;
                settingsForSegment = charSettings;
            }

            const cleanText = segment.isDirection
                ? segment.text.replace(/^\s*\(|\)\s*$/g, "").trim()
                : segment.text.trim();

            if (!cleanText) continue;

            const fullVoiceId = voiceId.startsWith("fr-FR-") ? voiceId : `fr-FR-Chirp3-HD-${voiceId}`;
            console.log(`  Segment ${i}: Generating Audio for "${cleanText}" with voice: ${fullVoiceId}`);

            try {
                const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${gttsKey}`;
                const requestBody = {
                    input: { text: cleanText },
                    voice: { languageCode: "fr-FR", name: fullVoiceId },
                    audioConfig: { audioEncoding: "MP3" },
                };

                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    console.error(`  TTS Error for ${fullVoiceId}:`, await response.text());
                    continue;
                }
                const data = await response.json();
                console.log(`  Success! Buffer length:`, data.audioContent.length);

            } catch (err) {
                console.error("  Catch Error:", err);
            }
        }
    }
}

testProcess().catch(console.error);
