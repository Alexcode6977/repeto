"use client";

import { ParsedScript } from "@/lib/types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Play, Headphones, Check, UserCircle, ChevronDown, Users } from "lucide-react";

interface PrivateNote {
    line_index: number;
    text: string;
}

interface ScriptViewerProps {
    script: ParsedScript;
    onConfirm: (characters: string[], mode: 'reader' | 'rehearsal' | 'listen', ignoredCharacters?: string[]) => void;
    forcedMode?: 'reader' | 'rehearsal' | 'listen';
    privateNotes?: PrivateNote[];
}

export const PRIVATE_NOTE_CHAR = "[Note Perso]";

export function ScriptViewer({ script, onConfirm, forcedMode, privateNotes = [] }: ScriptViewerProps) {
    const [selectedChars, setSelectedChars] = useState<string[]>([]);

    // Generic Character Filtering - Updated with extended roles
    const technicalKeywords = ["didascalie", "narrateur", "régie", "note", "décor", "voix off", "poursuite", "lumière", "son", "indication"];
    const isTechnical = (char: string) => technicalKeywords.some(k => char.toLowerCase().includes(k)) || char === PRIVATE_NOTE_CHAR;

    // Derive all characters from lines
    const structuralBlacklist = ["scene", "acte", "act"];

    const allLinesCharacters = new Set(
        script.lines
            .filter(l =>
                l.character &&
                l.type !== 'scene_heading' &&
                !structuralBlacklist.some(b => l.character.toLowerCase().includes(b))
            )
            .map(l => l.character)
            .filter(Boolean)
    );

    // Inject PRIVATE_NOTE_CHAR if we have actual private notes
    const hasPrivateNotes = privateNotes && privateNotes.length > 0;
    const baseCharacters = Array.from(new Set([...script.characters, ...Array.from(allLinesCharacters)]));

    const allCharacters = hasPrivateNotes
        ? [...baseCharacters, PRIVATE_NOTE_CHAR]
        : baseCharacters;

    const mainCharacters = allCharacters.filter(c => !isTechnical(c));
    const technicalCharacters = allCharacters.filter(c => isTechnical(c));

    const toggleChar = (char: string) => {
        setSelectedChars(prev =>
            prev.includes(char)
                ? prev.filter(c => c !== char)
                : [...prev, char]
        );
    };

    const toggleTechnical = (char: string) => {
        setSelectedChars(prev =>
            prev.includes(char)
                ? prev.filter(c => c !== char)
                : [...prev, char]
        );
    }

    // Handler for Reader Dropdown
    const handleReaderMainCharChange = (char: string) => {
        // Remove other main chars, keep technical
        setSelectedChars(prev => {
            const technicals = prev.filter(c => isTechnical(c));
            return [char, ...technicals];
        });
    }

    const selectAll = () => setSelectedChars(script.characters);
    const deselectAll = () => setSelectedChars([]);
    const selectedUserCharacters = selectedChars.filter(c => !isTechnical(c));
    const hasSelectedUserCharacters = selectedUserCharacters.length > 0;
    const canConfirmForcedListen = forcedMode !== "listen" || hasSelectedUserCharacters;

    // Helper to calculate confirmed characters
    const confirmSelection = (mode: 'reader' | 'rehearsal' | 'listen') => {
        // Separate User (Actor) from Context (Technical)
        const userActs = selectedChars.filter(c => !isTechnical(c));
        if (mode === "listen" && userActs.length === 0) {
            return;
        }
        const allTechnicalChars = technicalCharacters;
        const unselectedTechnical = allTechnicalChars.filter(c => !selectedChars.includes(c));

        onConfirm(userActs, mode, unselectedTechnical);
    };

    // --- PREMIUM READER MODE RENDER ---
    if (forcedMode === 'reader') {
        return (
            <div className="w-full max-w-lg mx-auto py-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <Card className="bg-card/90 dark:bg-black/40 backdrop-blur-2xl border-border/60 dark:border-white/10 shadow-2xl overflow-hidden relative">
                    {/* Background Gradient Blobs */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="p-8 space-y-10 relative z-10">
                        {/* Title Section */}
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-violet-300 via-violet-500 to-purple-500 drop-shadow-sm">
                                Lecture du Script
                            </h2>
                            <p className="text-muted-foreground/80 text-sm font-medium">
                                Incarnez votre personnage
                            </p>
                        </div>

                        {/* Dropdown */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                Personnage Principal
                            </label>
                            <Select onValueChange={handleReaderMainCharChange} value={selectedChars.find(c => !isTechnical(c)) || ""}>
                                <SelectTrigger className="w-full h-14 pl-4 pr-4 bg-muted/50 dark:bg-white/5 border-border/70 dark:border-white/10 text-lg hover:bg-muted/70 dark:hover:bg-white/10 transition-all focus:ring-2 focus:ring-violet-500/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded-full bg-violet-500/20 text-violet-500">
                                            <UserCircle className="w-5 h-5" />
                                        </div>
                                        <SelectValue placeholder="Choisir un personnage..." />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-popover dark:bg-zinc-900/95 backdrop-blur-xl border-border/70 dark:border-white/10 text-popover-foreground dark:text-zinc-100">
                                    {mainCharacters.map((char) => (
                                        <SelectItem key={char} value={char} className="focus:bg-violet-500/20 focus:text-violet-500 py-3 text-base">
                                            {char}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Technical Roles */}
                        {technicalCharacters.length > 0 && (
                            <div className="space-y-4 pt-6 border-t border-white/5">
                                <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <span className="w-8 h-[1px] bg-white/10"></span>
                                    Rôles Techniques
                                    <span className="w-8 h-[1px] bg-white/10"></span>
                                </label>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {technicalCharacters.map((char) => {
                                        const isSelected = selectedChars.includes(char);
                                        return (
                                            <button
                                                key={char}
                                                onClick={() => toggleTechnical(char)}
                                                className={cn(
                                                    "flex items-center gap-2 py-2 px-4 rounded-full text-xs font-bold transition-all duration-300 border",
                                                    isSelected
                                                        ? "bg-violet-500/10 border-violet-500/50 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                                        : "bg-muted/50 dark:bg-white/5 border-transparent text-muted-foreground hover:bg-muted/70 dark:hover:bg-white/10 hover:text-foreground"
                                                )}
                                            >
                                                <span>{char}</span>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Button */}
                        <button
                            onClick={() => confirmSelection(forcedMode)}
                            disabled={selectedChars.length === 0}
                            className={cn(
                                "w-full group relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl transition-all duration-300 shadow-lg",
                                selectedChars.length > 0
                                    ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                    : "bg-muted/50 dark:bg-white/5 text-muted-foreground cursor-not-allowed border border-border/60 dark:border-white/5"
                            )}
                        >
                            <span className="font-bold text-sm tracking-wider uppercase">Définir mes paramètres de lecture</span>
                            <BookOpen className={cn("w-5 h-5", selectedChars.length > 0 ? "text-white" : "text-zinc-600")} />
                        </button>
                    </div>
                </Card>
            </div>
        )
    }

    // --- PREMIUM REHEARSAL MODE RENDER (New Design) ---
    if (forcedMode === 'rehearsal') {
        return (
            <div className="w-full max-w-lg mx-auto py-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <Card className="bg-card/90 dark:bg-black/40 backdrop-blur-2xl border-border/60 dark:border-white/10 shadow-2xl overflow-hidden relative">
                    {/* Background Gradient Blobs */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="p-8 space-y-8 relative z-10">
                        {/* Title Section */}
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-violet-300 via-violet-500 to-purple-500 drop-shadow-sm">
                                Mode Répétition
                            </h2>
                            <p className="text-muted-foreground/80 text-sm font-medium">
                                Sélectionnez vos rôles à interpréter
                            </p>
                        </div>

                        {/* Character Selection Popover */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                Personnages
                            </label>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="w-full h-14 pl-4 pr-4 bg-muted/50 dark:bg-white/5 border border-border/70 dark:border-white/10 text-lg hover:bg-muted/70 dark:hover:bg-white/10 transition-all focus:ring-2 focus:ring-violet-500/50 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-1.5 rounded-full bg-violet-500/20 text-violet-500 group-hover:bg-violet-500/30 transition-colors">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <span className={cn("truncate", selectedChars.length === 0 && "text-muted-foreground")}>
                                                {selectedChars.length === 0
                                                    ? "Choisir des personnages..."
                                                    : selectedChars.length === 1
                                                        ? selectedChars[0]
                                                        : `${selectedChars.length} personnages sélectionnés`
                                                }
                                            </span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover dark:bg-zinc-950/95 backdrop-blur-xl border-border/70 dark:border-white/10 text-popover-foreground dark:text-zinc-100 shadow-2xl rounded-xl" align="center">
                                    <div className="p-2 border-b border-border/60 dark:border-white/5 flex justify-between items-center bg-muted/50 dark:bg-white/5">
                                        <div className="px-2 text-xs font-bold text-muted-foreground">
                                            {selectedChars.length} sélectionné{selectedChars.length > 1 ? 's' : ''}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={selectAll}
                                                className="h-6 text-[10px] uppercase font-bold text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                                            >
                                                Tout
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={deselectAll}
                                                className="h-6 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted/70 dark:hover:bg-white/10"
                                            >
                                                Rien
                                            </Button>
                                        </div>
                                    </div>
                                    <ScrollArea className="h-[280px] p-2">
                                        <div className="space-y-1">
                                            {mainCharacters.map((char) => {
                                                const isSelected = selectedChars.includes(char);
                                                return (
                                                    <button
                                                        key={char}
                                                        onClick={() => toggleChar(char)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between p-2.5 rounded-lg transition-all duration-200 group text-sm",
                                                            isSelected
                                                                ? "bg-violet-500/20 text-white"
                                                                : "hover:bg-muted/70 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground dark:hover:text-zinc-200"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                                                                isSelected ? "bg-violet-500 text-white" : "bg-white/10 text-muted-foreground group-hover:bg-white/20"
                                                            )}>
                                                                {char.substring(0, 1)}
                                                            </div>
                                                            <span className="truncate font-medium">{char}</span>
                                                        </div>
                                                        {isSelected && (
                                                            <Check className="w-4 h-4 text-violet-400 shrink-0" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Technical Roles */}
                        {technicalCharacters.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <span className="w-8 h-[1px] bg-white/10"></span>
                                    Rôles Techniques
                                    <span className="w-8 h-[1px] bg-white/10"></span>
                                </label>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {technicalCharacters.map((char) => {
                                        const isSelected = selectedChars.includes(char);
                                        return (
                                            <button
                                                key={char}
                                                onClick={() => toggleTechnical(char)}
                                                className={cn(
                                                    "flex items-center gap-2 py-1.5 px-3 rounded-full text-[10px] font-bold transition-all duration-300 border",
                                                    isSelected
                                                        ? "bg-violet-500/10 border-violet-500/50 text-violet-400"
                                                        : "bg-muted/50 dark:bg-white/5 border-transparent text-muted-foreground hover:bg-muted/70 dark:hover:bg-white/10 hover:text-foreground"
                                                )}
                                            >
                                                <span>{char}</span>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Button */}
                        <button
                            onClick={() => confirmSelection(forcedMode)}
                            disabled={selectedChars.length === 0}
                            className={cn(
                                "w-full group relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl transition-all duration-300 shadow-lg mt-2",
                                selectedChars.length > 0
                                    ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                    : "bg-muted/50 dark:bg-white/5 text-muted-foreground cursor-not-allowed border border-border/60 dark:border-white/5"
                            )}
                        >
                            <span className="font-bold text-sm tracking-wider uppercase">Commencer la répétition</span>
                            <Play className={cn("w-5 h-5 fill-current", selectedChars.length > 0 ? "text-white" : "text-zinc-600")} />
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    // --- STANDARD RENDER (Troupe Dashboard / Listen / Rehearsal defaults) ---
    return (
        <div className="space-y-12 w-full max-w-2xl py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    {forcedMode === 'listen' ? "Préparer l'écoute" : "Choisissez vos personnages"}
                </h2>
                <p className="text-muted-foreground text-sm md:text-base">
                    {forcedMode === 'listen'
                        ? "Sélectionnez un personnage pour activer Intégral, Réplique ou Solo."
                        : "Sélectionnez les rôles que vous souhaitez interpréter (mode collectif possible)"}
                </p>
            </div>

            <div className="space-y-8">
                {/* Main Characters */}
                <div className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex justify-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    const structuralBlacklist = ["scene", "acte", "act"];
                                    const allLinesCharacters = new Set(
                                        script.lines
                                            .filter(l =>
                                                l.character &&
                                                l.type !== 'scene_heading' &&
                                                !structuralBlacklist.some(b => l.character.toLowerCase().includes(b))
                                            )
                                            .map(l => l.character)
                                            .filter(Boolean)
                                    );
                                    const allCharacters = Array.from(new Set([...script.characters, ...Array.from(allLinesCharacters)]));
                                    const main = allCharacters.filter(c => !isTechnical(c));
                                    setSelectedChars(prev => [...new Set([...prev, ...main])]);
                                }}
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
                            {mainCharacters.map((char) => {
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
                </div>

                {/* Technical Roles */}
                {technicalCharacters.length > 0 && (
                    <div className="max-w-xl mx-auto space-y-3 pt-4 border-t border-border/50">
                        <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center justify-center gap-2">
                            📋 Technique
                        </label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {technicalCharacters.map((char) => {
                                const isSelected = selectedChars.includes(char);
                                return (
                                    <button
                                        key={char}
                                        onClick={() => toggleTechnical(char)}
                                        className={cn(
                                            "flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition-all duration-200",
                                            isSelected
                                                ? "bg-primary/10 border-primary/30 text-foreground"
                                                : "bg-muted/20 border-dashed border-border text-muted-foreground/60 hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors",
                                            isSelected ? "bg-primary border-primary" : "bg-transparent border-muted-foreground/30"
                                        )}>
                                            {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                        </div>
                                        <span>{char}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {(selectedChars.length > 0 || forcedMode === 'listen') && (
                <div className={cn(
                    "z-50 animate-in slide-in-from-bottom-10 fade-in duration-500",
                    forcedMode === 'listen'
                        ? "mt-12 flex justify-center"
                        : "fixed bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-background via-background to-transparent"
                )}>
                    <div className="max-w-xl mx-auto flex justify-center w-full">
                        {forcedMode ? (
                            // Single Button Mode - Listen Mode (Reader is handled above)
                            <div className="w-full max-w-sm">
                                <button
                                    onClick={() => confirmSelection(forcedMode)}
                                    disabled={!canConfirmForcedListen}
                                    className={cn(
                                        "w-full group relative flex items-center justify-center gap-4 px-8 py-5 rounded-[1.5rem] transition-all duration-300 shadow-xl shadow-primary/20",
                                        forcedMode === 'listen'
                                            ? canConfirmForcedListen
                                                ? "bg-teal-500 text-white hover:bg-teal-400"
                                                : "bg-muted/50 text-muted-foreground border border-border/60 dark:border-white/5 cursor-not-allowed shadow-none"
                                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-transform",
                                        canConfirmForcedListen ? "group-hover:scale-110 bg-white/20" : "bg-muted/60"
                                    )}>
                                        {forcedMode === 'listen' ? (
                                            <Headphones className={cn("w-5 h-5", canConfirmForcedListen ? "text-white" : "text-muted-foreground")} />
                                        ) : (
                                            <Play className="w-5 h-5 fill-current" />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-black uppercase tracking-wider">
                                            {forcedMode === 'listen' ? "Écouter" : "C'est parti"}
                                        </h3>
                                        <p className={cn(
                                            "text-[10px] font-medium",
                                            canConfirmForcedListen ? "text-primary-foreground/80" : "text-muted-foreground/80"
                                        )}>
                                            {hasSelectedUserCharacters
                                                ? `${selectedUserCharacters.length} rôle${selectedUserCharacters.length > 1 ? 's' : ''}`
                                                : "Sélectionnez un personnage"}
                                        </p>
                                    </div>
                                </button>
                                {!hasSelectedUserCharacters && forcedMode === "listen" && (
                                    <p className="mt-3 text-center text-xs text-muted-foreground/70">
                                        Un personnage est requis pour écouter en mode Intégral, Réplique ou Solo.
                                    </p>
                                )}
                            </div>
                        ) : (
                            // Dual Button Mode - Side by Side Sticky
                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                                <button
                                    onClick={() => confirmSelection('reader')}
                                    className="flex flex-col items-center justify-center gap-1 p-3 bg-card/80 backdrop-blur-md border border-border rounded-2xl hover:bg-white/10 transition-all active:scale-95"
                                >
                                    <BookOpen className="w-6 h-6 text-yellow-500" />
                                    <span className="text-xs font-bold uppercase">Lire</span>
                                </button>

                                <button
                                    onClick={() => confirmSelection('rehearsal')}
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
