"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getVoiceConfig, VoiceConfig } from "@/lib/actions/voice-cache";
import { CastingStudio } from "@/components/casting-studio";

interface ScriptSettingsModalProps {
    scriptId: string;
    scriptTitle: string;
    characters: string[];
    onClose: () => void;
    onSave?: () => void | Promise<void>;
}

export function ScriptSettingsModal({
    scriptId,
    scriptTitle,
    characters,
    onClose,
    onSave,
}: ScriptSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [initialAssignments, setInitialAssignments] = useState<Record<string, string>>({});

    useEffect(() => {
        loadExistingConfig();
    }, [scriptId]);

    const loadExistingConfig = async () => {
        setIsLoading(true);
        try {
            const config = await getVoiceConfig("private_script", scriptId);
            const assignments: Record<string, string> = {};
            if (config) {
                config.forEach(c => {
                    assignments[c.character_name] = c.voice;
                });
            }
            setInitialAssignments(assignments);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-in fade-in p-4 md:p-8">
            <div className="w-full max-w-4xl flex items-center justify-center">
                <CastingStudio
                    scriptId={scriptId}
                    characters={characters}
                    initialAssignments={initialAssignments}
                    onClose={onClose}
                    onSave={async () => {
                        await onSave?.();
                        onClose();
                    }}
                />
            </div>
        </div>
    );
}
