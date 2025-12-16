"use client";

import { useState, useCallback, useRef } from "react";
import { synthesizeSpeech, OpenAIVoice } from "@/app/actions/tts";

export type TTSProvider = "browser" | "openai";

interface UseOpenAITTSReturn {
    speak: (text: string, voice?: OpenAIVoice) => Promise<void>;
    preload: (text: string, voice?: OpenAIVoice) => Promise<void>;
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
    const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setIsSpeaking(false);
        setIsLoading(false);
    }, []);

    const preload = useCallback(async (text: string, voice: OpenAIVoice = "nova") => {
        // Normalize text slightly to match speak key
        const key = `${voice}:${text}`;
        if (audioCache.current.has(key)) return;

        try {
            const result = await synthesizeSpeech(text, voice);
            if (!("error" in result)) {
                const audio = new Audio(result.audio);
                audio.preload = "auto";
                audio.load();
                audioCache.current.set(key, audio);
            }
        } catch (e) {
            console.warn("Preload failed for:", text.substring(0, 20), e);
        }
    }, []);

    const speak = useCallback(async (text: string, voice: OpenAIVoice = "nova") => {
        // Stop any ongoing playback
        stop();

        setIsLoading(true);
        setError(null);

        const key = `${voice}:${text}`;
        let audio = audioCache.current.get(key);

        try {
            if (!audio) {
                // Not in cache, fetch now
                const result = await synthesizeSpeech(text, voice);

                if ("error" in result) {
                    setError(result.error);
                    setIsLoading(false);
                    return;
                }
                audio = new Audio(result.audio);
                audioCache.current.set(key, audio);
            }

            audioRef.current = audio;
            setIsLoading(false);

            // Wait for playback to finish
            await new Promise<void>((resolve, reject) => {
                if (!audio) return reject("No audio");

                const onEnd = () => {
                    setIsSpeaking(false);
                    audioRef.current = null;
                    cleanup();
                    resolve();
                };

                const onError = () => {
                    setError("Failed to play audio");
                    setIsSpeaking(false);
                    setIsLoading(false);
                    cleanup();
                    reject(new Error("Audio playback failed"));
                };

                const cleanup = () => {
                    audio?.removeEventListener('ended', onEnd);
                    audio?.removeEventListener('error', onError);
                };

                audio.addEventListener('ended', onEnd);
                audio.addEventListener('error', onError);

                // Set speaking true immediately before play
                setIsSpeaking(true);

                audio.play().catch((e) => {
                    setError("Failed to start audio: " + e.message);
                    setIsLoading(false);
                    setIsSpeaking(false);
                    cleanup();
                    reject(e);
                });
            });
        } catch (e: any) {
            setError(e.message || "TTS failed");
            setIsLoading(false);
            setIsSpeaking(false);
        }
    }, [stop]);

    return {
        speak,
        preload,
        stop,
        isLoading,
        isSpeaking,
        error,
    };
}
