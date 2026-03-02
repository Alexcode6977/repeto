import { useState, useEffect, useRef, useMemo } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useSpeech } from "./use-speech";
import { useAITTS } from "./use-ai-tts";
import { calculateSimilarity, stripStageDirections } from "../similarity";
import { offlineManager } from "../offline/offline-manager";
import { getCollectiveMembersForLine, getSceneCharacters, isUserLine as checkIsUserLine, resolveLineCharacter } from "../utils";
import { COLLECTIVE_ROLES } from "../constants";
import { RehearsalAudioEngine } from "../audio/gapless-player";
import { AudioQueue } from "../audio/audio-queue";
import { type SourceType, ensureVoiceConfig } from "../actions/voice-cache";


export type RehearsalStatus =
    | "setup"
    | "playing_other"
    | "listening_user"
    | "evaluating"
    | "waiting_feedback"
    | "error"
    | "paused"
    | "finished";

export type TTSProvider = "browser" | "google";

interface UseRehearsalProps {
    script: ParsedScript;
    userCharacters: string[];
    similarityThreshold?: number;
    initialLineIndex?: number;
    mode?: "full" | "cue" | "check";
    ttsProvider?: TTSProvider;
    aiVoiceAssignments?: Record<string, string>;
    skipCharacters?: string[]; // Characters to skip during rehearsal (e.g., ["DIDASCALIES"])
    playId?: string;
    scriptId?: string;
    originalScriptId?: string;
    troupeId?: string;
    partnerCharacters?: string[];
    isPublicScript?: boolean;
    showStageDirections?: boolean;
    playbackRate?: number;
}

import { useRehearsalVoices } from "./use-rehearsal-voices";
import { isNextCommand, isPrevCommand } from "../speech-utils";
import { getPlayRecordings } from "../actions/recordings";
import { parseSegments } from "../utils/stage-directions";

