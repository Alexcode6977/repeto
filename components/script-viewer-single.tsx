"use client";

import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { BookOpen, Play, Headphones, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ScriptViewerSingleProps {
    script: ParsedScript;
    onConfirm: (character: string, mode: 'reader' | 'rehearsal' | 'listen', ignoredCharacters?: string[]) => void;
}

/**
 * ScriptViewerSingle - Character selection for NORMAL mode (Dashboard)
 * Only allows selecting ONE character at a time.
 * Categorizes characters into "Personnages" and "Autres (Technique)"
 */
export function ScriptViewerSingle({ script, onConfirm }: ScriptViewerSingleProps) {
    const [selectedChar, setSelectedChar] = useState<string | null>(null);

    // Technical role detection
    const technicalKeywords = ["didascalie", "narrateur", "régie", "note", "décor", "voix off"];
    const isTechnical = (char: string) => technicalKeywords.some(k => char.toLowerCase().includes(k));

    // Categorize characters
    const mainCharacters = useMemo(() => script.characters.filter(c => !isTechnical(c)), [script.characters]);
    const technicalCharacters = useMemo(() => script.characters.filter(c => isTechnical(c)), [script.characters]);

    // State for ignored technical roles (Didascalies ignored by default)
    const [ignoredTechnical, setIgnoredTechnical] = useState<string[]>(() =>
        technicalCharacters.filter(c => c.toLowerCase().includes("didascalie"))
    );

    const toggleTechnical = (char: string) => {
        setIgnoredTechnical(prev =>
            prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
        );
    };

    const handleConfirm = (mode: 'reader' | 'rehearsal' | 'listen') => {
        if (selectedChar) {
            onConfirm(selectedChar, mode, ignoredTechnical);
        }
    };

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

            <div className="space-y-8">
                {/* Main Characters Section */}
                <div className="space-y-3">
                    <div className="text-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            🎭 Personnages
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center max-w-xl mx-auto">
                        {mainCharacters.map((char) => {
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

                {/* Technical Roles Section (if any exist) */}
                {technicalCharacters.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border/50">
                        <div className="text-center">
                            <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
                                📋 Autres (Technique)
                            </span>
                            <p className="text-[10px] text-muted-foreground/50 mt-1">
                                Cliquez pour activer/désactiver la lecture
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
                            {technicalCharacters.map((char) => {
                                const isIgnored = ignoredTechnical.includes(char);
                                return (
                                    <button
                                        key={char}
                                        onClick={() => toggleTechnical(char)}
                                        className={cn(
                                            "flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-medium border transition-all duration-300",
                                            !isIgnored
                                                ? "bg-primary/10 border-primary/30 text-foreground"
                                                : "bg-muted/20 border-dashed border-border text-muted-foreground/60 hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                                            !isIgnored ? "bg-primary border-primary" : "bg-transparent border-muted-foreground/30"
                                        )}>
                                            {!isIgnored && <Check className="w-3 h-3 text-primary-foreground" />}
                                        </div>
                                        <span className={cn(isIgnored && "line-through")}>{char}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {selectedChar && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto w-full">
                    <button
                        onClick={() => handleConfirm('reader')}
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
                        onClick={() => handleConfirm('listen')}
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
                        onClick={() => handleConfirm('rehearsal')}
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
