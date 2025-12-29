"use client";

import { useState } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { BookOpen, Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptSetupProps {
    script: ParsedScript;
    character: string;
    onStart: (settings: ScriptSettings) => void;
    onBack: () => void;
}

export interface ScriptSettings {
    visibility: "visible" | "hint" | "hidden";
    mode: "full" | "cue" | "check";
}

export function ScriptSetup({ script, character, onStart, onBack }: ScriptSetupProps) {
    const [settings, setSettings] = useState<ScriptSettings>({
        visibility: "visible",
        mode: "full",
    });

    return (
        <div className="w-full max-w-4xl mx-auto space-y-12 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header info */}
            <div className="text-center space-y-2">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-muted-foreground hover:text-foreground mb-4"
                >
                    ← Changer de personnage
                </Button>
                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                    Configuration de lecture
                </h2>
                <p className="text-muted-foreground">
                    Rôle : <span className="text-primary font-bold">{character}</span>
                </p>
            </div>

            {/* Settings Grid */}
            <div className="max-w-2xl mx-auto space-y-8 bg-card backdrop-blur-md border border-white/10 p-8 rounded-[2rem]">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Visibilité de vos répliques</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: "visible", label: "Visibles", sub: "Texte complet" },
                                { id: "hint", label: "Indices", sub: "1ers mots" },
                                { id: "hidden", label: "Cachées", sub: "À l'aveugle" },
                            ].map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setSettings(prev => ({ ...prev, visibility: v.id as any }))}
                                    className={cn(
                                        "p-4 rounded-2xl text-left transition-all duration-300 border flex flex-col gap-1",
                                        settings.visibility === v.id
                                            ? "bg-white text-black border-white shadow-xl scale-[1.02] z-10"
                                            : "bg-card border-transparent text-muted-foreground hover:bg-white/10"
                                    )}
                                >
                                    <span className="text-xs font-bold">{v.label}</span>
                                    <span className={cn("text-[9px]", settings.visibility === v.id ? "text-gray-600" : "text-muted-foreground")}>{v.sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Mode de lecture</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: "full", label: "Intégrale", sub: "Tout le cast" },
                                { id: "cue", label: "Réplique", sub: "Juste avant" },
                                { id: "check", label: "Filage", sub: "Répliques seules" },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setSettings(prev => ({ ...prev, mode: m.id as any }))}
                                    className={cn(
                                        "p-4 rounded-2xl text-left transition-all duration-300 border flex flex-col gap-1",
                                        settings.mode === m.id
                                            ? "bg-primary text-foreground border-primary shadow-xl scale-[1.02] z-10"
                                            : "bg-card border-transparent text-muted-foreground hover:bg-white/10"
                                    )}
                                >
                                    <span className="text-xs font-bold">{m.label}</span>
                                    <span className={cn("text-[9px]", settings.mode === m.id ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-center">
                    <Button
                        size="lg"
                        className="max-w-md w-full py-8 rounded-2xl bg-primary text-foreground font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                        onClick={() => onStart(settings)}
                    >
                        Lancer la lecture
                    </Button>
                </div>
            </div>
        </div>
    );
}
