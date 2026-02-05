"use server";

export interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    category: string;
    preview_url: string;
    labels: {
        gender?: string;
        age?: string;
        accent?: string;
        use_case?: string;
        description?: string;
    };
}

export async function getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
    if (!process.env.ELEVENLABS_API_KEY) {
        console.warn("ELEVENLABS_API_KEY is not set.");
        return [];
    }

    try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: {
                "xi-api-key": process.env.ELEVENLABS_API_KEY,
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error("ElevenLabs API Key invalid or expired");
                return [];
            }
            console.error("Failed to fetch ElevenLabs voices:", response.statusText);
            return [];
        }

        const data = await response.json();
        return data.voices.map((v: any) => ({
            voice_id: v.voice_id,
            name: v.name,
            category: v.category,
            preview_url: v.preview_url,
            labels: {
                gender: v.labels?.gender,
                age: v.labels?.age,
                accent: v.labels?.accent,
                use_case: v.labels?.['use case'],
                description: v.labels?.description
            }
        }));
    } catch (error) {
        console.error("Error fetching ElevenLabs voices:", error);
        return [];
    }
}
