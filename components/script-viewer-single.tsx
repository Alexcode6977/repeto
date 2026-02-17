"use client";

import { ParsedScript } from "@/lib/types";
import { BookOpen, Play, Headphones, Check, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
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
    onConfirm: (character: string, mode: 'reader' | 'rehearsal' | 'listen', ignoredCharacters?: string[], showStageDirections?: boolean) => void;
    onBack?: () => void;
}

/**
 * ScriptViewerSingle - Character selection for NORMAL mode (Dashboard)
 * Compact layout: everything visible on one screen without scrolling
 */
export function ScriptViewerSingle({ script, onConfirm, onBack }: ScriptViewerSingleProps) {
    const [selectedChar, setSelectedChar] = useState<string>("");

    // Technical role detection
    const technicalKeywords = ["didascalie", "narrateur", "régie", "note", "décor", "voix off", "poursuite", "lumière", "son", "indication"];
    const isTechnical = (char: string) => technicalKeywords.some(k => char.toLowerCase().includes(k));

    // Categorize characters
    const mainCharacters = script.characters.filter(c => !isTechnical(c));
    const technicalCharacters = script.characters.filter(c => isTechnical(c));

    // State for ignored technical roles (Didascalies ignored by default)
    const [ignoredTechnical, setIgnoredTechnical] = useState<string[]>(() =>
        technicalCharacters.filter(c => c.toLowerCase().includes("didascalie"))
    );

    // State for showing/hiding stage directions (enabled by default)
    const [showStageDirections, setShowStageDirections] = useState(true);

    const toggleTechnical = (char: string) => {
        setIgnoredTechnical(prev =>
            prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
        );
    };

    const handleConfirm = (mode: 'reader' | 'rehearsal' | 'listen') => {
        if (!selectedChar) {
            return;
        }
        onConfirm(selectedChar, mode, ignoredTechnical, showStageDirections);
    };

    const listenModes = ["Intégral", "Réplique", "Solo"];
    const listenLabel = `Audio (${listenModes.join(" / ")})`;
    const listenDisabledLabel = "Personnage requis";

    const isSelectionRequired = !selectedChar;

    return (
        <div className="w-full max-w-lg mx-auto pt-24 md:pt-32 pb-40 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* Back Button - Positioned below fixed header */}
            <div className="absolute top-24 left-4 md:left-8 z-50">
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Retour</span>
                </button>
            </div>


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
                            disabled={isSelectionRequired}
                            className={cn(
                                "group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300",
                                isSelectionRequired
                                    ? "opacity-40 cursor-not-allowed bg-card border-border"
                                    : "bg-cyan-500/5 border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/50 active:scale-95"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-transform",
                                isSelectionRequired ? "bg-muted/20" : "bg-cyan-500/20 group-hover:scale-110"
                            )}>
                                <Headphones className={cn("w-6 h-6", isSelectionRequired ? "text-muted-foreground" : "text-cyan-400")} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Écouter</h3>
                                <p className={cn("text-[9px] hidden md:block", isSelectionRequired ? "text-muted-foreground/70" : "text-cyan-300")}>
                                    {isSelectionRequired ? listenDisabledLabel : listenLabel}
                                </p>
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

                    {/* Stage Directions Toggle */}
                    <div className="mt-6 pt-4 border-t border-border/50">
                        <button
                            onClick={() => setShowStageDirections(!showStageDirections)}
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/30 border border-border/50 transition-all duration-200"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    {showStageDirections ? (
                                        <Eye className="w-5 h-5 text-amber-400" />
                                    ) : (
                                        <EyeOff className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <h4 className="text-sm font-semibold text-foreground">Afficher les didascalies</h4>
                                    <p className="text-xs text-muted-foreground">Indications scéniques entre parenthèses</p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-12 h-6 rounded-full relative transition-colors duration-300",
                                showStageDirections ? "bg-primary" : "bg-muted-foreground/30"
                            )}>
                                <div className={cn(
                                    "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300",
                                    showStageDirections ? "translate-x-6" : "translate-x-0.5"
                                )} />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Helper text */}
                {isSelectionRequired && (
                    <p className="text-center text-muted-foreground/50 text-xs animate-pulse">
                        ↑ Sélectionnez un personnage pour lire, écouter ou répéter
                    </p>
                )}
            </div>
        </div >
    );
}
