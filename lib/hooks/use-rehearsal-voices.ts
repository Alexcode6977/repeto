import { useState, useEffect } from "react";
import { ParsedScript } from "../types";

export function useRehearsalVoices(script: ParsedScript, voices: SpeechSynthesisVoice[]) {
    const [voiceAssignments, setVoiceAssignments] = useState<Record<string, SpeechSynthesisVoice>>({});

    useEffect(() => {
        if (voices.length > 0) {
            const frVoices = voices.filter(v => v.lang.startsWith("fr"));
            const pool = frVoices.length > 0 ? frVoices : voices;

            const assignments: Record<string, SpeechSynthesisVoice> = {};

            // 1. Assistant (Feedback)
            const assistantVoice = pool.find(v => v.name.includes("Google") || v.name.includes("Siri")) || pool[0];
            assignments["ASSISTANT"] = assistantVoice;

            // 2. Narrator
            const narratorVoice = pool.find(v => v !== assistantVoice && !v.name.includes("Compact")) || pool[pool.length - 1];
            assignments["NARRATOR"] = narratorVoice;

            // 3. Characters
            let charPool = pool.filter(v => v !== assistantVoice && v !== narratorVoice);
            if (charPool.length === 0) charPool = pool;

            script.characters.forEach((char, index) => {
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

    return { voiceAssignments, setVoiceForRole };
}
