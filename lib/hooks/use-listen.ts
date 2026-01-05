import { useState, useEffect, useRef, useCallback } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useSpeech } from "./use-speech";
import { useOpenAITTS } from "./use-openai-tts";
import { useRehearsalVoices } from "./use-rehearsal-voices";
import { getPlayRecordings } from "../actions/recordings";
import { synthesizeSpeechWithPlayCache } from "@/app/actions/tts";
import { determineSourceType, type SourceType } from "../actions/voice-cache";

export type ListenStatus = "setup" | "playing" | "paused" | "finished";
export type ListenMode = "full" | "cue" | "check";
export type TTSProvider = "browser" | "openai";
export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface UseListenProps {
    script: ParsedScript;
    userCharacters: string[];
    mode?: ListenMode;
    ttsProvider?: TTSProvider;
    announceCharacter?: boolean;
    initialLineIndex?: number;
    openaiVoiceAssignments?: Record<string, OpenAIVoice>;
    skipCharacters?: string[];
    playId?: string;
    scriptId?: string;
    isPublicScript?: boolean;
    troupeId?: string;
}

interface UseListenReturn {
    currentLine: ScriptLine | null;
    currentLineIndex: number;
    status: ListenStatus;
    progress: number;
    totalRelevantLines: number;
    currentRelevantIndex: number;
    isLoadingAudio: boolean;

    start: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    next: () => void;
    previous: () => void;
    replay: () => void;

    voices: SpeechSynthesisVoice[];
    voiceAssignments: Record<string, SpeechSynthesisVoice | undefined>;
    setVoiceForRole: (role: string, voiceURI: string) => void;
    initializeAudio: (forceOutput?: boolean) => Promise<void>;
}

