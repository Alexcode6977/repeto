"use client";

import { ScriptLine, ParsedScript } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { BookOpen, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ScriptViewerProps {
    script: ParsedScript;
    onConfirm: (character: string, mode: 'reader' | 'rehearsal') => void;
}

export function ScriptViewer({ script, onConfirm }: ScriptViewerProps) {
    const [selectedChar, setSelectedChar] = useState<string | null>(null);

    return (
        <div className="space-y-12 w-full max-w-2xl py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                    Choisissez votre personnage
                </h2>
                <p className="text-gray-400 text-sm md:text-base">
                    Sélectionnez le rôle que vous souhaitez interpréter
                </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center max-w-xl mx-auto">
                {script.characters.map((char) => {
                    const isSelected = selectedChar === char;
                    return (
                        <Button
                            key={char}
                            variant={isSelected ? "default" : "glass"}
                            onClick={() => setSelectedChar(char)}
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

            {selectedChar && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 animate-in fade-in zoom-in duration-500 max-w-lg mx-auto w-full">
                    <button
                        onClick={() => onConfirm(selectedChar, 'reader')}
                        className="group relative flex flex-col items-center justify-center gap-4 p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl"
                    >
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <BookOpen className="w-8 h-8 text-yellow-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-wider">Lire</h3>
                            <p className="text-gray-400 text-[10px]">Découvrir le texte</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onConfirm(selectedChar, 'rehearsal')}
                        className="group relative flex flex-col items-center justify-center gap-4 p-8 bg-primary/10 border border-primary/20 rounded-[2rem] hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-2xl shadow-primary/20"
                    >
                        <div className="w-16 h-16 bg-primary/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-wider">Répéter</h3>
                            <p className="text-gray-300 text-[10px]">L'IA donne la réplique</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
