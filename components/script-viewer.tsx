"use client";

import { ScriptLine, ParsedScript } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { BookOpen, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ScriptViewerProps {
    script: ParsedScript;
    onConfirm: (characters: string[], mode: 'reader' | 'rehearsal') => void;
    forcedMode?: 'reader' | 'rehearsal';
}

export function ScriptViewer({ script, onConfirm, forcedMode }: ScriptViewerProps) {
    const [selectedChars, setSelectedChars] = useState<string[]>([]);

    const toggleChar = (char: string) => {
        setSelectedChars(prev =>
            prev.includes(char)
                ? prev.filter(c => c !== char)
                : [...prev, char]
        );
    };

    const selectAll = () => setSelectedChars([...script.characters]);
    const deselectAll = () => setSelectedChars([]);

    return (
        <div className="space-y-12 w-full max-w-2xl py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    Choisissez vos personnages
                </h2>
                <p className="text-muted-foreground text-sm md:text-base">
                    Sélectionnez les rôles que vous souhaitez interpréter (mode collectif possible)
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex justify-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAll}
                        className="text-[10px] uppercase font-bold tracking-widest text-primary hover:text-primary/80"
                    >
                        Tout sélectionner
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={deselectAll}
                        className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground"
                    >
                        Tout désélectionner
                    </Button>
                </div>

                <div className="flex flex-wrap gap-3 justify-center max-w-xl mx-auto">
                    {script.characters.map((char) => {
                        const isSelected = selectedChars.includes(char);
                        return (
                            <Button
                                key={char}
                                variant={isSelected ? "default" : "glass"}
                                onClick={() => toggleChar(char)}
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

            {selectedChars.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-background via-background to-transparent z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="max-w-xl mx-auto flex justify-center">
                        {forcedMode ? (
                            // Single Button Mode - Full Width Sticky
                            <button
                                onClick={() => onConfirm(selectedChars, forcedMode)}
                                className={cn(
                                    "w-full max-w-sm group relative flex items-center justify-center gap-4 px-8 py-5 rounded-[1.5rem] transition-all duration-300 shadow-xl shadow-primary/20",
                                    forcedMode === 'reader'
                                        ? "bg-card border border-primary/20 hover:bg-white/10"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                                    forcedMode === 'reader' ? "bg-yellow-500/20" : "bg-white/20"
                                )}>
                                    {forcedMode === 'reader' ? (
                                        <BookOpen className="w-5 h-5 text-yellow-400" />
                                    ) : (
                                        <Play className="w-5 h-5 fill-current" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-black uppercase tracking-wider">
                                        {forcedMode === 'reader' ? "Commencer" : "C'est parti"}
                                    </h3>
                                    <p className={cn(
                                        "text-[10px] font-medium",
                                        forcedMode === 'reader' ? "text-muted-foreground" : "text-primary-foreground/80"
                                    )}>
                                        {selectedChars.length} rôle{selectedChars.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                            </button>
                        ) : (
                            // Dual Button Mode - Side by Side Sticky
                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                                <button
                                    onClick={() => onConfirm(selectedChars, 'reader')}
                                    className="flex flex-col items-center justify-center gap-1 p-3 bg-card/80 backdrop-blur-md border border-border rounded-2xl hover:bg-white/10 transition-all active:scale-95"
                                >
                                    <BookOpen className="w-6 h-6 text-yellow-500" />
                                    <span className="text-xs font-bold uppercase">Lire</span>
                                </button>

                                <button
                                    onClick={() => onConfirm(selectedChars, 'rehearsal')}
                                    className="flex flex-col items-center justify-center gap-1 p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                    <span className="text-xs font-bold uppercase">Répéter</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