export function useListen({
    script,
    userCharacters,
    mode = "full",
    ttsProvider = "browser",
    announceCharacter = false,
    initialLineIndex = 0,
    openaiVoiceAssignments = {},
    skipCharacters = [],
    playId,
    scriptId,
    isPublicScript = false,
    troupeId
}: UseListenProps): UseListenReturn {
    const browserSpeech = useSpeech();
    const openaiSpeech = useOpenAITTS();
    const { voices, initializeAudio } = browserSpeech;

    const [recordings, setRecordings] = useState<any[]>([]);
    const [sourceType, setSourceType] = useState<SourceType>("private_script");
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);

    // Determine source type on mount
    useEffect(() => {
        const determineSource = async () => {
            const st = await determineSourceType(isPublicScript, troupeId, playId);
            setSourceType(st);
        };
        determineSource();
    }, [isPublicScript, troupeId, playId]);

    // Fetch recordings if playId is provided
    useEffect(() => {
        if (playId) {
            getPlayRecordings(playId).then(setRecordings);
        }
    }, [playId]);

    // Use specialized voice hook
    const { voiceAssignments, setVoiceForRole } = useRehearsalVoices(script, voices);

    // State
    const [currentLineIndex, setCurrentLineIndex] = useState(initialLineIndex);
    const [status, setStatus] = useState<ListenStatus>("setup");

    // Refs
    const isMountedRef = useRef(true);
    const stateRef = useRef({ currentLineIndex, status, mode });
    const transitionLockRef = useRef(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        stateRef.current = { currentLineIndex, status, mode };
    }, [currentLineIndex, status, mode]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            browserSpeech.stop();
            openaiSpeech.stop();
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        };
    }, []);

    // Unified speak function with play-based cache
    const speak = useCallback(async (text: string, characterName?: string, lineId?: string, lineIndex?: number): Promise<void> => {
        const sourceId = playId || scriptId || "";

        // Priority 1: User Recording (troupe only)
        const recording = recordings.find(r => r.line_id === lineId);
        if (recording) {
            return new Promise((resolve) => {
                const audio = new Audio(recording.audio_url);
                currentAudioRef.current = audio;

                audio.onended = () => {
                    currentAudioRef.current = null;
                    resolve();
                };
                audio.onerror = async () => {
                    // Fallback to TTS if recording fails
                    console.warn("[Listen] Recording playback failed, falling back to TTS");
                    currentAudioRef.current = null;
                    await fallbackToTTS(text, characterName, lineIndex, sourceId);
                    resolve();
                };
                audio.play().catch(async () => {
                    await fallbackToTTS(text, characterName, lineIndex, sourceId);
                    resolve();
                });
            });
        }

        // Priority 2: OpenAI TTS with play-based cache
        if (ttsProvider === "openai" && sourceId && characterName && lineIndex !== undefined) {
            setIsLoadingAudio(true);
            try {
                const result = await synthesizeSpeechWithPlayCache(
                    text,
                    characterName,
                    lineIndex,
                    sourceType,
                    sourceId,
                    troupeId
                );

                if (!isMountedRef.current) return;

                if ("audio" in result) {
                    await playAudioUrl(result.audio);
                } else {
                    console.error("[Listen] TTS error:", result.error);
                    // Fallback to browser TTS
                    const voice = characterName ? voiceAssignments[characterName] : undefined;
                    await browserSpeech.speak(text, voice);
                }
            } catch (e) {
                console.error("[Listen] TTS failed:", e);
                const voice = characterName ? voiceAssignments[characterName] : undefined;
                await browserSpeech.speak(text, voice);
            } finally {
                setIsLoadingAudio(false);
            }
            return;
        }

        // Priority 3: Browser TTS
        const voice = characterName ? voiceAssignments[characterName] : undefined;
        await browserSpeech.speak(text, voice);
    }, [recordings, ttsProvider, sourceType, playId, scriptId, troupeId, voiceAssignments, browserSpeech]);

    // Helper to play audio URL
    const playAudioUrl = useCallback((url: string): Promise<void> => {
        return new Promise((resolve) => {
            const audio = new Audio(url);
            currentAudioRef.current = audio;

            audio.onended = () => {
                currentAudioRef.current = null;
                resolve();
            };
            audio.onerror = () => {
                currentAudioRef.current = null;
                resolve();
            };
            audio.play().catch(() => resolve());
        });
    }, []);

    // Fallback TTS helper
    const fallbackToTTS = useCallback(async (text: string, characterName?: string, lineIndex?: number, sourceId?: string) => {
        if (ttsProvider === "openai" && sourceId && characterName && lineIndex !== undefined) {
            try {
                const result = await synthesizeSpeechWithPlayCache(text, characterName, lineIndex, sourceType, sourceId, troupeId);
                if ("audio" in result) {
                    await playAudioUrl(result.audio);
                    return;
                }
            } catch (e) {
                // Fall through to browser
            }
        }
        const voice = characterName ? voiceAssignments[characterName] : undefined;
        await browserSpeech.speak(text, voice);
    }, [ttsProvider, sourceType, troupeId, voiceAssignments, browserSpeech, playAudioUrl]);

    // Stop all audio
    const stopAll = useCallback(() => {
        browserSpeech.stop();
        openaiSpeech.stop();
    }, [browserSpeech, openaiSpeech]);

    // Helper: check if character is user's
    const isUserLine = useCallback((lineChar: string) => {
        if (!lineChar || !userCharacters || userCharacters.length === 0) return false;
        const normalizedLineChar = lineChar.toLowerCase().trim();
        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
        return userCharacters.some(userChar => {
            const normalizedUserChar = userChar.toLowerCase().trim();
            return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
        });
    }, [userCharacters]);

    // Helper: check if line should be skipped
    const shouldSkipLine = useCallback((lineChar: string) => {
        const normalizedLineChar = lineChar.toLowerCase().trim();
        return skipCharacters.some(skipChar => normalizedLineChar === skipChar.toLowerCase().trim());
    }, [skipCharacters]);

    // Get relevant lines based on mode
    const relevantLines = useCallback(() => {
        return script.lines.filter((line, idx) => {
            if (shouldSkipLine(line.character)) return false;

            if (mode === "full") return true;
            if (mode === "check") return isUserLine(line.character);
            if (mode === "cue") {
                // User lines OR lines just before user lines
                if (isUserLine(line.character)) return true;
                // Check if next non-skipped line is user's
                let nextIdx = idx + 1;
                while (nextIdx < script.lines.length && shouldSkipLine(script.lines[nextIdx].character)) {
                    nextIdx++;
                }
                const nextLine = script.lines[nextIdx];
                return nextLine && isUserLine(nextLine.character);
            }
            return true;
        });
    }, [script.lines, mode, isUserLine, shouldSkipLine]);

    // Find next relevant line index
    const findNextRelevantIndex = useCallback((currentIdx: number, direction: 1 | -1 = 1): number => {
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
                if (isUserLine(line.character)) {
                    isRelevant = true;
                } else {
                    let nextIdx = idx + 1;
                    while (nextIdx < script.lines.length && shouldSkipLine(script.lines[nextIdx].character)) {
                        nextIdx++;
                    }
                    const nextLine = script.lines[nextIdx];
                    isRelevant = nextLine && isUserLine(nextLine.character);
                }
            }

            if (isRelevant) return idx;
            idx += direction;
        }
        return direction === 1 ? script.lines.length : -1;
    }, [script.lines, mode, isUserLine, shouldSkipLine]);

    // Calculate progress
    const totalRelevantLines = relevantLines().length;
    const currentRelevantIndex = relevantLines().findIndex((_, i) => {
        const originalIndex = script.lines.indexOf(relevantLines()[i]);
        return originalIndex === currentLineIndex;
    }) + 1;
    const progress = totalRelevantLines > 0 ? Math.round((currentRelevantIndex / totalRelevantLines) * 100) : 0;

    // Start listening session
    const start = useCallback(() => {
        if (transitionLockRef.current) return;
        transitionLockRef.current = true;
        stopAll();

        // Find first relevant line
        let entryIdx = initialLineIndex;
        while (entryIdx < script.lines.length) {
            const line = script.lines[entryIdx];

            if (shouldSkipLine(line.character)) {
                entryIdx++;
                continue;
            }

            let isRelevant = true;
            if (mode === "check") {
                isRelevant = isUserLine(line.character);
            } else if (mode === "cue") {
                if (isUserLine(line.character)) {
                    isRelevant = true;
                } else {
                    let nextIdx = entryIdx + 1;
                    while (nextIdx < script.lines.length && shouldSkipLine(script.lines[nextIdx].character)) {
                        nextIdx++;
                    }
                    const nextLine = script.lines[nextIdx];
                    isRelevant = nextLine && isUserLine(nextLine.character);
                }
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
        setTimeout(() => {
            setStatus("playing");
            transitionLockRef.current = false;
        }, 100);
    }, [initialLineIndex, script.lines, mode, isUserLine, shouldSkipLine, stopAll]);

    // Navigation
    const next = useCallback(() => {
        if (!isMountedRef.current || transitionLockRef.current) return;
        transitionLockRef.current = true;
        stopAll();

        const nextIdx = findNextRelevantIndex(stateRef.current.currentLineIndex, 1);
        if (nextIdx < script.lines.length) {
            setCurrentLineIndex(nextIdx);
            setTimeout(() => {
                setStatus("playing");
                transitionLockRef.current = false;
            }, 100);
        } else {
            setStatus("finished");
            transitionLockRef.current = false;
        }
    }, [script.lines.length, findNextRelevantIndex, stopAll]);

    const previous = useCallback(() => {
        if (!isMountedRef.current || transitionLockRef.current) return;
        transitionLockRef.current = true;
        stopAll();

        const prevIdx = findNextRelevantIndex(stateRef.current.currentLineIndex, -1);
        if (prevIdx >= 0) {
            setCurrentLineIndex(prevIdx);
            setTimeout(() => {
                setStatus("playing");
                transitionLockRef.current = false;
            }, 100);
        } else {
            transitionLockRef.current = false;
        }
    }, [findNextRelevantIndex, stopAll]);

    const replay = useCallback(() => {
        if (transitionLockRef.current) return;
        transitionLockRef.current = true;
        stopAll();
        setStatus("setup");

        setTimeout(() => {
            setStatus("playing");
            transitionLockRef.current = false;
        }, 100);
    }, [stopAll]);

    const pause = useCallback(() => {
        if (status === "playing") {
            stopAll();
            setStatus("paused");
        }
    }, [status, stopAll]);

    const resume = useCallback(() => {
        if (status === "paused") {
            setStatus("playing");
        }
    }, [status]);

    const stop = useCallback(() => {
        stopAll();
        setStatus("setup");
    }, [stopAll]);

    // Main playback engine
    useEffect(() => {
        if (status !== "playing") return;

        const playCurrentLine = async () => {
            if (!isMountedRef.current) return;

            const line = script.lines[currentLineIndex];
            if (!line) {
                setStatus("finished");
                return;
            }

            try {
                // Announce character if enabled
                if (announceCharacter) {
                    await speak(`${line.character} dit :`, undefined, undefined, undefined);
                    if (!isMountedRef.current || stateRef.current.status !== "playing") return;
                }

                // Play the line with lineIndex for cache
                await speak(line.text, line.character, line.id, currentLineIndex);
                if (!isMountedRef.current || stateRef.current.status !== "playing") return;

                // Auto-advance to next line
                const nextIdx = findNextRelevantIndex(currentLineIndex, 1);
                if (nextIdx < script.lines.length) {
                    // Preload next line while transitioning (fire and forget)
                    const nextLine = script.lines[nextIdx];
                    if (nextLine && ttsProvider === "openai") {
                        const sourceId = playId || scriptId || "";
                        if (sourceId && nextLine.character) {
                            // Non-blocking preload
                            synthesizeSpeechWithPlayCache(
                                nextLine.text,
                                nextLine.character,
                                nextIdx,
                                sourceType,
                                sourceId,
                                troupeId
                            ).catch(() => { }); // Ignore preload errors
                        }
                    }
                    setCurrentLineIndex(nextIdx);
                } else {
                    setStatus("finished");
                }
            } catch (e) {
                console.error("[Listen] Playback error:", e);
                // Try to continue anyway
                const nextIdx = findNextRelevantIndex(currentLineIndex, 1);
                if (nextIdx < script.lines.length) {
                    setCurrentLineIndex(nextIdx);
                } else {
                    setStatus("finished");
                }
            }
        };

        playCurrentLine();
    }, [status, currentLineIndex, script.lines, announceCharacter, speak, findNextRelevantIndex, ttsProvider, playId, scriptId, sourceType, troupeId]);

    return {
        currentLine: script.lines[currentLineIndex] || null,
        currentLineIndex,
        status,
        progress,
        totalRelevantLines,
        currentRelevantIndex,
        isLoadingAudio,

        start,
        pause,
        resume,
        stop,
        next,
        previous,
        replay,

        voices,
        voiceAssignments,
        setVoiceForRole,
        initializeAudio
    };
}
