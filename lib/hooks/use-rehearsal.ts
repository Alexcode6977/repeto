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
    mode?: "full" | "cue" | "check";
}

export function useRehearsal({ script, userCharacter, similarityThreshold = 0.85, initialLineIndex = 0, mode = "full" }: UseRehearsalProps) {
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
    // We Map: "ASSISTANT" | "NARRATOR" | CharacterName -> SpeechSynthesisVoice
    const [voiceAssignments, setVoiceAssignments] = useState<Record<string, SpeechSynthesisVoice>>({});

    useEffect(() => {
        if (voices.length > 0) {
            const frVoices = voices.filter(v => v.lang.startsWith("fr"));
            // Fallback if no French voice? Use any.
            const pool = frVoices.length > 0 ? frVoices : voices;

            const assignments: Record<string, SpeechSynthesisVoice> = {};

            // 1. Assistant (Feedback)
            // Prefer "Google" or something neutral/robotic if available, else first one
            const assistantVoice = pool.find(v => v.name.includes("Google") || v.name.includes("Siri")) || pool[0];
            assignments["ASSISTANT"] = assistantVoice;

            // 2. Narrator (Didascalies - reserved for future use)
            // Try to pick one different from Assistant
            const narratorVoice = pool.find(v => v !== assistantVoice && !v.name.includes("Compact")) || pool[pool.length - 1];
            assignments["NARRATOR"] = narratorVoice;

            // 3. Characters
            // Filter pool for characters (exclude assistant/narrator if possible to maximize distinction)
            // But if pool is small, reuse is fine.
            let charPool = pool.filter(v => v !== assistantVoice && v !== narratorVoice);
            if (charPool.length === 0) charPool = pool;

            script.characters.forEach((char, index) => {
                // Heuristics for Gender?
                // Very basic: predefined lists of common names?
                // For now, round-robin distribution to ensure variety.
                // We could inspect voice name for "Thomas", "Amelie" etc if available.

                // Try to find a voice that hasn't been used yet?
                const voice = charPool[index % charPool.length];
                assignments[char] = voice;
            });

            setVoiceAssignments(assignments);
        }
    }, [voices, script.characters]);

    const setVoiceForRole = (role: string, voiceURI: string) => {
        const voice = voices.find(v => v.voiceURI === voiceURI);
        if (voice) {
            setVoiceAssignments(prev => ({ ...prev, [role]: voice }));
        }
    };


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
                const skipCommands = ["passe", "passer", "je passe", "suivante", "suite", "je ne sais pas", "joker", "suivant", "next"];
                const prevCommands = ["précédente", "retour", "reviens", "arrière", "répète", "précédent"];

                // Normalize transcript for command detection (remove punctuation, extra spaces)
                const nTransClean = nTrans.replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim();

                // Check if the user said a skip command (exact match OR starts/ends with it)
                const isSkipCommand = skipCommands.some(cmd =>
                    nTransClean === cmd ||
                    nTransClean.startsWith(cmd + " ") ||
                    nTransClean.endsWith(" " + cmd) ||
                    nTransClean.includes(cmd)
                );
                const isPrevCommand = prevCommands.some(cmd =>
                    nTransClean === cmd ||
                    nTransClean.startsWith(cmd + " ") ||
                    nTransClean.endsWith(" " + cmd) ||
                    nTransClean.includes(cmd)
                );

                // Allow partial match if line is short (handle "Non" vs "Non non")
                const isPartialMatch = nScript.length < 30 && (nScript.includes(nTrans) || nTrans.includes(nScript)) && nTrans.length >= 2;

                if (isSkipCommand) {
                    console.log("Voice Command Detected: SKIP");
                    setFeedback("correct");
                    await new Promise(resolve => setTimeout(resolve, 300));
                    setFeedback(null);
                    next();
                } else if (isPrevCommand) {
                    console.log("Voice Command Detected: PREVIOUS");
                    // We don't verify correctness, we just go back.
                    previous();
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
                    await speak(`Tu as dit : ${transcript}. Il fallait dire : ${line.text}`, voiceAssignments["ASSISTANT"]);

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

            // Rehearsal Mode Logic: Skip lines if necessary
            // We calculate the next valid line to play/listen to avoid playing this one if it should be skipped.
            // If play -> proceed. If skip -> setCurrentLineIndex(newIndex) and return.

            let shouldPlay = true;

            if (mode === "check") {
                // In "Self-Check", we skip ALL non-user lines.
                shouldPlay = false;
            } else if (mode === "cue") {
                // In "Cue", we only play if the NEXT line is the user's configuration.
                // We check if any of the lines immediately following is the user? 
                // Strict definition: "phrase juste avant".
                const nextLine = script.lines[indexToUse + 1];
                const isNextUser = nextLine && nextLine.character.includes(userCharacter);
                shouldPlay = isNextUser || false;
            }

            if (!shouldPlay) {
                // FAST FORWARD LOGIC
                // Find the next index that we SHOULD process (either User's turn OR a Cue line)
                let targetIndex = indexToUse + 1;
                while (targetIndex < script.lines.length) {
                    const tLine = script.lines[targetIndex];
                    const tIsUser = tLine.character.includes(userCharacter);

                    if (tIsUser) {
                        // We found a user line, stop here (we will listen)
                        break;
                    }

                    // It is Other. Checks if we should play it as a cue?
                    if (mode === "cue") {
                        const tNextLine = script.lines[targetIndex + 1];
                        const tNextIsUser = tNextLine && tNextLine.character.includes(userCharacter);
                        if (tNextIsUser) {
                            // Found a cue line, stop here (we will speak)
                            break;
                        }
                    } else if (mode === "full") {
                        // Should never happen here as we are inside !shouldPlay logic which implies mode != full
                        break;
                    }

                    // Otherwise continue skipping
                    targetIndex++;
                }

                if (targetIndex < script.lines.length) {
                    // Update index AND immediately process (don't rely on useEffect which may not fire)
                    setCurrentLineIndex(targetIndex);
                    // Small delay to let React update, then process
                    setTimeout(() => {
                        processCurrentLine(targetIndex);
                    }, 50);
                } else {
                    setStatus("finished");
                }
                return;
            }

            setStatus("playing_other");
            const voice = voiceAssignments[line.character];

            // Speak the line
            speak(line.text, voice);
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
            // CRITICAL: Explicitly call processCurrentLine after a micro-delay
            // The useEffect may not fire reliably due to status race conditions
            setTimeout(() => {
                processCurrentLine(nextIdx);
            }, 100);
        } else {
            setStatus("finished");
        }
    };

    const previous = () => {
        const prevIdx = Math.max(0, stateRef.current.currentLineIndex - 1);
        setCurrentLineIndex(prevIdx);
        // If we were finished, coming back should reactivate us
        if (status === "finished") {
            setStatus("setup"); // Wait for useEffect to pick it up?
            // Actually useEffect checks valid status.
            // If we set index, we should probably ensure status is valid.
            // Let's set it to 'listening_user' or 'playing_other' depending on whose turn it is?
            // Simplest is to rely on the effect but ensure status != finished.
            // But effect skips if status == setup.
            // Let's just force a standard state like setup/idle and let effect take over?
            // Actually, the effect: if (status !== "setup" && status !== "finished") process...
            // So if we are currently finished, we must change status.
            // Let's set it to "setup" then... wait, effect skips setup.
            // We should set it to "idle" (not a valid status) or just call process?
            // Let's explicitly re-process.
            // But wait, changing index triggers effect.
            // If we change status to "paused" it might work?
            // Let's change status to "playing_other" (safe fallback) or just let processCurrentLine handle it?
            // But processCurrentLine isn't called if status is finished.
            // Hack: setStatus("setup") then setTimeout(() => setStatus("playing..."))? No.

            // Correct logic:
            // 1. Set Index.
            // 2. Set Status to "playing_other" (temporarily) so effect runs?
            // Or better: explicit call.
            // But explicit call might conflict with effect.

            // Simplest: 
            // setStatus("playing_other"); // Just to break "finished" lock.
            // The effect [currentLineIndex] will run because index changed. 
            // AND we need status != finished.
        } else if (status === "paused") {
            // Stay paused? Or resume? user didn't ask.
            // Let's assume we want to hear the line.
            statusRef.current = "playing_other"; // logic hack
            setStatus("playing_other"); // force active
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
        voices, // Raw voices list
        voiceAssignments, // Assignments
        setVoiceForRole, // Setter
        togglePause,
        isPaused: status === "paused",
        previous
    };
}
