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
    | "paused"
    | "finished";

interface UseRehearsalProps {
    script: ParsedScript;
    userCharacter: string;
    similarityThreshold?: number;
    initialLineIndex?: number;
}

export function useRehearsal({ script, userCharacter, similarityThreshold = 0.85, initialLineIndex = 0 }: UseRehearsalProps) {
    const { speak, listen, stop: stopSpeech, state: speechState, voices } = useSpeech();

    const [currentLineIndex, setCurrentLineIndex] = useState(initialLineIndex);
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
    const processCurrentLine = async (overrideIndex?: number) => {
        const indexToUse = overrideIndex ?? stateRef.current.currentLineIndex;
        const line = script.lines[indexToUse];
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

                // Normalization for partial matching (fallback)
                const nScript = line.text.toLowerCase();
                const nTrans = transcript.toLowerCase().trim();

                // Voice Command: "Passe", "Passer", "Suivante"
                const skipCommands = ["passe", "passer", "je passe", "suivante", "suite", "je ne sais pas", "joker"];
                // Check if the user said ONLY a command (or very close to it)
                const isSkipCommand = skipCommands.some(cmd => nTrans === cmd || nTrans.replace(/[.,!]/g, "") === cmd);

                // Allow partial match if line is short (handle "Non" vs "Non non")
                const isPartialMatch = nScript.length < 30 && (nScript.includes(nTrans) || nTrans.includes(nScript)) && nTrans.length >= 2;

                if (isSkipCommand) {
                    console.log("Voice Command Detected: SKIP");
                    setFeedback("correct"); // Visual feedback that command was understood/accepted
                    await new Promise(resolve => setTimeout(resolve, 300));
                    setFeedback(null);
                    next();
                } else if (similarity >= similarityThreshold || isPartialMatch) {
                    setFeedback("correct");

                    // User requested NO confirmation audio and immediate chaining
                    // We just give a tiny visual flash (handled by React state update speed effectively) or just go next.
                    // To keep it smooth, we might want 200ms just so the user sees "Green" before switch?
                    // "je veux qu'il enchaine" -> immediate is best.

                    // await speak("Bien joué !", prompterVoice); -- REMOVED
                    // await new Promise(resolve => setTimeout(resolve, 1500)); -- REMOVED

                    // Short timeout purely for visual green flash, but non-blocking feeling
                    await new Promise(resolve => setTimeout(resolve, 300));

                    setFeedback(null);
                    next();
                } else {
                    setFeedback("incorrect");
                    // Souffleur logic: speak the correct line then retry
                    await speak(`Tu as dit : ${transcript}. Il fallait dire : ${line.text}`, prompterVoice);

                    setStatus("listening_user"); // Retry
                    setFeedback(null);
                    processCurrentLine(indexToUse); // Recursive retry with same index
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
                // If user paused right at the end of speech, don't advance
                if (statusRef.current !== "paused") {
                    next();
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [speechState, status]); // dependency on status is tricky if it changes to paused.

    // We need a ref for status to check inside timeout without stale closure if we want to be safe, 
    // or just rely on 'status' change clearing the timeout.
    // If status changes to 'paused', the effect cleanup runs -> clearTimeout. PERFECT.
    // So if I hit pause, status -> paused. Effect [speechState, status] cleanup runs. Timer killed. logic holds.

    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; }, [status]);

    const togglePause = () => {
        if (status === "paused") {
            // Resume
            // If we were in the middle of a line, we effectively "retry" it.
            // But we need to know WHOSE turn it was.
            // We can re-run processCurrentLine(). It checks user character and dispatches correctly.
            // If it was "playing_other", it will start speaking again (maybe from start of line, acceptable).
            processCurrentLine(currentLineIndex);
        } else {
            // Pause
            setStatus("paused");
            stopSpeech();
        }
    };


    const start = () => {
        setCurrentLineIndex(initialLineIndex);
        // Explicitly trigger the first line, because useEffect won't run if status is "setup"
        processCurrentLine(initialLineIndex);
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
            processCurrentLine(currentLineIndex);
        }
    }, [currentLineIndex]);
    // Warning: processCurrentLine is not redundant? 
    // If we advance index, the effect runs. 
    // If it's user turn, it calls listen(). 
    // If it's other turn, it calls speak().

    const retry = () => {
        if (status === "error" || status === "listening_user") {
            processCurrentLine(currentLineIndex);
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
        voices: characterVoices,
        togglePause,
        isPaused: status === "paused"
    };
}
