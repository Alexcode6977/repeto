"use client";

import { useState, useCallback, useRef } from "react";
import { synthesizeSpeech, OpenAIVoice } from "@/app/actions/tts";

export type TTSProvider = "browser" | "openai";

interface UseOpenAITTSReturn {
    speak: (text: string, voice?: OpenAIVoice) => Promise<void>;
    stop: () => void;
    isLoading: boolean;
    isSpeaking: boolean;
    error: string | null;
}

export function useOpenAITTS(): UseOpenAITTSReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setIsSpeaking(false);
        setIsLoading(false);
    }, []);

    const speak = useCallback(async (text: string, voice: OpenAIVoice = "nova") => {
        // Stop any ongoing playback
        stop();

        setIsLoading(true);
        setError(null);

        try {
            const result = await synthesizeSpeech(text, voice);

            if ("error" in result) {
                setError(result.error);
                setIsLoading(false);
                return;
            }

            // Create audio element and play
            const audio = new Audio(result.audio);
            audioRef.current = audio;

            // Wait for playback to finish
            await new Promise<void>((resolve, reject) => {
                audio.onloadeddata = () => {
                    setIsLoading(false);
                    setIsSpeaking(true);
                };

                audio.onended = () => {
                    setIsSpeaking(false);
                    audioRef.current = null;
                    resolve();
                };

                audio.onerror = () => {
                    setError("Failed to play audio");
                    setIsSpeaking(false);
                    setIsLoading(false);
                    reject(new Error("Audio playback failed"));
                };

                audio.play().catch((e) => {
                    setError("Failed to start audio: " + e.message);
                    setIsLoading(false);
                    reject(e);
                });
            });
        } catch (e: any) {
            setError(e.message || "TTS failed");
            setIsLoading(false);
        }
    }, [stop]);

    return {
        speak,
        stop,
        isLoading,
        isSpeaking,
        error,
    };
}
