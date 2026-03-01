"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useAITTS, type TTSProvider } from "./use-ai-tts";
import { useRehearsalVoices } from "./use-rehearsal-voices";
import { getPlayRecordings } from "../actions/recordings";
import { determineSourceType, type SourceType, ensureVoiceConfig } from "../actions/voice-cache";
import { RehearsalAudioEngine } from "../audio/gapless-player";
import { AudioQueue } from "../audio/audio-queue";
import { getCollectiveMembersForLine, getSceneCharacters, getSceneStartIndexForLine, isUserLine as checkIsUserLine, resolveLineCharacter } from "../utils";
import { COLLECTIVE_ROLES } from "../constants";
import { parseSegments } from "../utils/stage-directions";


export type ListenStatus = "setup" | "playing" | "paused" | "finished";
export type ListenMode = "full" | "cue" | "check";

interface UseListenProps {
    script: ParsedScript;
    userCharacters: string[];
    mode?: ListenMode;
    ttsProvider?: TTSProvider;
    announceCharacter?: boolean;
    initialLineIndex?: number;
    skipCharacters?: string[];
    playId?: string;
    scriptId?: string;
    isPublicScript?: boolean;
    troupeId?: string;
    showStageDirections?: boolean;
    playbackRate?: number;
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
}

export function useListen({
    script,
    userCharacters,
    mode = "full",
    ttsProvider = "browser",
    announceCharacter = false,
    initialLineIndex = 0,
    skipCharacters = [],
    playId,
    scriptId,
    isPublicScript = false,
    troupeId,
    showStageDirections = true,
    playbackRate = 1,
}: UseListenProps): UseListenReturn {
    // State
    const [currentLineIndex, setCurrentLineIndex] = useState(initialLineIndex);
    const [status, setStatus] = useState<ListenStatus>("setup");
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [recordings, setRecordings] = useState<any[]>([]);
    const [sourceType, setSourceType] = useState<SourceType>("private_script");
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Refs
    const isMountedRef = useRef(true);
    const sessionRef = useRef(0);
    const engineRef = useRef<RehearsalAudioEngine>(new RehearsalAudioEngine());
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioQueueRef = useRef<AudioQueue>(new AudioQueue(engineRef.current));

    // Hooks
    const aiSpeech = useAITTS();
    const { voiceAssignments, setVoiceForRole } = useRehearsalVoices(script, voices);

    // Pre-calculate scene characters for collective role logic
    const sceneCharactersMap = useMemo(() => getSceneCharacters(script), [script]);

    const getCollectiveVoice = useCallback((lineIndex: number): SpeechSynthesisVoice | undefined => {
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
    }, [script.scenes, sceneCharactersMap, voiceAssignments]);


    // Load voices
    useEffect(() => {
        if (typeof window === "undefined") return;

        const loadVoices = () => {
            const v = window.speechSynthesis.getVoices();
            if (v.length > 0) setVoices(v);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            if (typeof window !== "undefined") {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    // Initial setup
    useEffect(() => {
        const init = async () => {
            const type = await determineSourceType(isPublicScript, troupeId, playId);
            setSourceType(type);

            if (ttsProvider === "google") {
                const sourceId = playId || scriptId || "";
                if (sourceId && script.characters) {
                    await ensureVoiceConfig(type, sourceId, script.characters, troupeId);
                }
            }
        };
        init();
        audioQueueRef.current.clear();
    }, [isPublicScript, troupeId, playId, ttsProvider, scriptId, script.characters]);

    useEffect(() => {
        if (ttsProvider !== "google" || status === "finished") return;

        const sourceId = playId || scriptId || "";
        if (!sourceId) return;

        // Preload
        audioQueueRef.current.preload(
            script.lines,
            currentLineIndex,
            4,
            sourceType,
            sourceId,
            script.original_script_id,
            troupeId,
            showStageDirections ?? true
        );
    }, [currentLineIndex, script.lines, sourceType, playId, scriptId, troupeId, showStageDirections, ttsProvider, status, script.original_script_id]);

    // Load recordings
    useEffect(() => {
        if (playId) getPlayRecordings(playId).then(setRecordings);
    }, [playId]);

    // Cleanup
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            window.speechSynthesis?.cancel();
            currentAudioRef.current?.pause();
            engineRef.current.stop();
            audioQueueRef.current.clear();
            abortControllerRef.current?.abort();
        };
    }, []);

    // === HELPERS ===
    const isUserLine = useCallback((char: string, index: number) => {
        const sceneStartIdx = getSceneStartIndexForLine(script, index);
        const activeChars = sceneCharactersMap.get(sceneStartIdx);
        const collectiveMembers = getCollectiveMembersForLine(script, index);
        return checkIsUserLine(script, char, userCharacters, activeChars, collectiveMembers);
    }, [sceneCharactersMap, script, userCharacters]);

    const shouldSkipLine = useCallback((char: string) => {
        const n = char.toLowerCase().trim();
        return skipCharacters.some(s => n === s.toLowerCase().trim());
    }, [skipCharacters]);

    const relevantIndices = useMemo((): number[] => {
        const indices: number[] = [];
        for (let i = 0; i < script.lines.length; i++) {
            const line = script.lines[i];
            if (shouldSkipLine(line.character)) continue;

            if (mode === "full") {
                indices.push(i);
            } else if (mode === "check") {
                if (isUserLine(line.character, i)) indices.push(i);
            } else if (mode === "cue") {
                if (isUserLine(line.character, i)) {
                    indices.push(i);
                } else {
                    let next = i + 1;
                    while (next < script.lines.length && shouldSkipLine(script.lines[next].character)) next++;
                    if (next < script.lines.length && isUserLine(script.lines[next].character, next)) indices.push(i);
                }
            }
        }
        return indices;
    }, [script.lines, mode, isUserLine, shouldSkipLine]);

    const findNextIndex = useCallback((current: number, dir: 1 | -1): number | null => {
        const pos = relevantIndices.indexOf(current);

        if (dir === 1) {
            if (pos === -1) {
                const next = relevantIndices.find(i => i > current);
                return next !== undefined ? next : null;
            }
            return pos < relevantIndices.length - 1 ? relevantIndices[pos + 1] : null;
        } else {
            if (pos === -1) {
                const prev = [...relevantIndices].reverse().find(i => i < current);
                return prev !== undefined ? prev : null;
            }
            return pos > 0 ? relevantIndices[pos - 1] : null;
        }
    }, [relevantIndices]);

    // Progress
    const totalRelevantLines = relevantIndices.length;
    const currentRelevantIndex = relevantIndices.indexOf(currentLineIndex) + 1;
    const progress = totalRelevantLines > 0 ? Math.round((currentRelevantIndex / totalRelevantLines) * 100) : 0;

    // === CORE CONTROLS ===
    const stopEverything = useCallback(() => {
        sessionRef.current++;
        if (typeof window !== "undefined") window.speechSynthesis.cancel();
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.src = "";
            currentAudioRef.current = null;
        }
        engineRef.current.stop();
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        aiSpeech.stop();
        setIsLoadingAudio(false);
    }, [aiSpeech]);

    const speakDirect = useCallback((text: string, voice?: SpeechSynthesisVoice): Promise<void> => {
        return new Promise((resolve) => {
            if (typeof window === "undefined" || !window.speechSynthesis) return resolve();

            const session = sessionRef.current;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "fr-FR";
            if (voice) utterance.voice = voice;
            utterance.rate = Math.max(0.7, Math.min(1.8, playbackRate));

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            if (session !== sessionRef.current) return resolve();
            window.speechSynthesis.speak(utterance);
        });
    }, [playbackRate]);

    const playAudioFile = useCallback((url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const session = sessionRef.current;
            const audio = new Audio(url);
            audio.playbackRate = Math.max(0.7, Math.min(1.8, playbackRate));
            currentAudioRef.current = audio;

            audio.onended = () => {
                if (currentAudioRef.current === audio) currentAudioRef.current = null;
                resolve(true); // Success
            };
            audio.onerror = () => {
                if (currentAudioRef.current === audio) currentAudioRef.current = null;
                resolve(false); // Playback failed (e.g. 404)
            };

            if (session !== sessionRef.current) return resolve(false);
            audio.play().catch(() => resolve(false));
        });
    }, [playbackRate]);

    const start = useCallback(() => {
        stopEverything();
        const first = relevantIndices.find(i => i >= initialLineIndex) ?? relevantIndices[0];
        if (first === undefined) return setStatus("finished");
        setCurrentLineIndex(first);
        setStatus("playing");
    }, [initialLineIndex, relevantIndices, stopEverything]);

    const next = useCallback(() => {
        stopEverything();
        const nextIdx = findNextIndex(currentLineIndex, 1);
        if (nextIdx !== null) {
            setCurrentLineIndex(nextIdx);
            setStatus("playing");
        } else {
            setStatus("finished");
        }
    }, [currentLineIndex, findNextIndex, stopEverything]);

    const previous = useCallback(() => {
        stopEverything();
        const prevIdx = findNextIndex(currentLineIndex, -1);
        if (prevIdx !== null) {
            setCurrentLineIndex(prevIdx);
            setStatus("playing");
        }
    }, [currentLineIndex, findNextIndex, stopEverything]);

    const replay = useCallback(() => {
        stopEverything();
        setStatus("setup");
        setTimeout(() => setStatus("playing"), 50);
    }, [stopEverything]);

    const pause = useCallback(() => {
        stopEverything();
        setStatus("paused");
    }, [stopEverything]);

    const resume = useCallback(() => {
        if (status === "paused") setStatus("playing");
    }, [status]);

    const stop = useCallback(() => {
        stopEverything();
        setStatus("setup");
    }, [stopEverything]);

    // === MAIN ENGINE ===
    useEffect(() => {
        if (status !== "playing") return;

        const line = script.lines[currentLineIndex];
        if (!line) return setStatus("finished");

        const session = sessionRef.current;
        const isValid = () => session === sessionRef.current && isMountedRef.current;

        const run = async () => {
            try {
                if (announceCharacter) {
                    if (!isValid()) return;
                    await speakDirect(line.character);
                    if (!isValid()) return;
                    await new Promise(r => setTimeout(r, Math.round(100 / playbackRate)));
                }

                if (!isValid()) return;
                const sourceId = playId || scriptId || "";
                const recording = recordings.find(r => r.line_id === line.id);

                if (recording) {
                    await playAudioFile(recording.audio_url);
                } else {
                    abortControllerRef.current = new AbortController();

                    if (ttsProvider === "google" && sourceId && line.character) {
                        setIsLoadingAudio(true);
                        try {
                            const resolvedLineChar = resolveLineCharacter(script, line.character);
                            const segments = parseSegments(line.text);
                            const urlsToPlay: string[][] = [];

                            for (let i = 0; i < segments.length; i++) {
                                const segment = segments[i];
                                if (!segment.text.trim()) continue;
                                if (!(showStageDirections ?? true) && segment.isDirection) continue;

                                const fallbacks = audioQueueRef.current.getUrls(
                                    segment.text,
                                    segment.isDirection ? "didascalies" : resolvedLineChar,
                                    currentLineIndex,
                                    sourceType,
                                    sourceId,
                                    script.original_script_id,
                                    troupeId,
                                    segment.isDirection,
                                    line.id,
                                    i
                                );
                                if (fallbacks && fallbacks.length > 0) urlsToPlay.push(fallbacks);
                            }

                            if (urlsToPlay.length > 0) {
                                if (!isValid()) return;

                                const prevIdx = findNextIndex(currentLineIndex, -1);
                                const prevText = prevIdx !== null ? script.lines[prevIdx].text : "";

                                await engineRef.current.playSegments(
                                    urlsToPlay,
                                    prevText,
                                    playbackRate,
                                    abortControllerRef.current.signal
                                );
                            } else {
                                // Fallback to browser TTS entirely for the line if no URLs
                                throw new Error("No URLs found");
                            }
                        } catch (e) {
                            if (e instanceof Error && e.message === "Playback aborted") return;

                            console.warn(`[Listen] AI TTS failed, falling back to browser TTS.`, e);
                            if (isValid()) {
                                const segments = parseSegments(line.text);
                                const resolvedLineChar = resolveLineCharacter(script, line.character);

                                for (const segment of segments) {
                                    if (!isValid()) return;
                                    if (!segment.text.trim()) continue;
                                    if (!(showStageDirections ?? true) && segment.isDirection) continue;

                                    const cleanText = segment.isDirection ? segment.text.replace(/^\s*\(|\)\s*$/g, "").trim() : segment.text.trim();

                                    const bVoice = segment.isDirection
                                        ? voiceAssignments["didascalies"]
                                        : (voiceAssignments[resolvedLineChar] || (COLLECTIVE_ROLES.has(resolvedLineChar) ? getCollectiveVoice(currentLineIndex) : undefined));

                                    await speakDirect(cleanText, bVoice);
                                }
                            }
                        } finally {
                            if (isValid()) {
                                setIsLoadingAudio(false);
                            }
                        }
                    } else {
                        const segments = parseSegments(line.text);
                        const resolvedLineChar = resolveLineCharacter(script, line.character);

                        for (const segment of segments) {
                            if (!isValid()) return;
                            if (!segment.text.trim()) continue;
                            if (!(showStageDirections ?? true) && segment.isDirection) continue;

                            const cleanText = segment.isDirection ? segment.text.replace(/^\s*\(|\)\s*$/g, "").trim() : segment.text.trim();

                            const bVoice = segment.isDirection
                                ? voiceAssignments["didascalies"]
                                : (voiceAssignments[resolvedLineChar] || (COLLECTIVE_ROLES.has(resolvedLineChar) ? getCollectiveVoice(currentLineIndex) : undefined));

                            await speakDirect(cleanText, bVoice);
                        }
                    }
                }

                if (!isValid()) return;
                await new Promise(r => setTimeout(r, Math.round(600 / playbackRate)));
                if (!isValid()) return;

                const nextIdx = findNextIndex(currentLineIndex, 1);
                if (nextIdx !== null) {
                    setCurrentLineIndex(nextIdx);
                } else {
                    setStatus("finished");
                }
            } catch (e) {
                console.error("[Listen] Engine error:", e);
                if (isValid()) {
                    setIsLoadingAudio(false);
                }
            }
        };

        run();
    }, [status, currentLineIndex, script.lines, announceCharacter, recordings,
        ttsProvider, sourceType, playId, scriptId, troupeId, voiceAssignments,
        speakDirect, playAudioFile, findNextIndex, showStageDirections, playbackRate]);

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
        setVoiceForRole
    };
}
