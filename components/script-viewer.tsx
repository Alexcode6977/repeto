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
        <div className="space-y-6 w-full max-w-2xl">
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white text-center">
                    Choisissez votre personnage
                </h2>
                <div className="flex flex-wrap gap-2 justify-center">
                    {script.characters.map((char) => (
                        <Button
                            key={char}
                            variant={selectedChar === char ? "default" : "glass"}
                            onClick={() => setSelectedChar(char)}
                            className={cn(
                                "transition-all duration-300",
                                selectedChar === char ? "scale-105 ring-2 ring-white/50" : ""
                            )}
                        >
                            {char}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center text-white/80">
                    <h3 className="text-lg font-semibold">Aperçu du script</h3>
                    {selectedChar && (
                        <div className="flex gap-2 animate-in fade-in zoom-in">
                            <Button
                                onClick={() => onConfirm(selectedChar, 'reader')}
                                variant="secondary"
                                className="bg-yellow-500/10 text-yellow-200 hover:bg-yellow-500/20 border border-yellow-500/20"
                            >
                                <BookOpen className="w-4 h-4 mr-2" />
                                Lire
                            </Button>
                            <Button onClick={() => onConfirm(selectedChar, 'rehearsal')}>
                                <Play className="w-4 h-4 mr-2" />
                                Répéter
                            </Button>
                        </div>
                    )}
                </div>

                <Card className="max-h-[60vh] overflow-y-auto glass-card">
                    <CardContent className="p-4 space-y-4">
                        {script.lines.slice(0, 50).map((line) => (
                            <div key={line.id} className="flex flex-col gap-1">
                                <span
                                    className={cn(
                                        "text-xs font-bold uppercase tracking-wider",
                                        line.character === selectedChar ? "text-primary" : "text-gray-500"
                                    )}
                                >
                                    {line.character}
                                </span>
                                <p
                                    className={cn(
                                        "text-sm leading-relaxed",
                                        line.character === selectedChar ? "text-white font-medium" : "text-gray-300"
                                    )}
                                >
                                    {line.text}
                                </p>
                            </div>
                        ))}
                        {script.lines.length > 50 && (
                            <p className="text-center text-xs text-gray-500 py-4 italic">
                                ... {script.lines.length - 50} lignes masquées ...
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
