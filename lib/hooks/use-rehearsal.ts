import { useState, useEffect, useRef } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useSpeech } from "./use-speech";
import { calculateSimilarity } from "../similarity";

export type RehearsalStatus =
    | "setup"
    | "playing_other"
    | "listening_user"
    | "evaluating"
    | "waiting_feedback"
    | "error"
    | "finished";

interface UseRehearsalProps {
    script: ParsedScript;
    userCharacter: string;
}

export function useRehearsal({ script, userCharacter }: UseRehearsalProps) {
    const { speak, listen, stop: stopSpeech, state: speechState, voices } = useSpeech();

    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [status, setStatus] = useState<RehearsalStatus>("setup");
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [lastTranscript, setLastTranscript] = useState("");

    // Ref to track auto-play preventing stale closures
    const stateRef = useRef({ currentLineIndex, status, userCharacter });
    useEffect(() => {
        stateRef.current = { currentLineIndex, status, userCharacter };
    }, [currentLineIndex, status, userCharacter]);

    // Voice Assignment Logic
    const [characterVoices, setCharacterVoices] = useState<Record<string, SpeechSynthesisVoice>>({});
    const [prompterVoice, setPrompterVoice] = useState<SpeechSynthesisVoice | undefined>(undefined);

    useEffect(() => {
        if (voices.length > 0 && script.characters.length > 0) {
            const available = voices.filter(v => v.lang.startsWith("fr"));
            const assignments: Record<string, SpeechSynthesisVoice> = {};

            // Reserve the first voice for the Souffleur (System)
            // Use a specific "Google" voice if possible for neutral system feel, or just the first one
            const systemVoice = available.find(v => v.name.includes("Google")) || available[0];
            setPrompterVoice(systemVoice);

            // Filter out the system voice for characters to avoid confusion
            const characterPool = available.filter(v => v !== systemVoice);

            script.characters.forEach((char, index) => {
                if (char !== userCharacter) {
                    // unexpected fallback if pool is empty: use system voice
                    assignments[char] = characterPool[index % characterPool.length] || systemVoice;
                }
            });
            setCharacterVoices(assignments);
        }
    }, [voices, script.characters, userCharacter]);


    // Main Flow Control
    const processCurrentLine = async () => {
        const line = script.lines[stateRef.current.currentLineIndex];
        if (!line) {
            setStatus("finished");
            return;
        }

        // Check if user is one of the characters (handles direct match + "YVONNE et LUCIEN")
        if (line.character.includes(userCharacter)) {
            // It's the user's turn
            setStatus("listening_user");
            try {
                const transcript = await listen();
                setLastTranscript(transcript);
                setStatus("evaluating");

                // Check correctness
                const similarity = calculateSimilarity(transcript, line.text);
                console.log(`Matching "${transcript}" vs "${line.text}" -> Score: ${similarity}`);

                if (similarity > 0.95) { // Strict 95% accuracy (allowing for minor Speech API quirks)
                    setFeedback("correct");
                    await speak("Bien joué !", prompterVoice);
                    setFeedback(null);
                    next();
                } else {
                    setFeedback("incorrect");
                    // Souffleur logic: speak the correct line then retry
                    await speak(`Tu as dit : ${transcript}. Il fallait dire : ${line.text}`, prompterVoice);

                    setStatus("listening_user"); // Retry
                    setFeedback(null);
                    processCurrentLine(); // Recursive retry
                }

            } catch (e) {
                console.error("Listening failed", e);
                setStatus("error");
            }
        } else {
            // It's another character's turn
            setStatus("playing_other");
            const voice = characterVoices[line.character];
            speak(line.text, voice);

            // We rely on 'speak' onEnd to trigger next? 
            // useSpeech callback handling is tricky inside this loop.
            // Better: monitor speechState.
        }
    };

    // Watch speech state to auto-advance when OTHER finishes speaking
    useEffect(() => {
        // Logic: If we were playing_other and now we are idle, advance.
        if (status === "playing_other" && speechState === "idle") {
            // Add small delay for natural pacing
            const timer = setTimeout(() => {
                next();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [speechState, status]);


    const start = () => {
        setCurrentLineIndex(0);
        processCurrentLine(); // Boot loop
    };

    const next = () => {
        const nextIdx = stateRef.current.currentLineIndex + 1;
        if (nextIdx < script.lines.length) {
            setCurrentLineIndex(nextIdx);
            // We need to trigger processing for the new line
            // But we must wait for state update. 
            // A useEffect on currentLineIndex could trigger it?
            // Or we just call a stable "play" function.
        } else {
            setStatus("finished");
        }
    };

    // Re-trigger process when index changes, BUT only if we are "live"
    // This is the tricky part of async React state.
    // Let's simplify: exposed 'next' just updates index. A robust effect handles "what do do at this index".

    useEffect(() => {
        if (status !== "setup" && status !== "finished") {
            processCurrentLine();
        }
    }, [currentLineIndex]);
    // Warning: processCurrentLine is not redundant? 
    // If we advance index, the effect runs. 
    // If it's user turn, it calls listen(). 
    // If it's other turn, it calls speak().

    const retry = () => {
        if (status === "error" || status === "listening_user") {
            processCurrentLine();
        }
    };

    const validateManually = () => {
        if (status === "listening_user" || status === "error") {
            // Stop any listening
            stopSpeech();
            // Mark as correct and move on
            setFeedback("correct");
            setTimeout(() => {
                setFeedback(null);
                next();
            }, 500);
        }
    };

    return {
        currentLine: script.lines[currentLineIndex],
        currentLineIndex,
        totalLines: script.lines.length,
        status,
        feedback,
        lastTranscript,
        start,
        skip: next,
        retry,
        validateManually,
        stop: stopSpeech,
        voices: characterVoices
    };
}
