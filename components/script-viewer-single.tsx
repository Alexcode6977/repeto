"use client";

import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { BookOpen, Play, Headphones } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ScriptViewerSingleProps {
    script: ParsedScript;
    onConfirm: (character: string, mode: 'reader' | 'rehearsal' | 'listen') => void;
}

/**
 * ScriptViewerSingle - Character selection for NORMAL mode (Dashboard)
 * Only allows selecting ONE character at a time.
 */
export function ScriptViewerSingle({ script, onConfirm }: ScriptViewerSingleProps) {
    const [selectedChar, setSelectedChar] = useState<string | null>(null);

    return (
        <div className="space-y-12 w-full max-w-2xl py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    Choisissez votre personnage
                </h2>
                <p className="text-muted-foreground text-sm md:text-base">
                    Sélectionnez le rôle que vous souhaitez interpréter
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex flex-wrap gap-3 justify-center max-w-xl mx-auto">
                    {script.characters.map((char) => {
                        const isSelected = selectedChar === char;
                        return (
                            <Button
                                key={char}
                                variant={isSelected ? "default" : "glass"}
                                onClick={() => setSelectedChar(isSelected ? null : char)}
                                className={cn(
                                    "h-auto py-3 px-6 rounded-2xl text-base font-bold transition-all duration-300",
                                    isSelected
                                        ? "scale-105 shadow-[0_0_20px_rgba(124,58,237,0.4)] ring-2 ring-primary/50"
                                        : "hover:bg-white/10 hover:scale-[1.02]"
                                )}
                            >
                                {char}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {selectedChar && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto w-full">
                    <button
                        onClick={() => onConfirm(selectedChar, 'reader')}
                        className="group relative flex flex-col items-center justify-center gap-4 p-6 md:p-8 bg-card border border-border rounded-[2rem] hover:bg-white/10 hover:border-yellow-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl"
                    >
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-yellow-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-yellow-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg md:text-xl font-black text-foreground uppercase tracking-wider">Lire</h3>
                            <p className="text-muted-foreground text-[10px]">Découvrir le texte</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onConfirm(selectedChar, 'listen')}
                        className="group relative flex flex-col items-center justify-center gap-4 p-6 md:p-8 bg-cyan-500/10 border border-cyan-500/20 rounded-[2rem] hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl shadow-cyan-500/10"
                    >
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-cyan-500/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <Headphones className="w-7 h-7 md:w-8 md:h-8 text-cyan-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg md:text-xl font-black text-foreground uppercase tracking-wider">Écouter</h3>
                            <p className="text-cyan-300 text-[10px]">Mode livre audio</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onConfirm(selectedChar, 'rehearsal')}
                        className="group relative flex flex-col items-center justify-center gap-4 p-6 md:p-8 bg-primary/10 border border-primary/20 rounded-[2rem] hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-2xl shadow-primary/20"
                    >
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <Play className="w-7 h-7 md:w-8 md:h-8 text-foreground fill-white" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg md:text-xl font-black text-foreground uppercase tracking-wider">Répéter</h3>
                            <p className="text-gray-300 text-[10px]">L'IA donne la réplique</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
