"use client";

import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { BookOpen, Play, Headphones, Check, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ScriptViewerSingleProps {
    script: ParsedScript;
    onConfirm: (character: string, mode: 'reader' | 'rehearsal' | 'listen', ignoredCharacters?: string[]) => void;
}

/**
 * ScriptViewerSingle - Character selection for NORMAL mode (Dashboard)
 * Compact layout: everything visible on one screen without scrolling
 */
export function ScriptViewerSingle({ script, onConfirm }: ScriptViewerSingleProps) {
    const [selectedChar, setSelectedChar] = useState<string>("");

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
        if (mode === 'listen' || selectedChar) {
            onConfirm(selectedChar, mode, ignoredTechnical);
        }
    };

    const isSelectionRequired = !selectedChar;

    return (
        <div className="w-full max-w-lg mx-auto py-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-2">
                    Prêt à répéter ?
                </h2>
                <p className="text-muted-foreground text-sm">
                    Choisissez votre rôle et lancez-vous
                </p>
            </div>

            {/* Compact Selection Area */}
            <div className="space-y-6">
                {/* Character Select Dropdown */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        🎭 Votre personnage
                    </label>
                    <Select value={selectedChar} onValueChange={setSelectedChar}>
                        <SelectTrigger className="w-full h-14 rounded-2xl bg-card border-border text-lg font-semibold">
                            <SelectValue placeholder="Sélectionnez un rôle..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {mainCharacters.map((char) => (
                                <SelectItem
                                    key={char}
                                    value={char}
                                    className="text-base py-3 cursor-pointer"
                                >
                                    {char}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Technical Roles - Inline Compact */}
                {technicalCharacters.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
                            📋 Technique
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {technicalCharacters.map((char) => {
                                const isIgnored = ignoredTechnical.includes(char);
                                return (
                                    <button
                                        key={char}
                                        onClick={() => toggleTechnical(char)}
                                        className={cn(
                                            "flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition-all duration-200",
                                            !isIgnored
                                                ? "bg-primary/10 border-primary/30 text-foreground"
                                                : "bg-muted/20 border-dashed border-border text-muted-foreground/60 hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors",
                                            !isIgnored ? "bg-primary border-primary" : "bg-transparent border-muted-foreground/30"
                                        )}>
                                            {!isIgnored && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                        </div>
                                        <span>{char}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Divider */}
                <div className="border-t border-border/50 my-4" />

                {/* 3 Mode Buttons - Always Visible */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center block">
                        Choisissez un mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {/* LIRE */}
                        <button
                            onClick={() => handleConfirm('reader')}
                            disabled={isSelectionRequired}
                            className={cn(
                                "group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300",
                                isSelectionRequired
                                    ? "opacity-40 cursor-not-allowed bg-card border-border"
                                    : "bg-card border-border hover:bg-yellow-500/10 hover:border-yellow-500/50 active:scale-95"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-transform",
                                isSelectionRequired ? "bg-muted/20" : "bg-yellow-500/20 group-hover:scale-110"
                            )}>
                                <BookOpen className={cn("w-6 h-6", isSelectionRequired ? "text-muted-foreground" : "text-yellow-400")} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Lire</h3>
                                <p className="text-muted-foreground text-[9px] hidden md:block">Découvrir</p>
                            </div>
                        </button>

                        {/* ÉCOUTER */}
                        <button
                            onClick={() => handleConfirm('listen')}
                            className={cn(
                                "group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300",
                                "bg-cyan-500/5 border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/50 active:scale-95"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-transform",
                                "bg-cyan-500/20 group-hover:scale-110"
                            )}>
                                <Headphones className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Écouter</h3>
                                <p className="text-cyan-300 text-[9px] hidden md:block">Audio</p>
                            </div>
                        </button>

                        {/* RÉPÉTER */}
                        <button
                            onClick={() => handleConfirm('rehearsal')}
                            disabled={isSelectionRequired}
                            className={cn(
                                "group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300",
                                isSelectionRequired
                                    ? "opacity-40 cursor-not-allowed bg-card border-border"
                                    : "bg-primary/5 border-primary/20 hover:bg-primary/15 hover:border-primary/50 active:scale-95 shadow-lg shadow-primary/10"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-transform",
                                isSelectionRequired ? "bg-muted/20" : "bg-primary/20 group-hover:scale-110"
                            )}>
                                <Play className={cn("w-6 h-6", isSelectionRequired ? "text-muted-foreground" : "text-foreground fill-white")} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Répéter</h3>
                                <p className="text-gray-300 text-[9px] hidden md:block">Avec le Partenaire</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Helper text */}
                {isSelectionRequired && (
                    <p className="text-center text-muted-foreground/50 text-xs animate-pulse">
                        ↑ Sélectionnez un personnage pour lire ou répéter
                    </p>
                )}
            </div>
        </div>
    );
}
