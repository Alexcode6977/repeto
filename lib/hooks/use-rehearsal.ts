import { useState, useEffect, useRef } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useSpeech } from "./use-speech";
import { useOpenAITTS } from "./use-openai-tts";
import { calculateSimilarity } from "../similarity";

export type RehearsalStatus =
    | "setup"
    | "playing_other"
    | "listening_user"
    | "evaluating"
    | "waiting_feedback"
    | "error"
    | "paused"
    | "finished";

export type TTSProvider = "browser" | "openai";
export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface UseRehearsalProps {
    script: ParsedScript;
    userCharacters: string[];
    similarityThreshold?: number;
    initialLineIndex?: number;
    mode?: "full" | "cue" | "check";
    ttsProvider?: TTSProvider;
    openaiVoiceAssignments?: Record<string, OpenAIVoice>;
    skipCharacters?: string[]; // Characters to skip during rehearsal (e.g., ["DIDASCALIES"])
    playId?: string;
}

import { useRehearsalVoices } from "./use-rehearsal-voices";
import { isNextCommand, isPrevCommand } from "../speech-utils";
import { getPlayRecordings } from "../actions/recordings";

export function useRehearsal({ script, userCharacters, similarityThreshold = 0.85, initialLineIndex = 0, mode = "full", ttsProvider = "browser", openaiVoiceAssignments = {}, skipCharacters = [], playId }: UseRehearsalProps) {
    const browserSpeech = useSpeech();
    const openaiSpeech = useOpenAITTS();
    const { voices, listen, stop: stopSpeech, state: speechState, initializeAudio, transcript } = browserSpeech;

    const [recordings, setRecordings] = useState<any[]>([]);
    const [isPlayingRecording, setIsPlayingRecording] = useState(false);

    // Fetch recordings if playId is provided
    useEffect(() => {
        if (playId) {
            getPlayRecordings(playId).then(setRecordings);
        }
    }, [playId]);

    // Use specialized voice hook
    const { voiceAssignments, setVoiceForRole } = useRehearsalVoices(script, voices);

    // Unified speak function that handles both providers AND custom recordings
    const speak = async (text: string, _voice?: SpeechSynthesisVoice, characterName?: string, lineId?: string): Promise<void> => {
        // Priority 1: User Recording
        const recording = recordings.find(r => r.line_id === lineId);
        if (recording) {
            console.log("[Rehearsal] Playing custom recording for line:", lineId);
            setIsPlayingRecording(true);
            return new Promise((resolve) => {
                const audio = new Audio(recording.audio_url);
                audio.onended = () => {
                    setIsPlayingRecording(false);
                    resolve();
                };
                audio.onerror = () => {
                    setIsPlayingRecording(false);
                    resolve();
                };
                audio.play();
            });
        }

        // Priority 2: OpenAI TTS
        if (ttsProvider === "openai") {
            const assignedVoice = characterName && openaiVoiceAssignments[characterName] ? openaiVoiceAssignments[characterName] : "nova";
            await openaiSpeech.speak(text, assignedVoice);
        }
        // Priority 3: Browser TTS
        else {
            await browserSpeech.speak(text, _voice);
        }
    };

    // Preload helper
    const preloadLine = (text: string, characterName: string) => {
        if (ttsProvider === "openai") {
            const voice = characterName && openaiVoiceAssignments[characterName] ? openaiVoiceAssignments[characterName] : "nova";
            openaiSpeech.preload(text, voice);
        }
    };

    // Combined stop function
    const stopAll = () => {
        browserSpeech.stop();
        openaiSpeech.stop();
    };

    // Helper for synthetic recording "bip" (important for iPad feedback)
    const playBip = () => {
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                const ctx = new AudioContextClass();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            }
        } catch (e) {
            console.warn("[Speech] Failed to play bip", e);
        }
    };

    const [currentLineIndex, setCurrentLineIndex] = useState(initialLineIndex);
    const [status, setStatus] = useState<RehearsalStatus>("setup");
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [lastTranscript, setLastTranscript] = useState("");

    // NEW: Retry counter to prevent infinite loops
    const [retryCount, setRetryCount] = useState(0);

    // Ref to track auto-play preventing stale closures
    const stateRef = useRef({ currentLineIndex, status, userCharacters });
    useEffect(() => {
        stateRef.current = { currentLineIndex, status, userCharacters };
    }, [currentLineIndex, status, userCharacters]);

    // Track mount status to prevent zombie execution loops
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            browserSpeech.stop();
            openaiSpeech.stop();
        };
    }, []);

    // Track if we're in a manual skip to prevent double-skip from useEffect
    const manualSkipRef = useRef(false);

    // Lock to prevent concurrent state transitions (bugs when clicking fast)
    const transitionLockRef = useRef(false);



    // Watch speech state to auto-advance when OTHER finishes speaking
    // REMOVED: The useEffect watching speechState was causing double-skips.
    // The await speak() logic above is sufficient and more reliable.

    // We need a ref for status to check inside timeout without stale closure if we want to be safe, 
    // or just rely on 'status' change clearing the timeout.
    // If status changes to 'paused', the effect cleanup runs -> clearTimeout. PERFECT.
    // So if I hit pause, status -> paused. Effect [speechState, status] cleanup runs. Timer killed. logic holds.

    const togglePause = () => {
        if (transitionLockRef.current) return;
        if (status === "paused") {
            // Resume
            const line = script.lines[currentLineIndex];
            const isUser = (() => {
                const normalizedLineChar = line.character.toLowerCase().trim();
                const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
                return userCharacters.some(userChar => {
                    const normalizedUserChar = userChar.toLowerCase().trim();
                    return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
                });
            })();

            if (isUser) {
                setStatus("listening_user");
            } else {
                setStatus("playing_other");
            }
        } else {
            // Pause
            setStatus("paused");
            stopAll();
        }
    };

    // Helper for character matching
    const isUserLine = (lineChar: string) => {
        if (!lineChar || !userCharacters || userCharacters.length === 0) return false;

        const normalizedLineChar = lineChar.toLowerCase().trim();
        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());

        return userCharacters.some(userChar => {
            const normalizedUserChar = userChar.toLowerCase().trim();
            return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
        });
    };

    // Helper to check if a line should be skipped (e.g., DIDASCALIES)
    const shouldSkipLine = (lineChar: string) => {
        const normalizedLineChar = lineChar.toLowerCase().trim();
        return skipCharacters.some(skipChar => normalizedLineChar === skipChar.toLowerCase().trim());
    };

    // Find next valid line index (skipping skipCharacters)
    const findNextValidIndex = (startIdx: number, direction: 1 | -1 = 1): number => {
        let idx = startIdx;
        while (idx >= 0 && idx < script.lines.length) {
            const line = script.lines[idx];
            if (!shouldSkipLine(line.character)) {
                return idx;
            }
            idx += direction;
        }
        return direction === 1 ? script.lines.length : -1; // Out of bounds
    };

    const start = () => {
        if (transitionLockRef.current) return;
        transitionLockRef.current = true;
        stopAll();
        setStatus("setup"); // BREAK the engine loop immediately
        setRetryCount(0); // Reset retries

        // NEW: Jump directly to first relevant line based on mode
        let entryIdx = initialLineIndex;
        while (entryIdx < script.lines.length) {
            const line = script.lines[entryIdx];

            // 1. Skip if character is in skip list (e.g. DIDASCALIES)
            if (shouldSkipLine(line.character)) {
                entryIdx++;
                continue;
            }

            // 2. Mode logic jump
            let isRelevant = true;
            if (mode === "check") {
                // Only user lines are relevant
                isRelevant = isUserLine(line.character);
            } else if (mode === "cue") {
                // User lines OR lines just before user lines are relevant
                const nextRelevantIdx = (() => {
                    let nextIdx = entryIdx + 1;
                    while (nextIdx < script.lines.length && shouldSkipLine(script.lines[nextIdx].character)) {
                        nextIdx++;
                    }
                    return nextIdx;
                })();
                const nextLine = script.lines[nextRelevantIdx];
                isRelevant = isUserLine(line.character) || (nextLine && isUserLine(nextLine.character));
            }

            if (isRelevant) break;
            entryIdx++;
        }

        if (entryIdx >= script.lines.length) {
            setStatus("finished");
            transitionLockRef.current = false;
            return;
        }

        setCurrentLineIndex(entryIdx);
        const line = script.lines[entryIdx];

        // Brief delay to ensure cleanup
        setTimeout(() => {
            if (isUserLine(line.character)) {
                setStatus("listening_user");
                playBip();
            } else {
                setStatus("playing_other");
            }
            transitionLockRef.current = false;
        }, 300); // More generous window for mobile
    };

    // Find next relevant index based on mode
    const findNextRelevantIndex = (currentIdx: number, direction: 1 | -1 = 1): number => {
        let idx = currentIdx + direction;
        while (idx >= 0 && idx < script.lines.length) {
            const line = script.lines[idx];

            if (shouldSkipLine(line.character)) {
                idx += direction;
                continue;
            }

            let isRelevant = true;
            if (mode === "check") {
                isRelevant = isUserLine(line.character);
            } else if (mode === "cue") {
                const nextRelevantIdx = (() => {
                    let nIdx = idx + 1;
                    while (nIdx < script.lines.length && shouldSkipLine(script.lines[nIdx].character)) {
                        nIdx++;
                    }
                    return nIdx;
                })();
                const nextLine = script.lines[nextRelevantIdx];
                isRelevant = isUserLine(line.character) || (nextLine && isUserLine(nextLine.character));
            }

            if (isRelevant) return idx;
            idx += direction;
        }
        return direction === 1 ? script.lines.length : -1;
    };

    const next = () => {
        if (!isMountedRef.current || transitionLockRef.current) return;
        transitionLockRef.current = true;
        manualSkipRef.current = true;
        stopAll();
        setStatus("setup");
        setRetryCount(0); // Reset retries

        const nextIdx = findNextRelevantIndex(stateRef.current.currentLineIndex, 1);
        if (nextIdx < script.lines.length) {
            setCurrentLineIndex(nextIdx);
            const nextLine = script.lines[nextIdx];
            setTimeout(() => {
                manualSkipRef.current = false;
                if (isUserLine(nextLine.character)) {
                    setStatus("listening_user");
                    playBip();
                } else {
                    setStatus("playing_other");
                }
                transitionLockRef.current = false;
            }, 300);
        } else {
            manualSkipRef.current = false;
            transitionLockRef.current = false;
            setStatus("finished");
        }
    };

    const previous = () => {
        if (!isMountedRef.current || transitionLockRef.current) return;
        transitionLockRef.current = true;
        manualSkipRef.current = true;
        stopAll();
        setStatus("setup");
        setRetryCount(0);

        const prevIdx = findNextRelevantIndex(stateRef.current.currentLineIndex, -1);
        if (prevIdx >= 0) {
            setCurrentLineIndex(prevIdx);
            const prevLine = script.lines[prevIdx];
            setTimeout(() => {
                manualSkipRef.current = false;
                if (isUserLine(prevLine.character)) {
                    setStatus("listening_user");
                    playBip();
                } else {
                    setStatus("playing_other");
                }
                transitionLockRef.current = false;
            }, 300);
        } else {
            manualSkipRef.current = false;
            transitionLockRef.current = false;
            setStatus("setup");
        }
    };

    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; }, [status]);

    const retry = () => {
        if (transitionLockRef.current) return;
        transitionLockRef.current = true;
        manualSkipRef.current = true;
        stopAll();
        setStatus("setup");
        setFeedback(null);
        // Do NOT reset Retry Count on manual retry? user wants to try again.
        // But maybe we should reset it so they can try 3 more times? 
        // Let's reset it if they manually asked to retry.
        setRetryCount(0);

        const line = script.lines[currentLineIndex];
        setTimeout(() => {
            manualSkipRef.current = false;
            if (isUserLine(line.character)) {
                setStatus("listening_user");
                playBip();
            } else {
                setStatus("playing_other");
            }
            transitionLockRef.current = false;
        }, 300);
    };

    const validateManually = () => {
        if (!isMountedRef.current || transitionLockRef.current) return;
        if (status === "listening_user" || status === "error") {
            stopAll();
            setFeedback("correct");
            setRetryCount(0);
            setTimeout(() => {
                if (!isMountedRef.current) return;
                setFeedback(null);
                next();
            }, 100);
        }
    };

    // Main Engine Effect
    useEffect(() => {
        if (status === "paused" || status === "setup" || status === "finished" || status === "waiting_feedback") return;

        const executeStep = async () => {
            if (!isMountedRef.current) return;
            const line = script.lines[currentLineIndex];
            if (!line) {
                setStatus("finished");
                return;
            }

            // Preload next line
            const nextIdx = currentLineIndex + 1;
            if (nextIdx < script.lines.length) {
                const nextLine = script.lines[nextIdx];
                if (!isUserLine(nextLine.character)) {
                    preloadLine(nextLine.text, nextLine.character);
                }
            }

            if (status === "playing_other") {
                // Check if we should skip this line in Cue/Check modes
                let shouldPlay = true;
                if (mode === "check") {
                    shouldPlay = false;
                } else if (mode === "cue") {
                    const nextLine = script.lines[currentLineIndex + 1];
                    shouldPlay = (nextLine && isUserLine(nextLine.character)) || false;
                }

                if (!shouldPlay) {
                    next();
                    return;
                }

                const voice = voiceAssignments[line.character];
                try {
                    await speak(line.text, voice, line.character, line.id);
                    if (!isMountedRef.current) return;
                    if (statusRef.current === "playing_other" && !manualSkipRef.current) {
                        next();
                    }
                } catch (e) {
                    if (!manualSkipRef.current) next();
                }
            } else if (status === "listening_user") {
                try {
                    // FIX: Estimated Duration increased to 70ms per char (theatrical speed)
                    // Example: 100 char line = 7 seconds. 
                    // Previous 20ms = 2 seconds (WAY too fast).
                    const estimatedDuration = Math.max(line.text.length * 70, 2000);

                    // FIX: Pass the expected text for EARLLY EXIT
                    const transcript = await listen(estimatedDuration, line.text);
                    if (!isMountedRef.current) return;

                    setLastTranscript(transcript);
                    setStatus("evaluating");

                    const similarity = calculateSimilarity(transcript, line.text, script.title);

                    if (isNextCommand(transcript)) {
                        setFeedback("correct");
                        setTimeout(() => { setFeedback(null); next(); }, 300);
                    } else if (isPrevCommand(transcript)) {
                        previous();
                    } else if (similarity >= similarityThreshold || (line.text.length < 30 && (line.text.toLowerCase().includes(transcript.toLowerCase()) && transcript.length >= 2))) {
                        setFeedback("correct");
                        setTimeout(() => { setFeedback(null); next(); }, 150);
                    } else {
                        setFeedback("incorrect");
                        // We ARE ALREADY in 'evaluating' status

                        // FIX: Anti-Loop Logic
                        if (retryCount >= 2) {
                            // 3rd failure (0, 1, 2)
                            await speak("On passe à la suite.", voiceAssignments["ASSISTANT"]);
                            setFeedback(null);
                            next();
                        } else {
                            const remaining = 2 - retryCount;
                            const hintAudio = remaining === 0 ? "Dernier essai." : "Encore une fois.";

                            // Restore full correction: "Tu as dit X. Il fallait dire Y."
                            await speak(`Tu as dit : ${transcript}. Il fallait dire : ${line.text}. ${hintAudio}`, voiceAssignments["ASSISTANT"], "ASSISTANT");

                            setFeedback(null);
                            setRetryCount(prev => prev + 1);

                            // Defensive pause on mobile to allow audio hardware to switch roles
                            await new Promise(r => setTimeout(r, 600));
                            setStatus("listening_user");
                            playBip();
                        }
                    }
                } catch (e) {
                    if (e !== "Cancelled") {
                        // Anti-Loop for recognition errors too
                        if (retryCount >= 2) {
                            next();
                        } else {
                            setRetryCount(prev => prev + 1);
                            setStatus("error");
                        }
                    }
                }
            }
        };

        executeStep();
    }, [status, currentLineIndex, retryCount]); // Add retryCount to dep array so we use fresh value

    return {
        currentLine: script.lines[currentLineIndex],
        currentLineIndex,
        totalLines: script.lines.length,
        status,
        feedback,
        lastTranscript,
        transcript, // Real-time interim transcript
        start,
        next,
        retry,
        validateManually,
        stop: () => {
            stopAll();
            setStatus("setup");
        },
        voices, // Raw voices list
        voiceAssignments, // Assignments
        setVoiceForRole, // Setter
        togglePause,
        isPaused: status === "paused",
        previous,
        initializeAudio,
        isPlayingRecording
    };
}
