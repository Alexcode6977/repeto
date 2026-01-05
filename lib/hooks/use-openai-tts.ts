"use client";

import { useState, useCallback, useRef, useMemo } from "react";
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

const MAX_CACHE_SIZE = 50; // Limit in-memory cache to prevent memory leaks

export function useOpenAITTS(): UseOpenAITTSReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

    // LRU-style cache eviction
    const addToCache = useCallback((key: string, audio: HTMLAudioElement) => {
        // If cache is full, remove oldest entry (first in Map)
        if (audioCache.current.size >= MAX_CACHE_SIZE) {
            const firstKey = audioCache.current.keys().next().value;
            if (firstKey) {
                audioCache.current.delete(firstKey);
            }
        }
        audioCache.current.set(key, audio);
    }, []);

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
        const key = `${voice}:${text}`;
        if (audioCache.current.has(key)) return;

        try {
            const result = await synthesizeSpeech(text, voice);
            if (!("error" in result)) {
                const audio = new Audio(result.audio);
                audio.preload = "auto";
                audio.load();
                addToCache(key, audio);
            }
        } catch (e) {
            console.warn("Preload failed for:", text.substring(0, 20), e);
        }
    }, [addToCache]);

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

                // Use existing ref if available to reuse the "warm" element
                if (audioRef.current && !isSpeaking) {
                    audio = audioRef.current;
                    audio.src = result.audio;
                } else {
                    audio = new Audio(result.audio);
                }
                addToCache(key, audio);
            }

            audioRef.current = audio;
            setIsLoading(false);

            // Wait for playback to finish
            await new Promise<void>((resolve, reject) => {
                if (!audio) return reject("No audio");

                const onEnd = () => {
                    setIsSpeaking(false);
                    cleanup();
                    resolve();
                };

                const onError = (e: any) => {
                    console.error("[OpenAI] Audio Error:", e);
                    setError("Failed to play audio");
                    setIsSpeaking(false);
                    setIsLoading(false);
                    cleanup();
                    reject(new Error("Audio playback failed"));
                };

                const cleanup = () => {
                    audio?.removeEventListener('ended', onEnd);
                    audio?.removeEventListener('error', onError);
                    audio?.removeEventListener('pause', onEnd); // Safari sometimes fires pause instead of ended if interrupted
                };

                audio.addEventListener('ended', onEnd);
                audio.addEventListener('error', onError);
                audio.addEventListener('pause', onEnd);

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
    }, [stop, addToCache]);

    return useMemo(() => ({
        speak,
        preload,
        stop,
        isLoading,
        isSpeaking,
        error,
    }), [speak, preload, stop, isLoading, isSpeaking, error]);
}
