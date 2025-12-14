"use client";

import { useState, useEffect } from "react";
import { ParsedScript } from "@/lib/types";

const STORAGE_KEY = "repeto_saved_script";

export function useSavedScript() {
    const [savedScript, setSavedScript] = useState<ParsedScript | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as ParsedScript;
                setSavedScript(parsed);
            }
        } catch (e) {
            console.error("Failed to load saved script:", e);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save script to localStorage
    const saveScript = (script: ParsedScript) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(script));
            setSavedScript(script);
        } catch (e) {
            console.error("Failed to save script:", e);
        }
    };

    // Clear saved script
    const clearScript = () => {
        localStorage.removeItem(STORAGE_KEY);
        setSavedScript(null);
    };

    return {
        savedScript,
        isLoading,
        saveScript,
        clearScript,
    };
}
