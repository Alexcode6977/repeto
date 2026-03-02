import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';

async function testUpload() {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    const ttsKeyMatch = envFile.match(/GOOGLE_TTS_API_KEY=(.+)/);

    if (!urlMatch || !keyMatch || !ttsKeyMatch) throw new Error("Config not found");

    const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
    const gttsKey = ttsKeyMatch[1].trim();

    // 1. Generate Voice
    console.log("Generating audio with Google TTS...");
    const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${gttsKey}`;
    const requestBody = {
        input: { text: "Ceci est un test." },
        voice: { languageCode: "fr-FR", name: "fr-FR-Chirp3-HD-Aoede" },
        audioConfig: { audioEncoding: "MP3" },
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`Google TTS Error: ${await response.text()}`);
    }

    const data = await response.json();
    const audioBuffer = Buffer.from(data.audioContent, 'base64');
    console.log("Audio generated, size:", audioBuffer.length);

    // 2. Upload to Supabase Storage
    console.log("Uploading to Supabase...");
    const filePath = `test_script_id/test_line_0.mp3`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from("audio_cache")
        .upload(filePath, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
        });

    if (uploadError) {
        console.error("Supabase Upload Error:", uploadError);
    } else {
        console.log("Upload Success:", uploadData);
    }
}

testUpload().catch(console.error);
