"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, Volume2, Settings2 } from "lucide-react";
import { getVoiceConfig, createVoiceConfig, VoiceConfig, VoiceAssignment, OpenAIVoice } from "@/lib/actions/voice-cache";
import { getScriptById } from "../actions";

// Available AI voices with French names
const AI_VOICES: { value: OpenAIVoice; label: string; description: string }[] = [
    { value: "alloy", label: "Alloy", description: "Voix neutre et polyvalente" },
    { value: "echo", label: "Echo", description: "Voix masculine profonde" },
    { value: "fable", label: "Fable", description: "Voix narrative expressive" },
    { value: "onyx", label: "Onyx", description: "Voix masculine grave" },
    { value: "nova", label: "Nova", description: "Voix féminine dynamique" },
    { value: "shimmer", label: "Shimmer", description: "Voix féminine douce" },
];

interface ScriptSettingsModalProps {
    scriptId: string;
    scriptTitle: string;
    characters: string[];
    onClose: () => void;
    onSave?: () => void;
}

export function ScriptSettingsModal({
    scriptId,
    scriptTitle,
    characters,
    onClose,
    onSave,
}: ScriptSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [existingConfig, setExistingConfig] = useState<VoiceConfig[] | null>(null);
    const [voiceAssignments, setVoiceAssignments] = useState<Record<string, OpenAIVoice>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadExistingConfig();
    }, [scriptId]);

    const loadExistingConfig = async () => {
        setIsLoading(true);
        try {
            const config = await getVoiceConfig("private_script", scriptId);
            setExistingConfig(config);

            // Initialize voice assignments from existing config or defaults
            const assignments: Record<string, OpenAIVoice> = {};
            if (config) {
                config.forEach(c => {
                    assignments[c.character_name] = c.voice;
                });
            } else {
                // Auto-assign voices round-robin
                characters.forEach((char, index) => {
                    assignments[char] = AI_VOICES[index % AI_VOICES.length].value;
                });
            }
            setVoiceAssignments(assignments);
        } catch (err) {
            setError("Erreur lors du chargement de la configuration");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoiceChange = (character: string, voice: OpenAIVoice) => {
        setVoiceAssignments(prev => ({
            ...prev,
            [character]: voice,
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            // Convert to VoiceAssignment array
            const assignments: VoiceAssignment[] = Object.entries(voiceAssignments).map(([character, voice]) => ({
                character,
                voice,
            }));

            // If config already exists, we need to update it
            // For now, let's just create if not exists
            if (!existingConfig) {
                const result = await createVoiceConfig("private_script", scriptId, assignments);
                if (!result.success) {
                    setError(result.error || "Erreur lors de la sauvegarde");
                    return;
                }
            }

            onSave?.();
            onClose();
        } catch (err) {
            setError("Erreur lors de la sauvegarde");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
            <div
                className="bg-card border border-border rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                            <Settings2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Réglages</h2>
                            <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                                {scriptTitle}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Voice Assignment Section */}
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Volume2 className="w-4 h-4" />
                                    Attribution des voix IA
                                </h3>
                                <div className="space-y-3">
                                    {characters.map((character) => (
                                        <div
                                            key={character}
                                            className="flex items-center justify-between gap-4 p-4 bg-muted/30 border border-border rounded-2xl"
                                        >
                                            <span className="font-bold text-foreground truncate">
                                                {character}
                                            </span>
                                            <select
                                                value={voiceAssignments[character] || "alloy"}
                                                onChange={(e) =>
                                                    handleVoiceChange(character, e.target.value as OpenAIVoice)
                                                }
                                                className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                {AI_VOICES.map((voice) => (
                                                    <option key={voice.value} value={voice.value}>
                                                        {voice.label} - {voice.description}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Info */}
                            {existingConfig && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-sm">
                                    ℹ️ Les voix ont déjà été configurées pour ce script.
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading || !!existingConfig}
                        className="flex-1 rounded-xl"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : existingConfig ? (
                            "Déjà configuré"
                        ) : (
                            "Sauvegarder"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