export function useRehearsal({
    script,
    userCharacters,
    similarityThreshold = 0.85,
    initialLineIndex = 0,
    mode = "full",
    ttsProvider = "browser",
    aiVoiceAssignments = {},
    skipCharacters = [],
    playId,
    scriptId,
    originalScriptId,
    troupeId,
    partnerCharacters = [],
    isPublicScript = false,
    showStageDirections = true,
    playbackRate = 1
}: UseRehearsalProps) {
    const browserSpeech = useSpeech();
    const aiSpeech = useAITTS();
    const { voices, listen, stop: stopSpeech, state: speechState, initializeAudio, transcript } = browserSpeech;

    const [recordings, setRecordings] = useState<any[]>([]);
    const [isPlayingRecording, setIsPlayingRecording] = useState(false);

    const engineRef = useRef<RehearsalAudioEngine>(new RehearsalAudioEngine());
    const audioQueueRef = useRef<AudioQueue>(new AudioQueue(engineRef.current));

    // Execution generation counter: incremented on every skip/next/previous/retry.
    // Each executeStep captures this value and aborts if it has changed (user moved on).
    const executionGenRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const perfRef = useRef<{ pending: { action: "start" | "next" | "previous" | "retry"; ts: number } | null }>({
        pending: null
    });
    const sourceType = useMemo<SourceType>(() => {
        if (playId && troupeId) return "troupe_play";
        if (isPublicScript) return "library_script";
        return "private_script";
    }, [playId, troupeId, isPublicScript]);

    // Pre-calculate scene characters for collective role logic
    const sceneCharactersMap = useMemo(() => getSceneCharacters(script), [script]);

    // Fetch recordings if playId is provided
    useEffect(() => {
        if (playId) {
            getPlayRecordings(playId).then(setRecordings);
        }
    }, [playId]);

    useEffect(() => {
        const sourceId = playId || scriptId;
        if (!sourceId || ttsProvider !== "google") return;

        ensureVoiceConfig(sourceType, sourceId, script.characters, troupeId).catch((e) => {
            console.warn("[Rehearsal] ensureVoiceConfig skipped/fallback", e);
        });
    }, [sourceType, playId, scriptId, ttsProvider, script.characters, troupeId]);

    useEffect(() => {
        audioQueueRef.current.clear();
    }, [sourceType, playId, scriptId, ttsProvider, showStageDirections]);

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

        // Priority 2: AI TTS (Google TTS)
        if (ttsProvider === "google") {
            const assignedVoice = characterName && aiVoiceAssignments[characterName] ? aiVoiceAssignments[characterName] : "Aoede";

            // OFFLINE CHECK
            const hash = await offlineManager.generateHash(text, assignedVoice);
            const sourceId = playId || scriptId;
            const offlineUrl = lineId ? await offlineManager.getAudio(lineId, hash, sourceId) : null;

            if (offlineUrl) {
                return new Promise((resolve) => {
                    const audio = new Audio(offlineUrl);
                    audio.playbackRate = Math.max(0.7, Math.min(1.8, playbackRate));
                    audio.onended = () => resolve();
                    audio.onerror = () => resolve();
                    audio.play().catch(() => resolve());
                });
            }

            await aiSpeech.speak(text, assignedVoice, playbackRate);
        }
        // Priority 3: Browser TTS
        else {
            await browserSpeech.speak(text, _voice, playbackRate);
        }
    };

    // Combined stop function
    const stopAll = () => {
        browserSpeech.stop();
        aiSpeech.stop();
        engineRef.current.stop();

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const playAudioFile = async (url: string): Promise<boolean> => {
        return new Promise<boolean>(async (resolve) => {
            try {
                // Pour les enregistrements (recordings) existants qui n'ont pas besoin de crossfade sophistiqué
                // ou pour simplifier avant de les migrer vers l'engine aussi.
                const audio = new Audio(url);
                engineRef.current.stop(); // Stops main engine just in case
                audio.playbackRate = Math.max(0.7, Math.min(1.8, playbackRate));
                audio.onended = () => resolve(true);
                audio.onerror = () => resolve(false);
                audio.play().catch(() => resolve(false));
            } catch (e) {
                resolve(false);
            }
        });
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
            engineRef.current.stop();
            audioQueueRef.current.clear();
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
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
        const collectiveMembers = getCollectiveMembersForLine(script, idx);

        return checkIsUserLine(script, lineChar, userCharacters, activeChars, collectiveMembers);
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

    const preloadAroundIndex = (lineIndex: number, count: number) => {
        const sourceId = playId || scriptId;
        if (!sourceId || ttsProvider !== "google") return;

        audioQueueRef.current.preload(
            script.lines,
            Math.max(0, lineIndex),
            count,
            sourceType,
            sourceId,
            originalScriptId,
            troupeId,
            showStageDirections
        );
    };

    const preparePlaybackStart = async (
        fromIndex?: number,
        onProgress?: (completed: number, total: number) => void
    ) => {
        const sourceId = playId || scriptId;
        if (!sourceId || ttsProvider !== "google") {
            if (onProgress) onProgress(1, 1);
            return { total: 0, completed: 0 };
        }

        const startIdx = Math.max(0, fromIndex ?? initialLineIndex);
        console.log(`[RehearsalPerf] priming audio buffer from line ${startIdx}`);
        return audioQueueRef.current.preloadWithProgress(
            script.lines,
            startIdx,
            30,
            sourceType,
            sourceId,
            originalScriptId,
            troupeId,
            showStageDirections,
            onProgress
        );
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
        perfRef.current.pending = { action: "start", ts: performance.now() };
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
            setTimeout(executeStart, 60);
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
        perfRef.current.pending = { action: "next", ts: performance.now() };
        transitionLockRef.current = true;
        manualSkipRef.current = true;
        executionGenRef.current++; // Invalidate any in-flight executeStep
        stopAll();
        setStatus("setup");
        retryCountRef.current = 0; // Reset retries

        const nextIdx = findNextRelevantIndex(stateRef.current.currentLineIndex, 1);
        if (nextIdx < script.lines.length) {
            setCurrentLineIndex(nextIdx);
            preloadAroundIndex(nextIdx, 30);
            const nextLine = script.lines[nextIdx];
            // Transition instantanée ou presque pour supprimer la latence
            queueMicrotask(() => {
                manualSkipRef.current = false;
                // FIX: Pass new index
                if (isUserLine(nextLine.character, nextIdx)) {
                    setStatus("listening_user");
                    playBip();
                } else {
                    setStatus("playing_other");
                }
                transitionLockRef.current = false;
            });
        } else {
            manualSkipRef.current = false;
            transitionLockRef.current = false;
            setStatus("finished");
        }
    };

    const previous = () => {
        if (!isMountedRef.current || transitionLockRef.current) return;
        perfRef.current.pending = { action: "previous", ts: performance.now() };
        transitionLockRef.current = true;
        manualSkipRef.current = true;
        executionGenRef.current++; // Invalidate any in-flight executeStep
        stopAll();
        setStatus("setup");
        retryCountRef.current = 0;

        const prevIdx = findNextRelevantIndex(stateRef.current.currentLineIndex, -1);
        if (prevIdx >= 0) {
            setCurrentLineIndex(prevIdx);
            preloadAroundIndex(Math.max(0, prevIdx - 2), 30);
            const prevLine = script.lines[prevIdx];
            queueMicrotask(() => {
                manualSkipRef.current = false;
                // FIX: Pass index
                if (isUserLine(prevLine.character, prevIdx)) {
                    setStatus("listening_user");
                    playBip();
                } else {
                    setStatus("playing_other");
                }
                transitionLockRef.current = false;
            });
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
        perfRef.current.pending = { action: "retry", ts: performance.now() };
        transitionLockRef.current = true;
        manualSkipRef.current = true;
        executionGenRef.current++; // Invalidate any in-flight executeStep
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
        queueMicrotask(() => {
            manualSkipRef.current = false;
            // FIX: Pass index
            if (isUserLine(line.character, currentIdx)) {
                setStatus("listening_user");
                playBip();
            } else {
                setStatus("playing_other");
            }
            transitionLockRef.current = false;
        });
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
            // Capture the current execution generation. If it changes during async
            // operations, it means the user skipped — we must abort immediately.
            const myGen = executionGenRef.current;
            const isStale = () => executionGenRef.current !== myGen;

            const line = script.lines[currentLineIndex];
            if (!line) {
                setStatus("finished");
                return;
            }

            // Sliding buffer around current line for smoother playback/navigation.
            preloadAroundIndex(Math.max(0, currentLineIndex - 2), 30);

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
                    await playAudioFile(recording.audio_url);
                    setIsPlayingRecording(false);
                    if (!isMountedRef.current || isStale()) return;
                    if (statusRef.current === "playing_other" && !manualSkipRef.current) next();
                    return;
                }

                const voice = voiceAssignments[line.character];
                try {
                    abortControllerRef.current = new AbortController();

                    // Priority 1: Use RehearsalAudioEngine for Gapless Sequences if TTS is Google
                    if (ttsProvider === "google") {
                        const sourceId = playId || scriptId;
                        if (sourceId) {
                            // Extract valid URLs for all segments in the line
                            const segments = parseSegments(line.text);
                            const urlsToPlay: string[][] = [];
                            const resolvedLineChar = resolveLineCharacter(script, line.character);

                            for (let i = 0; i < segments.length; i++) {
                                const segment = segments[i];
                                if (!segment.text.trim()) continue;
                                if (!showStageDirections && segment.isDirection) continue;

                                const fallbacks = audioQueueRef.current.getUrls(
                                    segment.text,
                                    segment.isDirection ? "didascalies" : resolvedLineChar,
                                    currentLineIndex,
                                    sourceType,
                                    sourceId,
                                    originalScriptId,
                                    troupeId,
                                    segment.isDirection,
                                    line.id,
                                    i
                                );

                                if (fallbacks && fallbacks.length > 0) urlsToPlay.push(fallbacks);
                            }

                            if (urlsToPlay.length > 0) {
                                // Double check state before playing
                                if (isStale() || manualSkipRef.current) return;

                                // Find previous text for smart gap calculations, if we just came from another line
                                const prevIdx = findNextRelevantIndex(currentLineIndex, -1);
                                const prevText = prevIdx >= 0 ? script.lines[prevIdx].text : "";

                                await engineRef.current.playSegments(
                                    urlsToPlay,
                                    prevText,
                                    playbackRate,
                                    abortControllerRef.current.signal
                                );

                                if (!isMountedRef.current || isStale() || manualSkipRef.current) return;
                                if (statusRef.current === "playing_other") {
                                    next();
                                }
                                return; // Exit execution, engine handled it
                            }
                        }
                    }

                    // Priority 2: Fallback to simple speech API (Browser TTS usually, or missed audio generation)
                    let textSequence: { text: string; isDirection: boolean }[] = [];
                    const segments = parseSegments(line.text);

                    if (!showStageDirections) {
                        const dialogueText = segments
                            .filter(s => !s.isDirection)
                            .map(s => s.text)
                            .join("")
                            .trim();
                        if (dialogueText) textSequence.push({ text: dialogueText, isDirection: false });
                    } else {
                        for (const s of segments) {
                            if (!s.text.trim()) continue;
                            const cleanText = s.isDirection ? s.text.replace(/^\s*\(|\)\s*$/g, "").trim() : s.text.trim();
                            if (cleanText) textSequence.push({ text: cleanText, isDirection: s.isDirection });
                        }
                    }

                    const resolvedLineChar = resolveLineCharacter(script, line.character);

                    for (const item of textSequence) {
                        if (!isMountedRef.current || manualSkipRef.current || isStale()) return;

                        const assignedVoice = item.isDirection
                            ? undefined
                            : (voice || (COLLECTIVE_ROLES.has(resolvedLineChar) ? getCollectiveVoice(currentLineIndex) : undefined));

                        await speak(item.text, assignedVoice, item.isDirection ? "didascalies" : resolvedLineChar, line.id);
                    }

                    if (!isMountedRef.current || isStale() || manualSkipRef.current) return;
                    if (statusRef.current === "playing_other") {
                        next();
                    }
                } catch (e) {
                    // Abort errors are expected when skipping
                    if (e instanceof Error && e.message === "Playback aborted") return;
                    if (!manualSkipRef.current) next();
                }
            } else if (status === "listening_user") {
                try {
                    // FIX: Estimated Duration increased to 70ms per char (theatrical speed)
                    // but ONLY on spoken text (without stage directions)
                    const spokenText = stripStageDirections(line.text);
                    const estimatedDuration = Math.max(spokenText.length * 70, 2000);

                    // FIX: Pass the expected text for EARLY EXIT, Play Context, and Threshold for phonetic fixes
                    const transcript = await listen(estimatedDuration, spokenText, script.title, similarityThreshold);
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
                            const correctedSpokenText = spokenText.trim() || line.text;

                            // Restore full correction: "Tu as dit X. Il fallait dire Y."
                            // DELAY: Wait for mic to fully release before speaking (fix for iPhone cutoff)
                            await new Promise(r => setTimeout(r, 200));
                            await speak(`Tu as dit : ${transcript}. Il fallait dire : ${correctedSpokenText}. ${hintAudio}`, voiceAssignments["ASSISTANT"], "ASSISTANT");

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

    useEffect(() => {
        const pending = perfRef.current.pending;
        if (!pending) return;
        if (status !== "playing_other" && status !== "listening_user") return;

        const elapsed = Math.round(performance.now() - pending.ts);
        console.log(`[RehearsalPerf] ${pending.action} ready in ${elapsed}ms (line ${currentLineIndex})`);
        perfRef.current.pending = null;
    }, [status, currentLineIndex]);

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
        preparePlaybackStart,
        isPlayingRecording,
        retryCount: retryCountRef.current
    };
}
