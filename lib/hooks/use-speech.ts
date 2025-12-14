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
                if (cancelledRef.current) {
                    break;
                }

                const segment = segments[i];
                if (!segment.text.trim()) continue;

                await speakSegment(segment.text, voice, segment.emotion);

                // Check if cancelled after speaking
                if (cancelledRef.current) {
                    break;
                }

                // Natural pause between segments (sentences)
                if (i < segments.length - 1) {
                    await pause(segment.pauseAfter);
                }
            }

            setState("idle");
            resolve();
        });
    }, []);

    /**
     * Segment text into natural chunks with emotion detection
     */
    const segmentText = (text: string): { text: string; emotion: Emotion; pauseAfter: number }[] => {
        // Split on sentence-ending punctuation while keeping the punctuation
        const rawSegments = text.split(/(?<=[.!?;])\s+/).filter(s => s.trim());

        return rawSegments.map(segment => {
            const emotion = detectEmotion(segment);
            const pauseAfter = calculatePause(segment);
            return { text: segment, emotion, pauseAfter };
        });
    };

    type Emotion = 'neutral' | 'question' | 'exclamation' | 'hesitation' | 'anger' | 'sadness' | 'joy';

    /**
     * Detect the emotional tone of a text segment
     */
    const detectEmotion = (text: string): Emotion => {
        const lower = text.toLowerCase();

        // Multiple exclamations = strong emotion
        if ((text.match(/!/g) || []).length >= 2) return 'anger';

        // Ellipsis = hesitation or sadness
        if (text.includes('...')) return 'hesitation';

        // Question
        if (text.includes('?')) return 'question';

        // Single exclamation - check for joy vs neutral exclamation
        if (text.includes('!')) {
            const joyWords = ['magnifique', 'merveilleux', 'excellent', 'bravo', 'parfait', 'génial', 'super', 'hourra', 'vive'];
            const angerWords = ['malheur', 'diable', 'damnation', 'sacrebleu', 'morbleu', 'tonnerre', 'idiot', 'imbécile'];

            if (joyWords.some(w => lower.includes(w))) return 'joy';
            if (angerWords.some(w => lower.includes(w))) return 'anger';
            return 'exclamation';
        }

        // Sad words
        const sadWords = ['hélas', 'malheur', 'triste', 'mort', 'perdu', 'adieu', 'jamais plus'];
        if (sadWords.some(w => lower.includes(w))) return 'sadness';

        return 'neutral';
    };

    /**
     * Calculate pause duration after a segment (in ms)
     */
    const calculatePause = (text: string): number => {
        // Longer pause after questions and exclamations
        if (text.endsWith('?') || text.endsWith('!')) return 400;

        // Very long pause after ellipsis (dramatic effect)
        if (text.includes('...')) return 600;

        // Semi-colon = medium pause
        if (text.endsWith(';')) return 300;

        // Standard sentence end
        if (text.endsWith('.')) return 350;

        return 200;
    };

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
            let processedText = text;

            // Numbers to words (TTS often mispronounces)
            processedText = processedText
                .replace(/\b1\b/g, 'un')
                .replace(/\b2\b/g, 'deux')
                .replace(/\b3\b/g, 'trois')
                .replace(/\b4\b/g, 'quatre')
                .replace(/\b5\b/g, 'cinq')
                .replace(/\b10\b/g, 'dix')
                .replace(/\b100\b/g, 'cent')
                .replace(/\b1000\b/g, 'mille');

            // Classical French spelling -> modern pronunciation hints
            // These help TTS pronounce archaic spellings correctly
            processedText = processedText
                .replace(/\bMr\b/gi, 'Monsieur')
                .replace(/\bMme\b/gi, 'Madame')
                .replace(/\bMlle\b/gi, 'Mademoiselle')
                .replace(/\bM\.\s/g, 'Monsieur ')
                .replace(/\bSt\-/gi, 'Saint-')
                .replace(/\bSte\-/gi, 'Sainte-');

            // Theatrical exclamations - add emphasis hint
            processedText = processedText
                .replace(/\bHélas\b/gi, 'Hélàs')         // Emphasize the à
                .replace(/\bMorbleu\b/gi, 'Morbleû')     // Emphasize
                .replace(/\bPalsambleu\b/gi, 'Palsembleû')
                .replace(/\bParbleu\b/gi, 'Parbleû');

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

            // Base prosody settings by emotion
            let pitch = 1.0;
            let rate = 1.0;
            let volume = 1.0;

            switch (emotion) {
                case 'question':
                    pitch = 1.15;  // Rising intonation
                    rate = 0.95;   // Slightly slower
                    break;
                case 'exclamation':
                    pitch = 1.1;
                    rate = 1.1;
                    volume = 1.0;
                    break;
                case 'anger':
                    pitch = 0.9;   // Lower, more intense
                    rate = 1.2;    // Faster
                    volume = 1.0;
                    break;
                case 'joy':
                    pitch = 1.2;   // Higher, brighter
                    rate = 1.1;
                    break;
                case 'hesitation':
                    pitch = 0.95;
                    rate = 0.8;    // Much slower
                    break;
                case 'sadness':
                    pitch = 0.85;  // Lower
                    rate = 0.85;   // Slower
                    break;
                default:
                    // Neutral - slight variance for natural feel
                    pitch = 1.0 + (Math.random() * 0.1 - 0.05);
                    rate = 0.95 + (Math.random() * 0.1);
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
        cancelledRef.current = true;  // Signal to stop the loop

        // Cancel TTS
        if (synthRef.current) {
            try {
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
