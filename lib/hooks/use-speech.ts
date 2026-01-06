import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Emotion, segmentText, isVoiceCommand, applyPhoneticCorrections } from "../speech-utils";
import { calculateSimilarity } from "../similarity";

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
    listen: (estimatedDurationMs?: number, expectedText?: string) => Promise<string>;
    stop: () => void;
    speak: (text: string, voice?: SpeechSynthesisVoice) => Promise<void>;
    pause: () => void;
    resume: () => void;
    voices: SpeechSynthesisVoice[];
    state: SpeechState;
    initializeAudio: (forceOutput?: boolean, skipWarmup?: boolean) => Promise<void>;
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
                recognitionRef.current.continuous = false; // We manage restarts manually if needed
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

                await speakSegment(segment.text, voice, segment.emotion);

                // SAFE_BUFFER_DELAY: Small pause to allow audio hardware to "breathe" 
                // between buffers, preventing word truncation on mobile/Bluetooth.
                await pause(80);

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

            // SAFETY WATCHDOG: Safari battery-saving mode sometimes fails to fire 'onend'.
            // For theatrical lines, we estimate duration + 3s buffer to force-advance.
            const estimatedMs = (text.length * 100) + 3000;
            const watchdog = setTimeout(() => {
                console.warn("[Speech] Watchdog triggered for segment:", text.substring(0, 30));
                cleanup();
                resolve();
            }, estimatedMs);

            const cleanup = () => {
                clearTimeout(watchdog);
            };

            // == PRONUNCIATION IMPROVEMENTS ==
            // Apply phonetic corrections for better theatrical French
            let processedText = applyPhoneticCorrections(text);

            // Keep apostrophes (important for French contractions like "l'homme")
            // Preserve the padding marker if present
            const paddingMarker = " . ";
            const hasPadding = processedText.endsWith(paddingMarker);

            let cleanedText = processedText
                .replace(/\.\.\./g, '')      // Remove ellipsis
                .replace(/[.!?;:,]/g, '')    // Remove sentence-ending punctuation
                .replace(/[«»""]/g, '')      // Remove quotes
                .replace(/[-–—]/g, ' ')      // Replace dashes with spaces for natural pauses
                .replace(/\s+/g, ' ')         // Normalize spaces
                .trim();

            if (hasPadding) {
                cleanedText += paddingMarker;
            }

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

            utterance.pitch = pitch;
            utterance.rate = rate;
            utterance.volume = volume;

            utterance.onend = () => {
                cleanup();
                resolve();
            };
            utterance.onerror = (e) => {
                cleanup();
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
     * @param expectedText - The text we are expecting the user to say (for Early Exit)
     */
    // Track active recognition promise to prevent double-starts and race conditions
    const activeRecognitionRef = useRef<{ resolve: (s: string) => void; reject: (r: any) => void } | null>(null);

    const listen = useCallback((estimatedDurationMs?: number, expectedText?: string): Promise<string> => {
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
            let lastSpeechTime = Date.now();

            // TUNING:
            // 1. "Speech Silence" (Wait for end of utterance) -> Snappy (1.2s base)
            // 2. "Initial Silence" (Wait for user to start) -> Generous (5s) to allow reading/thinking.
            // 3. DRAMATIC PAUSES: If text contains '...', '!', '?', or ';', we allow more silence (2.5s)
            let baseSilence = 1200;
            if (expectedText && /[!?;:…]|\.\.\./.test(expectedText)) {
                console.log("[Speech] Dramatic line detected, increasing silence timeout");
                baseSilence = 2500;
            }
            const proportionalTime = estimatedDurationMs
                ? Math.min(Math.max(estimatedDurationMs * 0.2, 0), 1200)
                : 500;
            const END_SPEECH_SILENCE_DELAY = baseSilence + proportionalTime;
            const INITIAL_SILENCE_DELAY = 5000; // 5 seconds to start speaking

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

            const resetSilenceTimer = (hasSpeechStarted: boolean) => {
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                }

                const delay = hasSpeechStarted ? END_SPEECH_SILENCE_DELAY : INITIAL_SILENCE_DELAY;

                silenceTimeout = setTimeout(() => {
                    // Timeout reached
                    if (!hasSpeechStarted) {
                        console.warn("[Speech] Initial silence timeout - No speech detected");
                    } else {
                        console.log("[Speech] End of speech silence timeout");
                    }
                    const result = (finalTranscript + " " + interimTranscript).trim();
                    finalizeRecognition(result);
                }, delay);
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

                // Update visible transcript
                const combinedTranscript = (finalTranscript + " " + interimTranscript).trim();
                setTranscript(combinedTranscript);

                // --- EARLY EXIT CHECK ---
                // If we know what to expect, check if we have a match already.
                if (expectedText && combinedTranscript.length > 5) {
                    const similarity = calculateSimilarity(combinedTranscript, expectedText);
                    // 95% similarity prevents premature cut-off (user request)
                    if (similarity > 0.95) {
                        console.log("[Speech] Early Exit triggered! Match:", similarity.toFixed(2));
                        finalizeRecognition(combinedTranscript);
                        return;
                    }

                    // Also check for "End of line" match - sometimes user says more, but let's check if the END of what they said matches
                    // OR if the START matches perfectly (and maybe they are adding ad-libs, but we can accept it)
                }

                // Check for quick commands
                if (isVoiceCommand(combinedTranscript)) {
                    console.log("[Speech] Quick command detected:", combinedTranscript);
                    finalizeRecognition(combinedTranscript);
                    return;
                }

                // Reset silence timer - switch to "End Speech" mode since we have input
                const hasInput = combinedTranscript.length > 0;
                resetSilenceTimer(hasInput);
            };

            recognitionRef.current.onerror = (event: any) => {
                if (silenceTimeout) clearTimeout(silenceTimeout);

                // Special handling for common errors
                if (event.error === 'no-speech') {
                    console.warn("[Speech] No speech detected (silence timeout)");
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
                    // If not cancelled, treat as a normal end
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

                const result = (finalTranscript + " " + interimTranscript).trim();
                // Check if we should wait a bit more? No, real "End" event from engine means it's done.

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
                resetSilenceTimer(false);
            } catch (e) {
                if (silenceTimeout) clearTimeout(silenceTimeout);
                // Sometimes it's already started
                try {
                    recognitionRef.current.stop();
                } catch (e2) { /* ignore */ }
                setTimeout(() => {
                    try {
                        recognitionRef.current.start();
                        resetSilenceTimer(false);
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
                const dummy = new SpeechSynthesisUtterance("");
                dummy.volume = 0;
                synthRef.current.speak(dummy);
                synthRef.current.cancel();
            } catch (e) {
            }
        }

        // Stop recognition
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) {
                try {
                    recognitionRef.current.stop();
                } catch (e2) { }
            }
        }

        setState("idle");
    }, []);

    // Safari requires SpeechRecognition to be started within a user gesture handler (click).
    const initializeAudio = useCallback(async (forceOutput = false, skipWarmup = false) => {
        try {
            // EXPERIMENTAL: Force Audio Output (CarPlay / iPad fix)
            // iOS often switches to "Phone Receiver" when mic is active if no audio is playing.
            // We play a silent oscillator AND a silent Audio element to force the "Media" audio session.
            if (forceOutput || true) { // Always warm up on iPad/Mobile
                console.log("[Speech] Audio Warmup: Activating silent oscillator & dummy media");

                // 1. Silent Oscillator (Low Level)
                const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    const ctx = new AudioContextClass();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(20, ctx.currentTime);
                    gain.gain.setValueAtTime(0.001, ctx.currentTime);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    (window as any).__keepAliveAudio = { ctx, osc, gain };
                }

                // 2. Dummy Audio Element (High Level - needed for OpenAI / External voices)
                // This unlocks the "Media" route on iPad/iOS
                const dummyAudio = new Audio();
                dummyAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
                dummyAudio.play().catch(() => { });
                (window as any).__dummyAudio = dummyAudio;
            }

            // 1. Get Mic Permission
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Warmup Speech Recognition (silent start/stop)
            // SKIP if we are about to start listening immediately to avoid race conditions
            if (!skipWarmup && recognitionRef.current) {
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

    return useMemo(() => ({
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
    }), [state, transcript, listen, stop, speak, voices, initializeAudio]);
}
