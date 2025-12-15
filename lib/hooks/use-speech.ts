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

    type Emotion = 'neutral' | 'question' | 'exclamation' | 'hesitation' | 'anger' | 'sadness' | 'joy' | 'fear' | 'irony' | 'tenderness';

    /**
     * Detect the emotional tone of a text segment
     * Enhanced with theatrical French vocabulary
     */
    const detectEmotion = (text: string): Emotion => {
        const lower = text.toLowerCase();

        // Multiple exclamations or caps = strong emotion (anger/urgency)
        if ((text.match(/!/g) || []).length >= 2) return 'anger';
        if (text === text.toUpperCase() && text.length > 10) return 'anger';

        // Ellipsis = hesitation or sadness
        if (text.includes('...')) return 'hesitation';

        // Question marks
        if (text.includes('?')) {
            // Rhetorical/ironic questions
            const ironicPatterns = ['vraiment', 'sérieusement', 'vous croyez', 'tu crois', 'n\'est-ce pas'];
            if (ironicPatterns.some(p => lower.includes(p))) return 'irony';
            return 'question';
        }

        // Joy/happiness words (expanded list)
        const joyWords = [
            'magnifique', 'merveilleux', 'excellent', 'bravo', 'parfait', 'génial', 'super', 'hourra', 'vive',
            'bonheur', 'heureux', 'heureuse', 'joie', 'ravir', 'ravi', 'ravie', 'enchanter', 'enchanté',
            'formidable', 'splendide', 'sublime', 'divin', 'adorable', 'chéri', 'chérie', 'amour',
            'victoire', 'triomphe', 'succès', 'miracle', 'prodige', 'merci'
        ];
        if (joyWords.some(w => lower.includes(w))) return 'joy';

        // Anger/frustration words (expanded)
        const angerWords = [
            'malheur', 'diable', 'damnation', 'sacrebleu', 'morbleu', 'tonnerre', 'idiot', 'imbécile',
            'fureur', 'rage', 'colère', 'déteste', 'haïr', 'haine', 'maudit', 'maudite', 'enfer',
            'scélérat', 'traître', 'misérable', 'infâme', 'monstre', 'démon', 'canaille',
            'insolent', 'impertinent', 'assez', 'taisez', 'silence', 'sortez', 'dehors'
        ];
        if (angerWords.some(w => lower.includes(w))) return 'anger';

        // Sadness words (expanded)
        const sadWords = [
            'hélas', 'malheur', 'triste', 'mort', 'perdu', 'adieu', 'jamais plus',
            'larmes', 'pleurer', 'sanglot', 'douleur', 'souffrir', 'souffrance', 'peine',
            'abandonner', 'abandonné', 'seul', 'seule', 'solitude', 'désespoir',
            'mourir', 'fin', 'perdu', 'perdre', 'regret', 'regretter'
        ];
        if (sadWords.some(w => lower.includes(w))) return 'sadness';

        // Fear words
        const fearWords = [
            'peur', 'effroi', 'terreur', 'trembler', 'frémir', 'épouvante',
            'au secours', 'à l\'aide', 'sauvez', 'fuyez', 'danger', 'menace',
            'horreur', 'horrible', 'affreux', 'effrayant', 'terrifiant'
        ];
        if (fearWords.some(w => lower.includes(w))) return 'fear';

        // Tenderness/love words
        const tendernessWords = [
            'mon coeur', 'ma chère', 'mon cher', 'mon amour', 'ma douce', 'tendresse',
            'caresse', 'embrasser', 'baiser', 'doux', 'douce', 'gentle', 'cher ami'
        ];
        if (tendernessWords.some(w => lower.includes(w))) return 'tenderness';

        // Irony/sarcasm indicators
        const ironyWords = ['certes', 'évidemment', 'bien sûr', 'naturellement', 'sans doute'];
        if (ironyWords.some(w => lower.includes(w)) && text.includes('!')) return 'irony';

        // Exclamation without specific emotion
        if (text.includes('!')) return 'exclamation';

        return 'neutral';
    };

    /**
     * Calculate pause duration after a segment (in ms)
     * Adds natural variation and context-awareness
     */
    const calculatePause = (text: string): number => {
        // Base pause with random variation for natural rhythm
        const vary = (base: number, variance: number) => base + Math.random() * variance;

        // Very long pause after ellipsis (dramatic effect)
        if (text.includes('...')) return vary(550, 150);

        // Multiple punctuation = dramatic (!! or ?!)
        if (/[!?]{2,}/.test(text)) return vary(500, 100);

        // Question - thinking pause
        if (text.endsWith('?')) return vary(380, 80);

        // Exclamation - quick dramatic beat
        if (text.endsWith('!')) return vary(350, 100);

        // Semi-colon = breath pause
        if (text.endsWith(';')) return vary(280, 60);

        // Colon = anticipation pause
        if (text.endsWith(':')) return vary(320, 80);

        // Standard sentence end
        if (text.endsWith('.')) return vary(320, 80);

        // Short text = quick transition
        if (text.length < 30) return vary(180, 60);

        // Long text = needs processing time
        if (text.length > 100) return vary(400, 100);

        return vary(250, 80);
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

            // Base prosody settings by emotion - optimized for theatrical delivery
            let pitch = 1.0;
            let rate = 1.0;
            let volume = 1.0;

            switch (emotion) {
                case 'question':
                    pitch = 1.12 + (Math.random() * 0.06);  // Rising intonation with variation
                    rate = 0.92;   // Slightly slower for clarity
                    break;

                case 'exclamation':
                    pitch = 1.08 + (Math.random() * 0.08);
                    rate = 1.05 + (Math.random() * 0.1);
                    volume = 1.0;
                    break;

                case 'anger':
                    pitch = 0.85 + (Math.random() * 0.1);   // Lower, more intense
                    rate = 1.15 + (Math.random() * 0.15);   // Fast and aggressive
                    volume = 1.0;
                    break;

                case 'joy':
                    pitch = 1.18 + (Math.random() * 0.1);   // Higher, brighter, varied
                    rate = 1.05 + (Math.random() * 0.1);
                    break;

                case 'hesitation':
                    pitch = 0.95 + (Math.random() * 0.05);
                    rate = 0.75 + (Math.random() * 0.1);    // Very slow, uncertain
                    break;

                case 'sadness':
                    pitch = 0.82 + (Math.random() * 0.06);  // Lower, somber
                    rate = 0.78 + (Math.random() * 0.08);   // Slow, heavy
                    break;

                case 'fear':
                    pitch = 1.1 + (Math.random() * 0.15);   // Higher, tense
                    rate = 1.1 + (Math.random() * 0.2);     // Fast, breathless
                    break;

                case 'irony':
                    pitch = 1.0 + (Math.random() * 0.1 - 0.05);
                    rate = 0.88;   // Deliberate, measured
                    break;

                case 'tenderness':
                    pitch = 1.05 + (Math.random() * 0.08);  // Soft, warm
                    rate = 0.85 + (Math.random() * 0.05);   // Slow, gentle
                    volume = 0.9;  // Slightly softer
                    break;

                default:
                    // Neutral - varied for natural feel
                    pitch = 0.98 + (Math.random() * 0.1);
                    rate = 0.92 + (Math.random() * 0.12);
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

            let finalTranscript = "";
            let interimTranscript = "";
            let silenceTimeout: NodeJS.Timeout | null = null;
            const SILENCE_DELAY = 2500; // 2.5 seconds of silence before finalizing

            // Enable continuous mode and interim results for longer utterances
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            const resetSilenceTimer = () => {
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                }
                silenceTimeout = setTimeout(() => {
                    // User has stopped speaking for SILENCE_DELAY ms
                    // Finalize with whatever we have
                    try {
                        recognitionRef.current.stop();
                    } catch (e) {
                        // Already stopped
                    }
                    const result = (finalTranscript + " " + interimTranscript).trim();
                    if (result) {
                        resolve(result);
                    }
                }, SILENCE_DELAY);
            };

            recognitionRef.current.onresult = (event: any) => {
                // Reset silence timer on any result
                resetSilenceTimer();

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
            };

            recognitionRef.current.onerror = (event: any) => {
                if (silenceTimeout) clearTimeout(silenceTimeout);

                // "no-speech" is not really an error, just no input detected
                if (event.error === "no-speech") {
                    resolve(finalTranscript.trim() || interimTranscript.trim() || "");
                    return;
                }

                // "aborted" means we stopped it manually
                if (event.error === "aborted") {
                    resolve(finalTranscript.trim() || interimTranscript.trim() || "");
                    return;
                }

                console.error("Speech recognition error", event.error);
                setState("error");
                reject(event.error);
            };

            recognitionRef.current.onend = () => {
                if (silenceTimeout) clearTimeout(silenceTimeout);
                // Recognition ended - return what we have
                const result = (finalTranscript + " " + interimTranscript).trim();
                if (result) {
                    resolve(result);
                }
                // If empty, the silence timeout would have already resolved or it will timeout
            };

            try {
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
