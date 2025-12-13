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
                recognitionRef.current.interimResults = false;
                recognitionRef.current.maxAlternatives = 1;
            }
        }
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

            // Slight randomization to make it feel more natural? Maybe later.
            utterance.rate = 1.1; // Slightly faster for fluidity
            utterance.pitch = 1.0;

            setState("speaking");

            utterance.onend = () => {
                setState("idle");
                resolve();
            };

            utterance.onerror = (e) => {
                console.error("Speech synthesis error", e);
                setState("idle"); // reset on error
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
