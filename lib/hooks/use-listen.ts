import { useState, useEffect, useRef, useCallback } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useRehearsalVoices } from "./use-rehearsal-voices";
import { getPlayRecordings } from "../actions/recordings";
import { synthesizeSpeechWithPlayCache } from "@/app/actions/tts";
import { determineSourceType, type SourceType, ensureVoiceConfig } from "../actions/voice-cache";

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
    troupeId
}: UseListenProps): UseListenReturn {
    // State
    const [currentLineIndex, setCurrentLineIndex] = useState(initialLineIndex);
    const [status, setStatus] = useState<ListenStatus>("setup");
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [recordings, setRecordings] = useState<any[]>([]);
    const [sourceType, setSourceType] = useState<SourceType>("private_script");
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Refs - CRITICAL: sessionRef is used to invalidate all pending operations
    const isMountedRef = useRef(true);
    const sessionRef = useRef(0);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Voice assignments
    const { voiceAssignments, setVoiceForRole } = useRehearsalVoices(script, voices);

    // Load voices
    useEffect(() => {
        if (typeof window === "undefined") return;

        const loadVoices = () => {
            const v = window.speechSynthesis.getVoices();
            if (v.length > 0) setVoices(v);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    // Load source type AND ensure voice config
    useEffect(() => {
        const init = async () => {
            const type = await determineSourceType(isPublicScript, troupeId, playId);
            setSourceType(type);

            // Auto-configure voices if using OpenAI
            if (ttsProvider === "openai") {
                const sourceId = playId || scriptId || "";
                if (sourceId && script.characters) {
                    await ensureVoiceConfig(type, sourceId, script.characters, troupeId);
                }
            }
        };
        init();
    }, [isPublicScript, troupeId, playId, ttsProvider, scriptId, script.characters]);

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
        };
    }, []);

    // === HELPERS ===
    const isUserLine = useCallback((char: string) => {
        if (!char || !userCharacters?.length) return false;
        const n = char.toLowerCase().trim();
        return userCharacters.some(u => n === u.toLowerCase().trim() || n.includes(u.toLowerCase().trim()));
    }, [userCharacters]);

    const shouldSkipLine = useCallback((char: string) => {
        const n = char.toLowerCase().trim();
        return skipCharacters.some(s => n === s.toLowerCase().trim());
    }, [skipCharacters]);

    const relevantIndices = useCallback((): number[] => {
        const indices: number[] = [];
        for (let i = 0; i < script.lines.length; i++) {
            const line = script.lines[i];
            if (shouldSkipLine(line.character)) continue;

            if (mode === "full") {
                indices.push(i);
            } else if (mode === "check") {
                if (isUserLine(line.character)) indices.push(i);
            } else if (mode === "cue") {
                if (isUserLine(line.character)) {
                    indices.push(i);
                } else {
                    let next = i + 1;
                    while (next < script.lines.length && shouldSkipLine(script.lines[next].character)) next++;
                    if (next < script.lines.length && isUserLine(script.lines[next].character)) indices.push(i);
                }
            }
        }
        return indices;
    }, [script.lines, mode, isUserLine, shouldSkipLine]);

    // Progress
    const allRelevant = relevantIndices();
    const totalRelevantLines = allRelevant.length;
    const currentRelevantIndex = allRelevant.indexOf(currentLineIndex) + 1;
    const progress = totalRelevantLines > 0 ? Math.round((currentRelevantIndex / totalRelevantLines) * 100) : 0;

    // === CORE: Stop everything ===
    const stopEverything = useCallback(() => {
        // Increment session to invalidate ALL pending operations
        sessionRef.current++;

        // Stop browser TTS
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // Stop audio element
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.src = "";
            currentAudioRef.current = null;
        }
    }, []);

    // === CORE: Speak text using direct API ===
    const speakDirect = useCallback((text: string, voice?: SpeechSynthesisVoice): Promise<void> => {
        return new Promise((resolve) => {
            if (typeof window === "undefined" || !window.speechSynthesis) {
                resolve();
                return;
            }

            const session = sessionRef.current;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "fr-FR";
            if (voice) utterance.voice = voice;

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            // Check session before speaking
            if (session !== sessionRef.current) {
                resolve();
                return;
            }

            window.speechSynthesis.speak(utterance);
        });
    }, []);

    // === CORE: Play audio file ===
    const playAudioFile = useCallback((url: string): Promise<void> => {
        return new Promise((resolve) => {
            const session = sessionRef.current;
            const audio = new Audio(url);
            currentAudioRef.current = audio;

            audio.onended = () => {
                if (currentAudioRef.current === audio) currentAudioRef.current = null;
                resolve();
            };
            audio.onerror = () => {
                if (currentAudioRef.current === audio) currentAudioRef.current = null;
                resolve();
            };

            if (session !== sessionRef.current) {
                resolve();
                return;
            }

            audio.play().catch(() => resolve());
        });
    }, []);

    // === Navigation helpers ===
    const findNextIndex = useCallback((current: number, dir: 1 | -1): number | null => {
        const indices = relevantIndices();
        const pos = indices.indexOf(current);

        if (dir === 1) {
            if (pos === -1) {
                const next = indices.find(i => i > current);
                return next !== undefined ? next : null;
            }
            return pos < indices.length - 1 ? indices[pos + 1] : null;
        } else {
            if (pos === -1) {
                const prev = [...indices].reverse().find(i => i < current);
                return prev !== undefined ? prev : null;
            }
            return pos > 0 ? indices[pos - 1] : null;
        }
    }, [relevantIndices]);

    // === CONTROLS ===
    const start = useCallback(() => {
        stopEverything();
        const indices = relevantIndices();
        const first = indices.find(i => i >= initialLineIndex) ?? indices[0];
        if (first === undefined) {
            setStatus("finished");
            return;
        }
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

    // === MAIN PLAYBACK ENGINE ===
    useEffect(() => {
        if (status !== "playing") return;

        const line = script.lines[currentLineIndex];
        if (!line) {
            setStatus("finished");
            return;
        }

        // Capture session at start
        const session = sessionRef.current;
        const isValid = () => session === sessionRef.current && isMountedRef.current;

        const run = async () => {
            try {
                // 1. Announce character if enabled
                if (announceCharacter) {
                    if (!isValid()) return;
                    await speakDirect(`${line.character} dit :`);
                    if (!isValid()) return;
                    await new Promise(r => setTimeout(r, 100));
                    if (!isValid()) return;
                }

                // 2. Play the line
                const sourceId = playId || scriptId || "";
                const recording = recordings.find(r => r.line_id === line.id);

                if (recording) {
                    // User recording
                    if (!isValid()) return;
                    await playAudioFile(recording.audio_url);
                } else if (ttsProvider === "openai" && sourceId && line.character) {
                    // OpenAI TTS
                    if (!isValid()) return;
                    setIsLoadingAudio(true);
                    let audioPlayed = false;
                    try {
                        console.log("[Listen] Requesting OpenAI TTS for:", line.text.substring(0, 50));
                        const result = await synthesizeSpeechWithPlayCache(
                            line.text, line.character, currentLineIndex,
                            sourceType, sourceId, troupeId
                        );
                        console.log("[Listen] OpenAI TTS result:", result);
                        if (!isValid()) { setIsLoadingAudio(false); return; }
                        if ("audio" in result && result.audio) {
                            console.log("[Listen] Playing audio URL:", result.audio.substring(0, 100));
                            await playAudioFile(result.audio);
                            audioPlayed = true;
                        } else {
                            console.warn("[Listen] No audio in result, falling back to browser TTS");
                        }
                    } catch (e) {
                        console.error("[Listen] OpenAI TTS failed:", e);
                    }
                    setIsLoadingAudio(false);

                    // Fallback to browser TTS if OpenAI didn't produce audio
                    if (!audioPlayed && isValid()) {
                        console.log("[Listen] Using browser TTS fallback");
                        const voice = voiceAssignments[line.character];
                        await speakDirect(line.text, voice);
                    }
                } else {
                    // Browser TTS
                    if (!isValid()) return;
                    const voice = voiceAssignments[line.character];
                    await speakDirect(line.text, voice);
                }

                if (!isValid()) return;

                // 3. Small pause before next
                await new Promise(r => setTimeout(r, 150));
                if (!isValid()) return;

                // 4. Auto-advance
                const nextIdx = findNextIndex(currentLineIndex, 1);
                if (nextIdx !== null) {
                    setCurrentLineIndex(nextIdx);
                } else {
                    setStatus("finished");
                }
            } catch (e) {
                console.error("[Listen] Error:", e);
            }
        };

        run();
    }, [status, currentLineIndex, script.lines, announceCharacter, recordings,
        ttsProvider, sourceType, playId, scriptId, troupeId, voiceAssignments,
        speakDirect, playAudioFile, findNextIndex]);

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
