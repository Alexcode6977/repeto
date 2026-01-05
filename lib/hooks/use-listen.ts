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
    const { speak: browserSpeak, stop: browserStop } = browserSpeech;

    const openaiSpeech = useOpenAITTS();
    const { speak: openaiSpeak, stop: openaiStop } = openaiSpeech;
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
            isMountedRef.current = false;
            browserStop();
            openaiStop();
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        };
    }, []);

    // Race condition protection
    const speakSessionRef = useRef(0);

    // Unified speak function with play-based cache
    const speak = useCallback(async (text: string, characterName?: string, lineId?: string, lineIndex?: number): Promise<void> => {
        // Increment session ID to invalidate previous pending calls
        const sessionId = ++speakSessionRef.current;

        // Stop any currently playing audio immediately
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        browserStop();
        openaiStop();

        const sourceId = playId || scriptId || "";

        // Priority 1: User Recording (troupe only)
        const recording = recordings.find(r => r.line_id === lineId);
        if (recording) {
            return new Promise((resolve) => {
                if (sessionId !== speakSessionRef.current) return resolve();

                const audio = new Audio(recording.audio_url);
                currentAudioRef.current = audio;

                audio.onended = () => {
                    if (sessionId === speakSessionRef.current) {
                        currentAudioRef.current = null;
                        resolve();
                    }
                };
                audio.onerror = async () => {
                    if (sessionId !== speakSessionRef.current) return resolve();
                    // Fallback to TTS if recording fails
                    console.warn("[Listen] Recording playback failed, falling back to TTS");
                    currentAudioRef.current = null;
                    await fallbackToTTS(text, characterName, lineIndex, sourceId);
                    resolve();
                };
                audio.play().catch(async () => {
                    if (sessionId !== speakSessionRef.current) return resolve();
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

                if (!isMountedRef.current || sessionId !== speakSessionRef.current) return;

                if ("audio" in result) {
                    await playAudioUrl(result.audio);
                } else {
                    console.error("[Listen] TTS error:", result.error);
                    // Fallback to browser TTS
                    const voice = characterName ? voiceAssignments[characterName] : undefined;
                    await browserSpeak(text, voice);
                }
            } catch (e) {
                if (sessionId !== speakSessionRef.current) return;
                console.error("[Listen] TTS failed:", e);
                const voice = characterName ? voiceAssignments[characterName] : undefined;
                await browserSpeak(text, voice);
            } finally {
                if (sessionId === speakSessionRef.current) {
                    setIsLoadingAudio(false);
                }
            }
            return;
        }

        // Priority 3: Browser TTS
        if (sessionId === speakSessionRef.current) {
            const voice = characterName ? voiceAssignments[characterName] : undefined;
            await browserSpeak(text, voice);
        }
    }, [recordings, ttsProvider, sourceType, playId, scriptId, troupeId, voiceAssignments, browserSpeak, browserStop, openaiSpeak, openaiStop]);

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
        await browserSpeak(text, voice);
    }, [ttsProvider, sourceType, troupeId, voiceAssignments, browserSpeak, playAudioUrl]);

    // Stop all audio
    const stopAll = useCallback(() => {
        browserStop();
        openaiStop();
    }, [browserStop, openaiStop]);

    // Helper: check if character is user's
    const isUserLine = useCallback((lineChar: string) => {
        if (!lineChar || !userCharacters || userCharacters.length === 0) return false;
        const normalizedLineChar = lineChar.toLowerCase().trim();
        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());

        return userCharacters.some(userChar => {
            const normalizedUserChar = userChar.toLowerCase().trim();

            // 1. Exact match
            if (normalizedLineChar === normalizedUserChar) return true;

            // 2. Substring match (e.g. "De Guiche" in "Comte De Guiche")
            if (normalizedLineChar.includes(normalizedUserChar)) return true;

            // 3. Reverse substring match (e.g. "Cyrano" in "Cyrano de Bergerac" if user is full name?)
            // Usually userChar is the short one. 

            // 4. Word match (e.g. "Cyrano" in "Cyrano (off)")
            // Check if ANY part of the user char matches ANY part of the line char (risky? "Le" in "Le Bret")
            // No, strictly check if userChar (as a whole) is in lineParts? No, "De Guiche" is 2 words.

            // Let's trust "includes" for most cases (Title + Name).
            // And use intersection for "Premier Cadet" vs "Cadet".

            const userParts = normalizedUserChar.split(/[\s,]+/).map(p => p.trim());
            // Check if ALL significant parts of user name are in line parts
            // Filter out small words? "le", "la", "de"...
            const significantUserParts = userParts.filter(p => p.length > 2);
            if (significantUserParts.length > 0) {
                const allPartsFound = significantUserParts.every(p => lineParts.includes(p));
                if (allPartsFound) return true;
            }

            return false;
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
        let isCancelled = false;

        if (status !== "playing") return;

        const playCurrentLine = async () => {
            if (!isMountedRef.current) return;

            const line = script.lines[currentLineIndex];
            if (!line) {
                if (!isCancelled) setStatus("finished");
                return;
            }

            try {
                // Announce character if enabled
                if (announceCharacter) {
                    // Use browser speech directly for announcement to avoid complex logic/race conditions of main speak function
                    browserStop();
                    openaiStop(); // Ensure silnece
                    await browserSpeak(`${line.character} dit :`);

                    if (isCancelled || !isMountedRef.current || stateRef.current.status !== "playing") return;

                    // Small buffer after announcement
                    await new Promise(r => setTimeout(r, 300));
                }

                // Play the line with lineIndex for cache
                await speak(line.text, line.character, line.id, currentLineIndex);
                if (isCancelled || !isMountedRef.current || stateRef.current.status !== "playing") return;

                // BUFFER DELAY: Wait 500ms after audio finishes before moving to next line
                await new Promise(r => setTimeout(r, 500));
                if (isCancelled || !isMountedRef.current || stateRef.current.status !== "playing") return;

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
                    if (!isCancelled) setCurrentLineIndex(nextIdx);
                } else {
                    if (!isCancelled) setStatus("finished");
                }
            } catch (e) {
                console.error("[Listen] Playback error:", e);
                // Try to continue anyway
                const nextIdx = findNextRelevantIndex(currentLineIndex, 1);
                if (nextIdx < script.lines.length) {
                    if (!isCancelled) setCurrentLineIndex(nextIdx);
                } else {
                    if (!isCancelled) setStatus("finished");
                }
            }
        };

        playCurrentLine();

        return () => {
            isCancelled = true;
        };
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
