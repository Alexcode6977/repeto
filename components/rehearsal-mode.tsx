"use client";

import { useState } from "react";
import { ScriptLine, ParsedScript } from "@/lib/types";
import { useRehearsal } from "@/lib/hooks/use-rehearsal";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Mic, MicOff, Play, SkipForward, AlertTriangle, CheckCircle, Pause, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface RehearsalModeProps {
    script: ParsedScript;
    userCharacter: string;
    onExit: () => void;
}

export function RehearsalMode({ script, userCharacter, onExit }: RehearsalModeProps) {
    const [threshold, setThreshold] = useState(0.85); // Default 85%
    const [hasStarted, setHasStarted] = useState(false);

    const {
        currentLine,
        currentLineIndex,
        status,
        feedback,
        start,
        skip,
        stop,
        lastTranscript,
        retry,
        validateManually,
        togglePause,
        isPaused
    } = useRehearsal({ script, userCharacter, similarityThreshold: threshold });

    const handleStart = () => {
        setHasStarted(true);
        start();
    };

    // Updated Exit Handler
    const handleExit = () => {
        stop(); // Force stop audio/recognition
        onExit();
    };

    const isUserTurn = currentLine?.character === userCharacter;

    const getExampleStatus = (score: number) => score >= threshold;

    if (!hasStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50dvh] space-y-8 animate-in zoom-in-50 duration-500 max-w-xl mx-auto px-6 py-12">

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white">
                        Réglages pour {userCharacter}
                    </h2>
                    <p className="text-gray-400">Configurez la sensibilité de la reconnaissance</p>
                </div>

                {/* Slider UI */}
                <div className="w-full bg-white/5 p-6 rounded-2xl border border-white/10 space-y-6">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">Tolérance</label>
                        <span className="text-primary font-bold">{Math.round(threshold * 100)}%</span>
                    </div>

                    <input
                        type="range"
                        min="0.70"
                        max="1.0"
                        step="0.05"
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />

                    <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest">
                        <span>Cool</span>
                        <span>Strict</span>
                    </div>

                    {/* Dynamic Examples */}
                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <p className="text-xs font-medium text-gray-400 uppercase">Exemples</p>

                        <div className="grid gap-2 text-sm">
                            <div className="flex justify-between items-center p-2 rounded bg-black/20">
                                <div>
                                    <span className="text-gray-400 block text-xs">Ciblé</span>
                                    <span className="text-white">"Je ne veux pas"</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-400 block text-xs">Compris</span>
                                    <span className="italic text-gray-300">"Je veux pas"</span>
                                </div>
                                <div className={cn("ml-4 font-bold", getExampleStatus(0.80) ? "text-green-400" : "text-red-400")}>
                                    {getExampleStatus(0.80) ? "OK" : "NON"}
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-2 rounded bg-black/20">
                                <div>
                                    <span className="text-gray-400 block text-xs">Ciblé</span>
                                    <span className="text-white">"Absolument !"</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-400 block text-xs">Compris</span>
                                    <span className="italic text-gray-300">"Absolument"</span>
                                </div>
                                <div className={cn("ml-4 font-bold", getExampleStatus(0.90) ? "text-green-400" : "text-red-400")}>
                                    {getExampleStatus(0.90) ? "OK" : "NON"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-3">
                    <Button size="lg" onClick={handleStart} className="w-full text-lg py-6 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.5)] bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95">
                        <Play className="mr-2 h-6 w-6" /> Commencer
                    </Button>
                    <Button variant="ghost" onClick={onExit} className="w-full text-gray-400 hover:text-white">Annuler</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[100dvh] flex flex-col overflow-hidden max-w-3xl mx-auto md:h-[80vh] md:rounded-2xl md:border md:border-white/5 md:bg-black/20 md:backdrop-blur-sm">
            {/* Header / Status Bar */}
            <div className="flex-none flex justify-between items-center p-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-10">
                <div className="flex items-center gap-2">
                    <img src="/repeto.png" alt="Repeto" className="w-8 h-8 object-contain opacity-80" />
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest hidden md:inline">
                        Repeto
                    </span>
                    <span className="text-xs font-mono text-gray-600 uppercase tracking-widest ml-2">
                        Ligne {currentLineIndex + 1} / {script.lines.length}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePause}
                        className={cn("h-8 w-8 hover:bg-white/10", isPaused ? "text-yellow-400" : "text-gray-400")}
                    >
                        {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
                    </Button>

                    <Button variant="ghost" size="sm" onClick={handleExit} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30">
                        <Power className="h-3 w-3 mr-1" />
                        QUITTER
                    </Button>
                </div>
            </div>

            {/* Main Script View */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth pb-32">
                {/* Show previous context (last 2 lines) */}
                {script.lines.slice(Math.max(0, currentLineIndex - 2), currentLineIndex).map((line) => (
                    <div key={line.id} className="opacity-40 blur-[0.5px] scale-95 origin-left conversation-line">
                        <p className="text-[10px] md:text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">{line.character}</p>
                        <p className="text-sm md:text-base text-gray-300">{line.text}</p>
                    </div>
                ))}

                {/* Current Active Line */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentLine?.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className={cn(
                            "relative p-6 rounded-2xl border transition-colors duration-500",
                            isUserTurn
                                ? "bg-primary/10 border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.15)]"
                                : "bg-white/5 border-white/10"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={cn(
                                "text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full",
                                isUserTurn ? "bg-primary text-white" : "bg-gray-700 text-gray-300"
                            )}>
                                {currentLine?.character}
                            </span>
                            {status === "listening_user" && (
                                <div className="flex items-center gap-2 text-primary animate-pulse">
                                    <div className="h-2 w-2 rounded-full bg-current" />
                                    <span className="text-[10px] font-bold uppercase">Je vous écoute</span>
                                </div>
                            )}
                            {status === "error" && (
                                <div className="flex items-center gap-2 text-red-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-[10px] font-bold uppercase">Problème</span>
                                </div>
                            )}
                            {status === "paused" && (
                                <div className="flex items-center gap-2 text-yellow-400">
                                    <Pause className="h-4 w-4 fill-current" />
                                    <span className="text-[10px] font-bold uppercase">En Pause</span>
                                </div>
                            )}
                            {status === "playing_other" && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <div className="h-2 w-2 rounded-full bg-current animate-bounce" />
                                    <span className="text-[10px] uppercase">Lecture...</span>
                                </div>
                            )}
                        </div>

                        <p className={cn(
                            "text-xl md:text-3xl font-medium leading-relaxed",
                            isUserTurn ? "text-white" : "text-gray-300 italic",
                            status === "paused" && "opacity-50 blur-[1px] transition-all"
                        )}>
                            {currentLine?.text}
                        </p>

                        {/* Feedback UI */}
                        {status === "paused" && (
                            <div className="mt-6 flex flex-col items-center justify-center py-8 text-yellow-400/50">
                                <Pause className="w-12 h-12 mb-2 opacity-50" />
                                <p className="text-sm font-medium uppercase tracking-widest">Répétition en pause</p>
                            </div>
                        )}

                        {status === "error" && (
                            <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex flex-col gap-3">
                                <div className="flex items-center gap-3 text-red-200">
                                    <img src="/repeto.png" alt="Sad Repeto" className="w-10 h-10 opacity-80 grayscale contrast-125" />
                                    <p className="text-sm font-medium">Je ne vous entends pas...</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button size="sm" variant="destructive" onClick={retry} className="w-full">
                                        Réessayer
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full border-red-500/30 hover:bg-red-500/20 text-red-200" onClick={validateManually}>
                                        Passer
                                    </Button>
                                </div>
                            </div>
                        )}

                        {feedback === "incorrect" && (
                            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 flex gap-4 items-start">
                                <img src="/repeto.png" alt="Repeto" className="w-12 h-12 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <div>
                                    <div className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wide mb-1">
                                        Pas tout à fait...
                                    </div>
                                    <p className="text-sm text-red-200/80">Vous avez dit : <span className="italic text-white">"{lastTranscript}"</span></p>
                                </div>
                            </div>
                        )}

                        {feedback === "correct" && (
                            <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-4 text-green-400">
                                <img src="/repeto.png" alt="Happy Repeto" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                <p className="text-sm font-bold uppercase tracking-wide">Excellent !</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Show next preview (1 line) */}
                {script.lines.slice(currentLineIndex + 1, currentLineIndex + 2).map((line) => (
                    <div key={line.id} className="opacity-30 scale-90 origin-left mt-8">
                        <p className="text-[10px] md:text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">{line.character}</p>
                        <p className="text-sm md:text-base text-gray-500 truncate">{line.text}</p>
                    </div>
                ))}
            </div>

            {/* Controls Fixed Bottom */}
            <div className="flex-none p-6 pb-8 md:p-6 flex items-center justify-center gap-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20 absolute bottom-0 left-0 right-0 md:relative md:bg-none md:border-t md:border-white/5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={skip}
                    className="h-12 w-12 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                >
                    <SkipForward className="h-6 w-6" />
                </Button>

                {status === "listening_user" ? (
                    <div className="flex flex-col items-center gap-2 relative">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-primary/30 blur-3xl animate-pulse rounded-full" />

                        <Button
                            variant="default"
                            size="icon"
                            className="relative h-20 w-20 rounded-full bg-primary hover:bg-primary/90 shadow-2xl border-4 border-black/50 transform active:scale-95 transition-all"
                            onClick={validateManually}
                        >
                            <Mic className="h-8 w-8 text-white" />
                        </Button>
                        <span className="absolute -bottom-8 whitespace-nowrap text-[10px] font-medium text-gray-500 uppercase tracking-widest opacity-60">
                            Appuyer pour valider
                        </span>
                    </div>
                ) : (
                    <div className="h-20 w-20 flex items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <div className="h-2 w-2 rounded-full bg-gray-600 animate-pulse" />
                    </div>
                )}

                {/* Spacer for symmetry if needed, or another helper button */}
                <div className="w-12" />
            </div>
        </div>
    );
}
