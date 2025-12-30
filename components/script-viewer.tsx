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
                <div className="flex justify-center pt-8 animate-in fade-in zoom-in duration-500 w-full">
                    {forcedMode ? (
                        // Single Button Mode
                        <button
                            onClick={() => onConfirm(selectedChars, forcedMode)}
                            className={cn(
                                "group relative flex items-center justify-center gap-6 px-12 py-6 rounded-[2rem] transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl",
                                forcedMode === 'reader'
                                    ? "bg-card border border-border hover:bg-white/10 hover:border-primary/50"
                                    : "bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/50 shadow-primary/20"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110",
                                forcedMode === 'reader' ? "bg-yellow-500/20" : "bg-primary/30"
                            )}>
                                {forcedMode === 'reader' ? (
                                    <BookOpen className="w-6 h-6 text-yellow-400" />
                                ) : (
                                    <Play className="w-6 h-6 text-foreground fill-white" />
                                )}
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-black text-foreground uppercase tracking-wider">
                                    {forcedMode === 'reader' ? "Commencer la lecture" : "Lancer la répétition"}
                                </h3>
                                <p className={cn(
                                    "text-[10px]",
                                    forcedMode === 'reader' ? "text-muted-foreground" : "text-gray-300"
                                )}>
                                    {selectedChars.length} personnage{selectedChars.length > 1 ? 's' : ''} sélectionné{selectedChars.length > 1 ? 's' : ''}
                                </p>
                            </div>
                        </button>
                    ) : (
                        // Dual Button Mode (Fallback)
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full">
                            <button
                                onClick={() => onConfirm(selectedChars, 'reader')}
                                className="group relative flex flex-col items-center justify-center gap-4 p-8 bg-card border border-border rounded-[2rem] hover:bg-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl"
                            >
                                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <BookOpen className="w-8 h-8 text-yellow-400" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-foreground uppercase tracking-wider">Lire</h3>
                                    <p className="text-muted-foreground text-[10px]">{selectedChars.length > 1 ? 'Lecture collective' : 'Découvrir le texte'}</p>
                                </div>
                            </button>

                            <button
                                onClick={() => onConfirm(selectedChars, 'rehearsal')}
                                className="group relative flex flex-col items-center justify-center gap-4 p-8 bg-primary/10 border border-primary/20 rounded-[2rem] hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-2xl shadow-primary/20"
                            >
                                <div className="w-16 h-16 bg-primary/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <Play className="w-8 h-8 text-foreground fill-white" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-foreground uppercase tracking-wider">Répéter</h3>
                                    <p className="text-gray-300 text-[10px]">{selectedChars.length > 1 ? "L'IA complète le groupe" : "L'IA donne la réplique"}</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
