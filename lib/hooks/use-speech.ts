import { useState, useEffect, useCallback, useRef } from "react";

// Types for Web Speech API which might be missing in some environments
interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
}

export type SpeechState = "idle" | "speaking" | "listening" | "error";

export function useSpeech() {
    const [state, setState] = useState<SpeechState>("idle");
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [transcript, setTranscript] = useState("");

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    // Initialize Speech capabilities
    useEffect(() => {
        if (typeof window !== "undefined") {
            synthRef.current = window.speechSynthesis;

            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);
            };

            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }

            // Initialize Recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.lang = 'fr-FR';
                recognitionRef.current.maxAlternatives = 1;
            }
        }

        // Cleanup on unmount
        return () => {
            if (synthRef.current) synthRef.current.cancel();
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // ignore
                }
            }
        };
    }, []);

    const speak = useCallback((text: string, voice?: SpeechSynthesisVoice): Promise<void> => {
        return new Promise((resolve) => {
            if (!synthRef.current) {
                resolve();
                return;
            }

            // Cancel any ongoing speech
            synthRef.current.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "fr-FR";
            if (voice) utterance.voice = voice;

            // Dynamic Intonation Logic (Heuristics)
            let pitch = 1.0;
            let rate = 1.0;

            const isQuestion = text.includes("?");
            const isExclamation = text.includes("!");
            const isEllipsis = text.includes("...");
            const isAllCaps = text === text.toUpperCase() && text.length > 5;

            if (isEllipsis) {
                // Hesitation / Sadness / Thinking
                rate = 0.85;
                pitch = 0.9;
            } else if (isExclamation || isAllCaps) {
                // Excitement / Anger / Shouting
                rate = 1.15;
                pitch = 1.1;
            } else if (isQuestion) {
                // Question
                pitch = 1.1;
            }

            // Slight random variance for organic feel
            rate = rate + (Math.random() * 0.1 - 0.05);

            utterance.rate = rate;
            utterance.pitch = pitch;

            setState("speaking");

            utterance.onend = () => {
                setState("idle");
                resolve();
            };

            utterance.onerror = (e) => {
                // Ignore errors caused by canceling/skipping (expected behavior)
                if (e.error === 'interrupted' || e.error === 'canceled') {
                    // Do not reset state to idle here, as a new speech might have already started
                    resolve();
                    return;
                }
                console.error("Speech synthesis error", e);
                setState("idle"); // reset on valid error
                resolve();
            };

            synthRef.current.speak(utterance);
        });
    }, []);

    const listen = useCallback((): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!recognitionRef.current) {
                reject("Speech recognition not supported");
                return;
            }

            setState("listening");
            setTranscript("");

            recognitionRef.current.onresult = (event: any) => {
                const last = event.results.length - 1;
                const text = event.results[last][0].transcript;
                setTranscript(text);
                resolve(text);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setState("error");
                reject(event.error);
            };

            recognitionRef.current.onend = () => {
                // If we haven't resolved yet (e.g. no speech detected), we might want to handle that.
                // But usually onresult fires first if successful.
                // We'll set state back to idle externally or here if needed.
            };

            try {
                recognitionRef.current.start();
            } catch (e) {
                // Sometimes it's already started
                recognitionRef.current.stop();
                setTimeout(() => recognitionRef.current.start(), 100);
            }
        });
    }, []);

    const stop = useCallback(() => {
        if (synthRef.current) synthRef.current.cancel();
        if (recognitionRef.current) recognitionRef.current.stop();
        setState("idle");
    }, []);

    return {
        state,
        voices,
        transcript,
        speak,
        listen,
        stop,
        isSupported: typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    };
}
