"use server";

import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

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

interface ElevenLabsVoiceApiEntry {
    voice_id: string;
    name: string;
    category: string;
    preview_url: string;
    labels?: Record<string, string | undefined>;
}

interface ElevenLabsVoicesApiResponse {
    voices: ElevenLabsVoiceApiEntry[];
}

interface ElevenLabsSubscriptionApiResponse {
    character_count?: number;
    character_limit?: number;
}

interface ParsedElevenLabsError {
    code?: string;
    message?: string;
}

function parseElevenLabsError(rawBody: string): ParsedElevenLabsError {
    try {
        const parsed = JSON.parse(rawBody) as { detail?: unknown };
        const detail = parsed.detail;

        if (typeof detail === "string") {
            return { message: detail };
        }

        if (detail && typeof detail === "object") {
            const detailObj = detail as Record<string, unknown>;
            const code = typeof detailObj.status === "string" ? detailObj.status : undefined;
            const message = typeof detailObj.message === "string" ? detailObj.message : undefined;
            return { code, message };
        }
    } catch {
        // noop: fallback to raw text below
    }

    const trimmed = rawBody.trim();
    return { message: trimmed ? trimmed.slice(0, 240) : undefined };
}

async function diagnoseElevenLabs401(apiKey: string): Promise<
    "invalid_key" | "quota_exceeded" | "tts_not_allowed" | "missing_user_read_permission" | "unknown"
> {
    try {
        const response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
            headers: {
                "xi-api-key": apiKey
            }
        });

        if (response.status === 401) {
            const rawBody = await response.text();
            const parsedError = parseElevenLabsError(rawBody);
            const errorCode = parsedError.code?.toLowerCase() ?? "";
            const errorMessage = parsedError.message?.toLowerCase() ?? "";

            if (errorCode === "missing_permissions" && /user_read/.test(errorMessage)) {
                return "missing_user_read_permission";
            }
            if (errorCode === "quota_exceeded") {
                return "quota_exceeded";
            }
            if (errorCode === "invalid_api_key" || /invalid|api key|unauthorized/.test(errorMessage)) {
                return "invalid_key";
            }
            return "unknown";
        }

        if (!response.ok) {
            return "unknown";
        }

        const data = await response.json() as ElevenLabsSubscriptionApiResponse;
        if (
            typeof data.character_count === "number" &&
            typeof data.character_limit === "number" &&
            data.character_limit > 0 &&
            data.character_count >= data.character_limit
        ) {
            return "quota_exceeded";
        }

        return "tts_not_allowed";
    } catch {
        return "unknown";
    }
}

export async function getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

    if (!apiKey) {
        console.warn("ELEVENLABS_API_KEY is not set.");
        return [];
    }

    try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: {
                "xi-api-key": apiKey,
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

        const data = await response.json() as ElevenLabsVoicesApiResponse;
        return data.voices.map((v) => ({
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

export async function synthesizeElevenLabsPreview(
    voiceId: string,
    text: string
): Promise<{ audio: string } | { error: string }> {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

    if (!apiKey) {
        return { error: "ELEVENLABS_API_KEY is not set." };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: "Veuillez vous connecter pour écouter un extrait." };
        }

        const normalizedText = text.trim();
        if (!normalizedText) {
            return { error: "Le texte de pré-écoute est vide." };
        }

        const requestVariants: Array<{ modelId: string | null }> = [
            { modelId: "eleven_multilingual_v2" },
            { modelId: null }
        ];

        let response: Response | null = null;
        let lastErrorStatus: number | null = null;
        let lastErrorCode: string | null = null;
        let lastErrorMessage: string | null = null;

        for (const variant of requestVariants) {
            response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: "POST",
                headers: {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": apiKey
                },
                body: JSON.stringify({
                    text: normalizedText,
                    ...(variant.modelId ? { model_id: variant.modelId } : {}),
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (response.ok) {
                break;
            }

            lastErrorStatus = response.status;
            const errorBody = await response.text();
            const parsedError = parseElevenLabsError(errorBody);
            lastErrorCode = parsedError.code ?? null;
            lastErrorMessage = parsedError.message ?? null;

            console.error("[ElevenLabs Preview] Error:", {
                status: response.status,
                code: parsedError.code,
                message: parsedError.message
            });

            const invalidKeyError =
                response.status === 401 && /invalid|unauthorized|api key/i.test(errorBody);

            if (response.status === 401) {
                const parsedCode = parsedError.code?.toLowerCase() ?? "";
                const parsedMessage = parsedError.message?.toLowerCase() ?? "";

                if (parsedCode === "quota_exceeded") {
                    return { error: "ELEVENLABS_401_QUOTA_EXCEEDED" };
                }

                if (parsedCode === "missing_permissions") {
                    if (/text[-_ ]to[-_ ]speech|text_to_speech/.test(parsedMessage)) {
                        return { error: "ELEVENLABS_401_TTS_SCOPE" };
                    }
                    if (/user_read/.test(parsedMessage)) {
                        return { error: "ELEVENLABS_401_USER_READ_SCOPE" };
                    }
                    return { error: "ELEVENLABS_401_SCOPE" };
                }

                if (parsedCode === "invalid_api_key") {
                    return { error: "ELEVENLABS_401_INVALID_KEY" };
                }

                const diagnosis = await diagnoseElevenLabs401(apiKey);
                if (diagnosis === "invalid_key") {
                    return { error: "ELEVENLABS_401_INVALID_KEY" };
                }
                if (diagnosis === "quota_exceeded") {
                    return { error: "ELEVENLABS_401_QUOTA_EXCEEDED" };
                }
                if (diagnosis === "tts_not_allowed") {
                    return { error: "ELEVENLABS_401_TTS_SCOPE" };
                }
                if (diagnosis === "missing_user_read_permission") {
                    return { error: "ELEVENLABS_401_USER_READ_SCOPE" };
                }
                return { error: "ELEVENLABS_401_UNKNOWN" };
            }

            if (invalidKeyError) {
                break;
            }
        }

        if (!response || !response.ok) {
            return {
                error: `ElevenLabs API Error: ${lastErrorStatus ?? 500}${lastErrorCode ? ` (${lastErrorCode})` : ""}${lastErrorMessage ? ` - ${lastErrorMessage}` : ""}`
            };
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentToHash = `${voiceId}|${normalizedText}`;
        const textHash = crypto.createHash("sha256").update(contentToHash).digest("hex");
        const fileName = `preview_${textHash}.mp3`;

        const { error: uploadError } = await supabase
            .storage
            .from("audio-cache")
            .upload(fileName, arrayBuffer, {
                contentType: "audio/mpeg",
                upsert: true
            });

        if (uploadError) {
            console.error("[ElevenLabs Preview] Upload failed:", uploadError.message);
            const buffer = Buffer.from(arrayBuffer);
            return { audio: `data:audio/mpeg;base64,${buffer.toString("base64")}` };
        }

        const { data: publicUrlData } = supabase
            .storage
            .from("audio-cache")
            .getPublicUrl(fileName);

        return { audio: publicUrlData.publicUrl };
    } catch (error: unknown) {
        console.error("[ElevenLabs Preview] Unexpected Error:", error);
        const message = error instanceof Error ? error.message : "Erreur de synthèse audio.";
        return { error: message };
    }
}
