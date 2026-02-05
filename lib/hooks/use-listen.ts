import { useState, useEffect, useRef, useCallback } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useRehearsalVoices } from "./use-rehearsal-voices";
import { getPlayRecordings } from "../actions/recordings";
import { synthesizeSpeechWithPlayCache } from "@/app/actions/tts";
import { determineSourceType, type SourceType, ensureVoiceConfig } from "../actions/voice-cache";
import { playLineSequentially } from "../audio/sequencer";
import { AudioQueue } from "../audio/audio-queue";

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
    showStageDirections?: boolean;
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
    openaiVoiceAssignments = {}
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
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    // Audio Queue Ref (Singleton per component life)
    const audioQueueRef = useRef<AudioQueue>(new AudioQueue());

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
        // Clear queue on source change to avoid stale data
        audioQueueRef.current.clear();
    }, [isPublicScript, troupeId, playId, ttsProvider, scriptId, script.characters]);

    // PRELOADING EFFECT
    // Whenever currentLineIndex changes, preload the next 3 lines
    useEffect(() => {
        if (ttsProvider !== "openai" || status === "finished") return;

        const sourceId = playId || scriptId || "";
        if (!sourceId) return;

        // Preload next 3 lines (lookahead)
        // start from current + 1
        audioQueueRef.current.preload(
            script.lines,
            currentLineIndex + 1,
            3,
            sourceType,
            sourceId,
            troupeId,
            showStageDirections ?? true
        );

        // Also preload CURRENT line if just starting (in case it wasn't preloaded)
        if (status === "setup" || status === "playing") {
            audioQueueRef.current.preload(
                script.lines,
                currentLineIndex,
                1,
                sourceType,
                sourceId,
                troupeId,
                showStageDirections ?? true
            );
        }

    }, [currentLineIndex, script.lines, sourceType, playId, scriptId, troupeId, showStageDirections, ttsProvider, status]);


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
            audioQueueRef.current.clear(); // Clear memory
        };
    }, []);

    // ... (HELPERS: isUserLine, shouldSkipLine, relevantIndices - unchanged) ...
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
                    await speakDirect(line.character);
                    if (!isValid()) return;
                    await new Promise(r => setTimeout(r, 100));
                    if (!isValid()) return;
                }

                // 2. Play the line
                const sourceId = playId || scriptId || "";
                const recording = recordings.find(r => r.line_id === line.id);

                if (recording) {
                    // User recording - Play full file
                    if (!isValid()) return;
                    await playAudioFile(recording.audio_url);
                } else {
                    // TTS - Use Sequencer for Mixed Voices
                    await playLineSequentially(
                        line,
                        showStageDirections ?? true,
                        async (textToSpeak, isDirection) => {
                            if (!isValid()) return;

                            if (ttsProvider === "openai" && sourceId && line.character) {
                                // OpenAI TTS - USE QUEUE
                                setIsLoadingAudio(true);
                                let audioPlayed = false;
                                try {
                                    // Use AudioQueue instead of direct server call
                                    const audioUrl = await audioQueueRef.current.getUrl(
                                        textToSpeak,
                                        isDirection ? "didascalies" : line.character,
                                        currentLineIndex,
                                        sourceType,
                                        sourceId,
                                        troupeId,
                                        isDirection
                                    );

                                    if (!isValid()) { setIsLoadingAudio(false); return; }

                                    if (audioUrl) {
                                        await playAudioFile(audioUrl);
                                        audioPlayed = true;
                                    }
                                } catch (e) {
                                    console.error("[Listen] OpenAI TTS failed:", e);
                                }
                                setIsLoadingAudio(false);

                                // Fallback
                                if (!audioPlayed && isValid()) {
                                    const browserVoice = isDirection ? voiceAssignments["didascalies"] : voiceAssignments[line.character];
                                    await speakDirect(textToSpeak, browserVoice);
                                }
                            } else {
                                // Browser TTS
                                const browserVoice = isDirection ? voiceAssignments["didascalies"] : voiceAssignments[line.character];
                                await speakDirect(textToSpeak, browserVoice);
                            }
                        }
                    );
                }

                if (!isValid()) return;

                // 3. Small pause before next
                await new Promise(r => setTimeout(r, 600));
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
