import { useState, useEffect, useRef, useMemo } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useSpeech } from "./use-speech";
import { useAITTS } from "./use-ai-tts";
import { calculateSimilarity, stripStageDirections } from "../similarity";
import { offlineManager } from "../offline/offline-manager";
import { getSceneCharacters, isUserLine as checkIsUserLine } from "../utils";
import { COLLECTIVE_ROLES } from "../constants";


export type RehearsalStatus =
    | "setup"
    | "playing_other"
    | "listening_user"
    | "evaluating"
    | "waiting_feedback"
    | "error"
    | "paused"
    | "finished";

export type TTSProvider = "browser" | "openai" | "elevenlabs";

interface UseRehearsalProps {
    script: ParsedScript;
    userCharacters: string[];
    similarityThreshold?: number;
    initialLineIndex?: number;
    mode?: "full" | "cue" | "check";
    ttsProvider?: TTSProvider;
    openaiVoiceAssignments?: Record<string, string>;
    skipCharacters?: string[]; // Characters to skip during rehearsal (e.g., ["DIDASCALIES"])
    playId?: string;
    partnerCharacters?: string[];
    showStageDirections?: boolean;
}

import { useRehearsalVoices } from "./use-rehearsal-voices";
import { isNextCommand, isPrevCommand } from "../speech-utils";
import { getPlayRecordings } from "../actions/recordings";
import { playLineSequentially } from "../audio/sequencer";

