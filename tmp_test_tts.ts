import * as fs from 'fs';

async function testTTS() {
    // Read key from .env.local
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const keyMatch = envFile.match(/GOOGLE_TTS_API_KEY=(.+)/);
    const key = keyMatch ? keyMatch[1].trim() : null;

    if (!key) throw new Error("API key not found");

    const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`;
    const fullVoiceId = "fr-FR-Chirp3-HD-Aoede"; // or whatever

    const requestBody = {
        input: { text: "Bonjour, ceci est un test de vocalisation." },
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

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
}

testTTS().catch(console.error);
