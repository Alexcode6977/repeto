import { useState, useEffect, useCallback, useRef } from "react";
import { Emotion, segmentText, isVoiceCommand, applyPhoneticCorrections } from "../speech-utils";

// Types for Web Speech API which might be missing in some environments
interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
}

export type SpeechState = "idle" | "speaking" | "listening" | "error";

export interface UseSpeechReturn {
    isListening: boolean;
    transcript: string;
    listeningError: string | null;
    listen: (estimatedDurationMs?: number) => Promise<string>;
    stop: () => void;
    speak: (text: string, voice?: SpeechSynthesisVoice) => Promise<void>;
    pause: () => void;
    resume: () => void;
    voices: SpeechSynthesisVoice[];
    state: SpeechState;
    initializeAudio: () => Promise<void>;
    isSupported: boolean;
}

export function useSpeech(): UseSpeechReturn {
    const [state, setState] = useState<SpeechState>("idle");
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [transcript, setTranscript] = useState("");

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const cancelledRef = useRef<boolean>(false);  // Track if speech was cancelled

    // Initialize Speech capabilities
    useEffect(() => {
        if (typeof window !== "undefined") {
            synthRef.current = window.speechSynthesis;

            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();

                // Filter to French voices only (all variants: FR, CA, BE, CH)
                const frenchVoices = availableVoices.filter(v =>
                    v.lang.startsWith("fr") &&
                    !v.name.toLowerCase().includes("compact") &&
                    !v.name.toLowerCase().includes("espeak")
                );

                // Deduplicate based on name + lang
                const uniqueVoicesMap = new Map();
                frenchVoices.forEach(voice => {
                    const key = `${voice.name}-${voice.lang}`;
                    if (!uniqueVoicesMap.has(key)) {
                        uniqueVoicesMap.set(key, voice);
                    }
                });

                // Sort: Premium > Google/Siri > Others
                // Also prioritize enhanced/premium voices
                const uniqueVoices = Array.from(uniqueVoicesMap.values()).sort((a, b) => {
                    const scoreVoice = (v: SpeechSynthesisVoice): number => {
                        let score = 0;
                        const name = v.name.toLowerCase();

                        // Highest quality indicators
                        if (name.includes("premium") || name.includes("enhanced")) score += 100;
                        if (name.includes("neural") || name.includes("wavenet")) score += 90;
                        if (name.includes("google")) score += 50;
                        if (name.includes("siri")) score += 40;
                        if (name.includes("microsoft")) score += 30;

                        // Prefer fr-FR over other variants for standard French
                        if (v.lang === "fr-FR") score += 10;

                        // Named voices (like "Thomas", "Amelie") are usually better
                        const namedVoices = ["thomas", "amelie", "amélie", "audrey", "aurélie", "aurelie"];
                        if (namedVoices.some(n => name.includes(n))) score += 20;

                        return score;
                    };

                    return scoreVoice(b) - scoreVoice(a);
                });

                // If no French voices, fall back to all voices
                const finalVoices = uniqueVoices.length > 0 ? uniqueVoices : Array.from(availableVoices);

                if (finalVoices.length > 0) {
                    console.log(`[Speech] Loaded ${finalVoices.length} French voices:`, finalVoices.map(v => v.name).join(", "));
                    setVoices(finalVoices);
                }
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

    /**
     * Enhanced speak function with natural prosody
     * - Segments text into sentences for natural pauses
     * - Detects emotional tone and adjusts pitch/rate
     * - Adds micro-pauses at punctuation
     */
    const speak = useCallback((text: string, voice?: SpeechSynthesisVoice): Promise<void> => {
        return new Promise(async (resolve) => {
            if (!synthRef.current) {
                resolve();
                return;
            }

            // Cancel any ongoing speech and reset cancelled flag
            synthRef.current.cancel();
            cancelledRef.current = false;
            setState("speaking");

            // Split text into segments for more natural delivery
            // We'll speak each segment with appropriate pauses
            const segments = segmentText(text);

            for (let i = 0; i < segments.length; i++) {
                // Check if cancelled before each segment
                if (cancelledRef.current) break;

                const segment = segments[i];
                if (!segment.text.trim()) continue;

                // Explicitly cancel previous segment to avoid iOS "stacking" or speed artifacts
                synthRef.current?.cancel();

                await speakSegment(segment.text, voice, segment.emotion);

                // Natural pause between segments (sentences)
                if (i < segments.length - 1 && !cancelledRef.current) {
                    await pause(segment.pauseAfter);
                }
            }

            setState("idle");
            resolve();
        });
    }, []);


    /**
     * Speak a single segment with emotion-based prosody
     */
    const speakSegment = (text: string, voice?: SpeechSynthesisVoice, emotion: Emotion = 'neutral'): Promise<void> => {
        return new Promise((resolve) => {
            if (!synthRef.current) {
                resolve();
                return;
            }

            // == PRONUNCIATION IMPROVEMENTS ==
            // Apply phonetic corrections for better theatrical French
            let processedText = applyPhoneticCorrections(text);

            // Clean text - remove punctuation that TTS might read aloud
            // Keep apostrophes (important for French contractions like "l'homme")
            const cleanedText = processedText
                .replace(/\.\.\./g, '')      // Remove ellipsis
                .replace(/[.!?;:,]/g, '')    // Remove sentence-ending punctuation
                .replace(/[«»""]/g, '')      // Remove quotes
                .replace(/[-–—]/g, ' ')      // Replace dashes with spaces for natural pauses
                .replace(/\s+/g, ' ')         // Normalize spaces
                .trim();

            if (!cleanedText) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(cleanedText);
            utterance.lang = "fr-FR";
            if (voice) utterance.voice = voice;

            // Base prosody settings by emotion - optimized for theatrical delivery
            let pitch = 1.0;
            let rate = 1.0;
            let volume = 1.0;

            switch (emotion) {
                case 'question':
                    pitch = 1.1 + (Math.random() * 0.05);
                    rate = 0.92;
                    break;

                case 'exclamation':
                    pitch = 1.1 + (Math.random() * 0.05);
                    rate = 0.95 + (Math.random() * 0.05);
                    break;

                case 'anger':
                    pitch = 0.85 + (Math.random() * 0.05);
                    rate = 1.05 + (Math.random() * 0.05); // Less extreme
                    break;

                case 'joy':
                    pitch = 1.15 + (Math.random() * 0.05);
                    rate = 0.98 + (Math.random() * 0.05);
                    break;

                case 'hesitation':
                    pitch = 0.95;
                    rate = 0.75 + (Math.random() * 0.05);
                    break;

                case 'sadness':
                    pitch = 0.85;
                    rate = 0.8 + (Math.random() * 0.05);
                    break;

                case 'fear':
                    pitch = 1.1 + (Math.random() * 0.05);
                    rate = 1.05 + (Math.random() * 0.05);
                    break;

                case 'irony':
                    pitch = 1.0;
                    rate = 0.85;
                    break;

                case 'tenderness':
                    pitch = 1.05;
                    rate = 0.85;
                    volume = 0.9;
                    break;

                default:
                    pitch = 1.0;
                    rate = 0.9; // Stable normalized rate
            }

            utterance.pitch = pitch;
            utterance.rate = rate;
            utterance.volume = volume;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
                if (e.error === 'interrupted' || e.error === 'canceled') {
                    resolve();
                    return;
                }
                console.error("Speech synthesis error", e);
                resolve();
            };

            synthRef.current.speak(utterance);
        });
    };

    /**
     * Simple pause utility
     */
    const pause = (ms: number): Promise<void> => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    /**
     * Listen for speech with dynamic silence timeout based on expected line duration
     * @param estimatedDurationMs - Expected duration to speak the line (calculated from text length)
     */
    // Track active recognition promise to prevent double-starts and race conditions
    const activeRecognitionRef = useRef<{ resolve: (s: string) => void; reject: (r: any) => void } | null>(null);

    const listen = useCallback((estimatedDurationMs?: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (typeof window === "undefined" || !recognitionRef.current) {
                reject("Speech recognition not supported");
                return;
            }

            // ATOMICITY: Force stop any existing recognition session
            if (activeRecognitionRef.current) {
                console.log("[Speech] Interrupting previous recognition session");
                const old = activeRecognitionRef.current;
                activeRecognitionRef.current = null;
                try { recognitionRef.current.abort(); } catch (e) { }
                old.reject("Interrupted");
            }

            activeRecognitionRef.current = { resolve, reject };
            setTranscript("");
            setState("listening");

            let finalTranscript = "";
            let interimTranscript = "";
            let silenceTimeout: NodeJS.Timeout | null = null;

            // Dynamic silence delay based on expected duration
            // TUNED FOR iOS: Shorter base silence (1.8s) for snappier feedback
            // Mobile users expect faster response.
            const baseSilence = 1800;
            const proportionalTime = estimatedDurationMs
                ? Math.min(Math.max(estimatedDurationMs * 0.4, 0), 1200)
                : 800;
            const SILENCE_DELAY = baseSilence + proportionalTime;


            // Enable continuous mode and interim results for longer utterances
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            const finalizeRecognition = (result: string) => {
                if (silenceTimeout) clearTimeout(silenceTimeout);
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Already stopped
                }
                if (activeRecognitionRef.current) {
                    const r = activeRecognitionRef.current;
                    activeRecognitionRef.current = null;
                    r.resolve(result);
                }
            };

            const resetSilenceTimer = () => {
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                }
                silenceTimeout = setTimeout(() => {
                    // User has stopped speaking for SILENCE_DELAY ms
                    // Finalize with whatever we have
                    const result = (finalTranscript + " " + interimTranscript).trim();
                    finalizeRecognition(result);
                }, SILENCE_DELAY);
            };

            recognitionRef.current.onresult = (event: any) => {
                // Process all results
                let interim = "";
                let final = "";

                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        final += result[0].transcript + " ";
                    } else {
                        interim += result[0].transcript + " ";
                    }
                }

                finalTranscript = final.trim();
                interimTranscript = interim.trim();

                // Update visible transcript with both final and interim
                const combinedTranscript = (finalTranscript + " " + interimTranscript).trim();
                setTranscript(combinedTranscript);

                // Check for quick commands - finalize immediately without waiting for silence
                if (isVoiceCommand(combinedTranscript)) {
                    console.log("[Speech] Quick command detected:", combinedTranscript);
                    finalizeRecognition(combinedTranscript);
                    return;
                }

                // Reset silence timer for normal speech
                resetSilenceTimer();
            };

            recognitionRef.current.onerror = (event: any) => {
                if (silenceTimeout) clearTimeout(silenceTimeout);

                // Special handling for common errors
                if (event.error === 'no-speech') {
                    console.warn("[Speech] No speech detected (silence timeout)");
                    // We don't necessarily want to treat silence as a hard error that breaks the state machine
                    // but we do need to signal it.
                    // Resolve with current transcript if no speech, rather than rejecting
                    if (activeRecognitionRef.current) {
                        const r = activeRecognitionRef.current;
                        activeRecognitionRef.current = null;
                        r.resolve(finalTranscript.trim() || interimTranscript.trim() || "");
                    }
                    return;
                }

                // "aborted" means we stopped it manually
                if (event.error === "aborted") {
                    if (cancelledRef.current) {
                        if (activeRecognitionRef.current) {
                            const r = activeRecognitionRef.current;
                            activeRecognitionRef.current = null;
                            r.reject("Cancelled");
                        }
                        return;
                    }
                    // If not cancelled, treat as a normal end with current transcript
                    if (activeRecognitionRef.current) {
                        const r = activeRecognitionRef.current;
                        activeRecognitionRef.current = null;
                        r.resolve(finalTranscript.trim() || interimTranscript.trim() || "");
                    }
                    return;
                }

                console.error("Speech recognition error", event.error);
                setState("error");
                if (activeRecognitionRef.current) {
                    const r = activeRecognitionRef.current;
                    activeRecognitionRef.current = null;
                    r.reject(event.error);
                }
            };

            recognitionRef.current.onend = () => {
                if (silenceTimeout) clearTimeout(silenceTimeout);
                setState("idle");

                if (cancelledRef.current) {
                    if (activeRecognitionRef.current) {
                        const r = activeRecognitionRef.current;
                        activeRecognitionRef.current = null;
                        r.reject("Cancelled");
                    }
                    return;
                }

                // Recognition ended - return what we have (may be empty)
                const result = (finalTranscript + " " + interimTranscript).trim();

                if (activeRecognitionRef.current) {
                    const r = activeRecognitionRef.current;
                    activeRecognitionRef.current = null;
                    r.resolve(result);
                }
            };

            try {
                cancelledRef.current = false; // Reset cancellation state
                recognitionRef.current.start();
                // Start the initial silence timer
                resetSilenceTimer();
            } catch (e) {
                if (silenceTimeout) clearTimeout(silenceTimeout);
                // Sometimes it's already started
                try {
                    recognitionRef.current.stop();
                } catch (e2) { /* ignore */ }
                setTimeout(() => {
                    try {
                        recognitionRef.current.start();
                        resetSilenceTimer();
                    } catch (e3) {
                        reject("Failed to start recognition");
                    }
                }, 100);
            }
        });
    }, []);

    const stop = useCallback(() => {
        cancelledRef.current = true;  // Signal to stop the loop

        // Cancel TTS
        if (synthRef.current) {
            try {
                synthRef.current.cancel();
                // Safari Hack: sometimes cancel() doesn't clear the queue on iOS
                // Speaking an empty string and canceling again can force-clear it.
                const dummy = new SpeechSynthesisUtterance("");
                dummy.volume = 0;
                synthRef.current.speak(dummy);
                synthRef.current.cancel();
            } catch (e) {
                // Ignore errors on cancel
            }
        }

        // Stop recognition with error handling (mobile can throw if not started)
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();  // abort is more reliable than stop on mobile
            } catch (e) {
                try {
                    recognitionRef.current.stop();
                } catch (e2) {
                    // Ignore - recognition wasn't running
                }
            }
        }

        setState("idle");
    }, []);

    // Safari requires SpeechRecognition to be started within a user gesture handler (click).
    const initializeAudio = useCallback(async () => {
        try {
            // 1. Get Mic Permission
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Warmup Speech Recognition
            if (recognitionRef.current) {
                // Clear listeners
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;

                await new Promise<void>((resolve) => {
                    const onEnd = () => resolve();
                    if (recognitionRef.current) {
                        recognitionRef.current.onend = onEnd;
                        try {
                            recognitionRef.current.start();
                            setTimeout(() => {
                                recognitionRef.current?.stop();
                            }, 50);
                        } catch (e) {
                            console.warn("Recognition warmup failed", e);
                            resolve();
                        }
                    } else {
                        resolve();
                    }
                });
            }
        } catch (e) {
            console.error("Audio initialization failed", e);
            throw e;
        }
    }, []);

    return {
        isListening: state === "listening",
        transcript,
        listeningError: state === "error" ? "Speech recognition error" : null,
        listen,
        stop,
        speak,
        pause: () => window.speechSynthesis.pause(),
        resume: () => window.speechSynthesis.resume(),
        voices,
        state,
        initializeAudio,
        isSupported: typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    };
}