export function useRehearsal({ script, userCharacters, similarityThreshold = 0.85, initialLineIndex = 0, mode = "full", ttsProvider = "browser", openaiVoiceAssignments = {}, skipCharacters = [], playId, partnerCharacters = [], showStageDirections = true }: UseRehearsalProps) {
    const browserSpeech = useSpeech();
    const aiSpeech = useAITTS();
    const { voices, listen, stop: stopSpeech, state: speechState, initializeAudio, transcript } = browserSpeech;

    const [recordings, setRecordings] = useState<any[]>([]);
    const [isPlayingRecording, setIsPlayingRecording] = useState(false);

    // Pre-calculate scene characters for collective role logic
    const sceneCharactersMap = useMemo(() => getSceneCharacters(script), [script]);

    // Fetch recordings if playId is provided
    useEffect(() => {
        if (playId) {
            getPlayRecordings(playId).then(setRecordings);
        }
    }, [playId]);

    // Use specialized voice hook
    const { voiceAssignments, setVoiceForRole } = useRehearsalVoices(script, voices);

    const getCollectiveVoice = (lineIndex: number): SpeechSynthesisVoice | undefined => {
        // Find current scene
        let sceneStartIdx = 0;
        for (const scene of script.scenes || []) {
            if (scene.index <= lineIndex) {
                sceneStartIdx = scene.index;
            } else {
                break;
            }
        }

        const activeChars = sceneCharactersMap.get(sceneStartIdx);
        if (!activeChars) return undefined;

        // Pick the first active character that has an assigned voice
        for (const char of activeChars) {
            const voice = voiceAssignments[char];
            if (voice) return voice;
        }
        return undefined;
    };


    // Unified speak function that handles both providers (Recordings logic moved to caller)
    const speak = async (text: string, _voice?: SpeechSynthesisVoice, characterName?: string, lineId?: string): Promise<void> => {
        // Validation
        if (!text || !text.trim()) return;

        // Priority 2: AI TTS (OpenAI or ElevenLabs)
        if (ttsProvider === "openai" || ttsProvider === "elevenlabs") {
            const assignedVoice = characterName && openaiVoiceAssignments[characterName] ? openaiVoiceAssignments[characterName] : "21m00Tcm4TlvDq8ikWAM";

            // OFFLINE CHECK
            const hash = await offlineManager.generateHash(text, assignedVoice);
            const offlineUrl = lineId ? await offlineManager.getAudio(lineId, hash) : null;

            if (offlineUrl) {
                return new Promise((resolve) => {
                    const audio = new Audio(offlineUrl);
                    audio.onended = () => resolve();
                    audio.onerror = () => resolve();
                    audio.play().catch(() => resolve());
                });
            }

            await aiSpeech.speak(text, assignedVoice);
        }
        // Priority 3: Browser TTS
        else {
            await browserSpeech.speak(text, _voice);
        }
    };

    // Preload helper
    const preloadLine = async (text: string, characterName: string) => {
        if (ttsProvider === "openai" || ttsProvider === "elevenlabs") {
            const assignedVoice = characterName && openaiVoiceAssignments[characterName] ? openaiVoiceAssignments[characterName] : "21m00Tcm4TlvDq8ikWAM";
            await aiSpeech.preload(text, assignedVoice);
        }
    };

    // Combined stop function
    const stopAll = () => {
        browserSpeech.stop();
        aiSpeech.stop();
    };

    // Helper for synthetic recording "bip" (important for iPad feedback)
    const playBip = () => {
        if (browserSpeech.playTone) {
            browserSpeech.playTone();
        } else {
            // Fallback
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
        }
    };

    const [currentLineIndex, setCurrentLineIndex] = useState(initialLineIndex);
    const [status, setStatus] = useState<RehearsalStatus>("setup");
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [lastTranscript, setLastTranscript] = useState("");

    // NEW: Retry counter as REF to avoid triggering executeStep on every retry
    const retryCountRef = useRef(0);

    // Ref to track auto-play preventing stale closures AND mode
    const stateRef = useRef({ currentLineIndex, status, userCharacters, mode });
    useEffect(() => {
        stateRef.current = { currentLineIndex, status, userCharacters, mode };
    }, [currentLineIndex, status, userCharacters, mode]);

    // Track mount status to prevent zombie execution loops
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            browserSpeech.stop();
            aiSpeech.stop();
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

    // Helper to find the current scene start index for a given line index
    const getSceneStartIndex = (lineIndex: number): number => {
        let currentIndex = 0;
        for (const scene of script.scenes || []) {
            if (scene.index <= lineIndex) {
                currentIndex = scene.index;
            } else {
                break;
            }
        }
        return currentIndex;
    };

    // Helper for character matching with extended collective logic
    const isUserLine = (lineChar: string, specificLineIndex?: number) => {
        // Find which scene this line belongs to
        const idx = specificLineIndex !== undefined ? specificLineIndex : currentLineIndex;
        const sceneStartIdx = getSceneStartIndex(idx);
        const activeChars = sceneCharactersMap.get(sceneStartIdx);

        return checkIsUserLine(lineChar, userCharacters, activeChars);
    };

    const togglePause = () => {
        if (transitionLockRef.current) return;
        if (status === "paused") {
            // Resume
            const line = script.lines[currentLineIndex];
            // FIX: Pass current index explicitly to ensure scene lookup is correct
            const isUser = isUserLine(line.character, currentLineIndex);

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

    const start = (immediate = false) => {
        if (transitionLockRef.current) return;
        transitionLockRef.current = true;
        stopAll();
        setStatus("setup"); // BREAK the engine loop immediately
        retryCountRef.current = 0; // Reset retries

        // NEW: Jump directly to first relevant line based on mode (read from REF for latest)
        let entryIdx = initialLineIndex;
        const currentMode = stateRef.current.mode;

        while (entryIdx < script.lines.length) {
            const line = script.lines[entryIdx];

            // 1. Skip if character is in skip list (e.g. DIDASCALIES)
            if (shouldSkipLine(line.character)) {
                entryIdx++;
                continue;
            }

            // 2. Mode logic jump
            let isRelevant = true;
            if (currentMode === "check") {
                // Only user lines are relevant
                // FIX: Pass index to check scene context
                isRelevant = isUserLine(line.character, entryIdx);
            } else if (currentMode === "cue") {
                // User lines OR lines just before user lines are relevant
                const nextRelevantIdx = (() => {
                    let nextIdx = entryIdx + 1;
                    while (nextIdx < script.lines.length && shouldSkipLine(script.lines[nextIdx].character)) {
                        nextIdx++;
                    }
                    return nextIdx;
                })();
                const nextLine = script.lines[nextRelevantIdx];
                // FIX: Pass index to check scene context for both
                isRelevant = isUserLine(line.character, entryIdx) || (nextLine && isUserLine(nextLine.character, nextRelevantIdx));
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

        const executeStart = () => {
            // FIX: Pass index
            if (isUserLine(line.character, entryIdx)) {
                setStatus("listening_user");
                // Force play tone if we start directly on user (Cue Mode / Check Mode edge case)
                playBip();
            } else {
                setStatus("playing_other");
            }
            transitionLockRef.current = false;
        };

        if (immediate) {
            executeStart();
        } else {
            //@ts-ignore
            setTimeout(executeStart, 200); // Reduced from 300ms for faster start
        }
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
            const currentMode = stateRef.current.mode;
            if (currentMode === "check") {
                // FIX: Pass index
                isRelevant = isUserLine(line.character, idx);
            } else if (currentMode === "cue") {
                const nextRelevantIdx = (() => {
                    let nIdx = idx + 1;
                    while (nIdx < script.lines.length && shouldSkipLine(script.lines[nIdx].character)) {
                        nIdx++;
                    }
                    return nIdx;
                })();
                const nextLine = script.lines[nextRelevantIdx];
                // FIX: Pass indexes
                isRelevant = isUserLine(line.character, idx) || (nextLine && isUserLine(nextLine.character, nextRelevantIdx));
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
        retryCountRef.current = 0; // Reset retries

        const nextIdx = findNextRelevantIndex(stateRef.current.currentLineIndex, 1);
        if (nextIdx < script.lines.length) {
            setCurrentLineIndex(nextIdx);
            const nextLine = script.lines[nextIdx];
            setTimeout(() => {
                manualSkipRef.current = false;
                // FIX: Pass new index
                if (isUserLine(nextLine.character, nextIdx)) {
                    setStatus("listening_user");
                    playBip();
                } else {
                    setStatus("playing_other");
                }
                transitionLockRef.current = false;
            }, 200); // Reduced from 300ms for faster transitions
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
        retryCountRef.current = 0;

        const prevIdx = findNextRelevantIndex(stateRef.current.currentLineIndex, -1);
        if (prevIdx >= 0) {
            setCurrentLineIndex(prevIdx);
            const prevLine = script.lines[prevIdx];
            setTimeout(() => {
                manualSkipRef.current = false;
                // FIX: Pass index
                if (isUserLine(prevLine.character, prevIdx)) {
                    setStatus("listening_user");
                    playBip();
                } else {
                    setStatus("playing_other");
                }
                transitionLockRef.current = false;
            }, 200); // Reduced from 300ms for faster transitions
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
        retryCountRef.current = 0;

        // FIX: Use stateRef to get CURRENT line index, not stale closure
        const currentIdx = stateRef.current.currentLineIndex;
        const line = script.lines[currentIdx];
        setTimeout(() => {
            manualSkipRef.current = false;
            // FIX: Pass index
            if (isUserLine(line.character, currentIdx)) {
                setStatus("listening_user");
                playBip();
            } else {
                setStatus("playing_other");
            }
            transitionLockRef.current = false;
        }, 200); // Reduced from 300ms for faster retry
    };

    const validateManually = () => {
        if (!isMountedRef.current || transitionLockRef.current) return;
        if (status === "listening_user" || status === "error") {
            stopAll();
            setFeedback("correct");
            retryCountRef.current = 0;
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

            // Preload next 3 lines for smoother playback (buffer)
            for (let i = 1; i <= 3; i++) {
                const nextIdx = currentLineIndex + i;
                if (nextIdx < script.lines.length) {
                    const nextLine = script.lines[nextIdx];
                    // FIX: Pass index
                    if (!isUserLine(nextLine.character, nextIdx)) {
                        preloadLine(nextLine.text, nextLine.character);
                    }
                }
            }

            if (status === "playing_other") {
                // Check if we should skip this line in Cue/Check modes
                let shouldPlay = true;
                const currentMode = stateRef.current.mode;
                if (currentMode === "check") {
                    shouldPlay = false;
                } else if (currentMode === "cue") {
                    // FIX: Find next NON-SKIPPED line to check if it's a user line
                    let lookAheadIdx = currentLineIndex + 1;
                    while (lookAheadIdx < script.lines.length && shouldSkipLine(script.lines[lookAheadIdx].character)) {
                        lookAheadIdx++;
                    }
                    const nextLine = script.lines[lookAheadIdx];
                    // FIX: Pass index
                    shouldPlay = (nextLine && isUserLine(nextLine.character, lookAheadIdx)) || false;
                }

                if (!shouldPlay) {
                    next();
                    return;
                }

                // NEW: Partner Logic - If it's a partner character, we DO NOT speak.
                // We just rely on the UI to show the line and wait for manual "Next".
                // We could also auto-advance after estimated duration, but manual is safer for Visio.
                if (partnerCharacters.some(pc => pc === line.character)) {
                    // Just return. The status remains 'playing_other'. 
                    // The user must manually click 'Next' (or we implement a timeout later).
                    return;
                }

                // Check for User Recording first (Priority 1)
                const recording = recordings.find(r => r.line_id === line.id);
                if (recording) {
                    setIsPlayingRecording(true);
                    const audio = new Audio(recording.audio_url);
                    await new Promise<void>((resolve) => {
                        audio.onended = () => resolve();
                        audio.onerror = () => resolve();
                        audio.play().catch(() => resolve());
                    });
                    setIsPlayingRecording(false);
                    if (!isMountedRef.current) return;
                    if (statusRef.current === "playing_other" && !manualSkipRef.current) next();
                    return;
                }

                const voice = voiceAssignments[line.character];
                try {
                    // Use Sequencer for Mixed Voice Playback
                    await playLineSequentially(
                        line,
                        showStageDirections,
                        async (textToSpeak, isDirection) => {
                            if (!isMountedRef.current || manualSkipRef.current) return;

                            // Determine Voice (Narrator vs Character)
                            const assignedVoice = isDirection
                                ? undefined // Browser default for narrator
                                : (voice || (COLLECTIVE_ROLES.has(line.character.toUpperCase()) ? getCollectiveVoice(currentLineIndex) : undefined));

                            await speak(
                                textToSpeak,
                                assignedVoice,
                                isDirection ? "didascalies" : line.character,
                                line.id
                            );

                        }
                    );

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
                    // but ONLY on spoken text (without stage directions)
                    const spokenText = stripStageDirections(line.text);
                    const estimatedDuration = Math.max(spokenText.length * 70, 2000);

                    // FIX: Pass the expected text for EARLY EXIT and Play Context for phonetic fixes
                    const transcript = await listen(estimatedDuration, spokenText, script.title);
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
                        setTimeout(() => { setFeedback(null); next(); }, 100); // Reduced from 150ms
                    } else {
                        setFeedback("incorrect");
                        // We ARE ALREADY in 'evaluating' status

                        // FIX: Anti-Loop Logic
                        if (retryCountRef.current >= 2) {
                            // 3rd failure (0, 1, 2)
                            await speak("On passe à la suite.", voiceAssignments["ASSISTANT"]);
                            setFeedback(null);
                            retryCountRef.current = 0; // Reset before moving
                            next();
                        } else {
                            const remaining = 2 - retryCountRef.current;
                            const hintAudio = remaining === 0 ? "Dernier essai." : "Encore une fois.";

                            // Restore full correction: "Tu as dit X. Il fallait dire Y."
                            // DELAY: Wait for mic to fully release before speaking (fix for iPhone cutoff)
                            await new Promise(r => setTimeout(r, 200));
                            await speak(`Tu as dit : ${transcript}. Il fallait dire : ${line.text}. ${hintAudio}`, voiceAssignments["ASSISTANT"], "ASSISTANT");

                            setFeedback(null);
                            retryCountRef.current = retryCountRef.current + 1;

                            // Defensive pause on mobile to allow audio hardware to switch roles
                            await new Promise(r => setTimeout(r, 600));
                            if (isMountedRef.current && statusRef.current !== "paused") {
                                setStatus("listening_user");
                                playBip();
                            }
                        }
                    }
                } catch (e) {
                    if (e !== "Cancelled") {
                        // Specific handling for microphone errors
                        if (e === "MIC_PERMISSION_DENIED" || e === "MIC_CAPTURE_FAILED" || e === "MIC_API_NOT_AVAILABLE") {
                            console.error("[Rehearsal] Microphone error:", e);
                            setStatus("error");
                            // Don't auto-retry mic permission issues
                            return;
                        }

                        // Anti-Loop for recognition errors too
                        if (retryCountRef.current >= 2) {
                            retryCountRef.current = 0;
                            next();
                        } else {
                            retryCountRef.current = retryCountRef.current + 1;
                            // FIX: Ensure manualSkipRef is reset on error path
                            manualSkipRef.current = false;
                            setStatus("error");
                        }
                    }
                }
            }
        };

        executeStep();
    }, [status, currentLineIndex]); // REMOVED retryCount - now using ref

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
        isPlayingRecording,
        retryCount: retryCountRef.current
    };
}
