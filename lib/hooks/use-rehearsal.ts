import { useState, useEffect, useRef } from "react";
import { ParsedScript, ScriptLine } from "../types";
import { useSpeech } from "./use-speech";
import { useOpenAITTS } from "./use-openai-tts";
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

export type TTSProvider = "browser" | "openai";
export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface UseRehearsalProps {
    script: ParsedScript;
    userCharacter: string;
    similarityThreshold?: number;
    initialLineIndex?: number;
    mode?: "full" | "cue" | "check";
    ttsProvider?: TTSProvider;
    openaiVoiceAssignments?: Record<string, OpenAIVoice>;
}

export function useRehearsal({ script, userCharacter, similarityThreshold = 0.85, initialLineIndex = 0, mode = "full", ttsProvider = "browser", openaiVoiceAssignments = {} }: UseRehearsalProps) {
    const browserSpeech = useSpeech();
    const openaiSpeech = useOpenAITTS();

    // Unified speak function that handles both providers
    // characterName is used to look up the OpenAI voice assignment
    const speak = async (text: string, _voice?: SpeechSynthesisVoice, characterName?: string): Promise<void> => {
        if (ttsProvider === "openai") {
            // Use the character's assigned OpenAI voice, default to "nova"
            const assignedVoice = characterName && openaiVoiceAssignments[characterName] ? openaiVoiceAssignments[characterName] : "nova";
            await openaiSpeech.speak(text, assignedVoice);
        } else {
            await browserSpeech.speak(text, _voice);
        }
    };

    // Preload helper
    const preloadLine = (text: string, characterName: string) => {
        if (ttsProvider === "openai") {
            const voice = characterName && openaiVoiceAssignments[characterName] ? openaiVoiceAssignments[characterName] : "nova";
            openaiSpeech.preload(text, voice);
        }
    };

    const { listen, stop: stopSpeech, voices, state: speechState } = browserSpeech;

    // Combined stop function
    const stopAll = () => {
        browserSpeech.stop();
        openaiSpeech.stop();
    };

    const [currentLineIndex, setCurrentLineIndex] = useState(initialLineIndex);
    const [status, setStatus] = useState<RehearsalStatus>("setup");
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [lastTranscript, setLastTranscript] = useState("");

    // Ref to track auto-play preventing stale closures
    const stateRef = useRef({ currentLineIndex, status, userCharacter });
    useEffect(() => {
        stateRef.current = { currentLineIndex, status, userCharacter };
    }, [currentLineIndex, status, userCharacter]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            browserSpeech.stop();
            openaiSpeech.stop();
        };
    }, []);



    // Track if we're in a manual skip to prevent double-skip from useEffect
    const manualSkipRef = useRef(false);

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

        // PRELOAD LOGIC: Always try to preload the NEXT line if it is not the user's turn
        // This dramatically reduces latency for OpenAI TTS
        const nextIdx = indexToUse + 1;
        if (nextIdx < script.lines.length) {
            const nextLine = script.lines[nextIdx];
            if (!nextLine.character.includes(userCharacter)) {
                preloadLine(nextLine.text, nextLine.character);
            }
        }

        // Check if user is one of the characters (handles direct match + "YVONNE et LUCIEN")
        if (line.character.includes(userCharacter)) {
            // It's the user's turn
            setStatus("listening_user");



            try {
                // Estimate speaking duration: ~100 chars/second = 10ms/char
                const estimatedDuration = line.text.length * 12;
                const transcript = await listen(estimatedDuration);
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

                    // Short timeout for visual green flash
                    await new Promise(resolve => setTimeout(resolve, 150));

                    setFeedback(null);
                    next();
                } else {
                    setFeedback("incorrect");
                    // Souffleur logic: speak the correct line then retry
                    await speak(`Tu as dit : ${transcript}. Il fallait dire : ${line.text}`, voiceAssignments["ASSISTANT"]);

                    setStatus("listening_user"); // Retry
                    setFeedback(null);
                    // Use setTimeout to break promise chain and avoid stack overflow on repeated errors
                    setTimeout(() => {
                        processCurrentLine(indexToUse);
                    }, 0);
                }

            } catch (e) {
                if (e === "Cancelled") {
                    console.log("Listening cancelled");
                    return;
                }
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
                    // Delay needed for speech recognition to properly reset between lines
                    // Delay needed for speech recognition to properly reset between lines
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

            // Speak the line and advance when done
            try {
                await speak(line.text, voice, line.character);
                // After speaking completes, advance to next line (if not paused/stopped)
                // IMPORTANT: Check manualSkipRef to ensure we don't double-skip if user clicked Skip
                if (stateRef.current.status === "playing_other" && !manualSkipRef.current) {
                    setTimeout(() => next(), 100);  // Quick transition
                }
            } catch (e) {
                // Similarly check manualSkipRef
                if (!manualSkipRef.current) {
                    console.error("Speech failed:", e);
                    next();  // Skip to next on error
                }
            }
        }
    };

    // Watch speech state to auto-advance when OTHER finishes speaking
    // REMOVED: The useEffect watching speechState was causing double-skips.
    // The await speak() logic above is sufficient and more reliable.

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
            stopAll();
        }
    };


    const start = () => {
        setCurrentLineIndex(initialLineIndex);
        // Explicitly trigger the first line
        processCurrentLine(initialLineIndex);
    };

    const next = () => {
        // Mark that we're doing a manual skip
        manualSkipRef.current = true;

        // Stop any ongoing speech/listening FIRST
        stopAll();

        const nextIdx = stateRef.current.currentLineIndex + 1;
        if (nextIdx < script.lines.length) {
            setCurrentLineIndex(nextIdx);
            // Brief delay for browser to reset speech recognition
            setTimeout(() => {
                manualSkipRef.current = false; // Reset flag
                processCurrentLine(nextIdx);
            }, 50);
        } else {
            manualSkipRef.current = false;
            setStatus("finished");
        }
    };

    const previous = () => {
        // Stop any ongoing speech FIRST
        stopSpeech();

        const prevIdx = Math.max(0, stateRef.current.currentLineIndex - 1);
        setCurrentLineIndex(prevIdx);

        // Explicitly call processCurrentLine after a micro-delay
        setTimeout(() => {
            processCurrentLine(prevIdx);
        }, 100);
    };

    // NOTE: We removed the useEffect([currentLineIndex]) that was here.
    // It caused double execution because next() and validateManually 
    // already call processCurrentLine explicitly with setTimeout.
    // The explicit calls are more reliable for handling race conditions.

    const retry = () => {
        if (status === "error" || status === "listening_user") {
            processCurrentLine(currentLineIndex);
        }
    };

    const validateManually = () => {
        if (status === "listening_user" || status === "error") {
            // Stop any listening immediately
            stopAll();
            // Brief visual feedback
            setFeedback("correct");

            // Very short delay for visual flash, then advance immediately
            setTimeout(() => {
                setFeedback(null);
                // Update index and explicitly process
                const nextIdx = stateRef.current.currentLineIndex + 1;
                if (nextIdx < script.lines.length) {
                    setCurrentLineIndex(nextIdx);
                    // Minimal delay to ensure recognition can restart
                    setTimeout(() => {
                        processCurrentLine(nextIdx);
                    }, 50);
                } else {
                    setStatus("finished");
                }
            }, 100);
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
        stop: stopAll,
        voices, // Raw voices list
        voiceAssignments, // Assignments
        setVoiceForRole, // Setter
        togglePause,
        isPaused: status === "paused",
        previous
    };
}
