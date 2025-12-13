"use client";

import { useState } from "react";
import { ScriptLine, ParsedScript } from "@/lib/types";
import { useRehearsal } from "@/lib/hooks/use-rehearsal";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Mic, MicOff, Play, SkipForward, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface RehearsalModeProps {
    script: ParsedScript;
    userCharacter: string;
    onExit: () => void;
}

export function RehearsalMode({ script, userCharacter, onExit }: RehearsalModeProps) {
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
        validateManually
    } = useRehearsal({ script, userCharacter });

    const [hasStarted, setHasStarted] = useState(false);

    const handleStart = () => {
        setHasStarted(true);
        start();
    };

    const isUserTurn = currentLine?.character === userCharacter;

    // Auto-scroll logic could be added here to keep current line in view

    if (!hasStarted) {
        return (
            <div className="flex flex-col items-center justify-center h-[50dvh] space-y-8 animate-in zoom-in-50 duration-500 max-w-md mx-auto px-6">

                {/* Speech Bubble */}
                <div className="relative bg-white text-black p-6 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 delay-300">
                    <p className="text-center font-medium">
                        Salut ! Je suis <span className="font-bold text-primary">Repeto</span>.<br />
                        Je ferai les autres voix. <br />
                        Quand c'est à vous, attendez mon signal et parlez !
                    </p>
                    {/* Triangle pointer */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 transform" />
                </div>

                <div className="relative w-40 h-40">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <img src="/repeto.png" alt="Repeto" className="relative w-full h-full object-contain animate-bounce-slow" />
                </div>

                <div className="space-y-4 w-full text-center">
                    <h2 className="text-2xl font-bold text-white">
                        Prêt à incarner {userCharacter} ?
                    </h2>

                    <Button size="lg" onClick={handleStart} className="w-full text-lg py-6 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.5)] bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95">
                        <Play className="mr-2 h-6 w-6" /> C'est parti !
                    </Button>
                    <Button variant="ghost" onClick={onExit} className="text-gray-400 hover:text-white">Annuler</Button>
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
                <Button variant="ghost" size="sm" onClick={onExit} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30">
                    QUITTER
                </Button>
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
                            {status === "playing_other" && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <div className="h-2 w-2 rounded-full bg-current animate-bounce" />
                                    <span className="text-[10px] uppercase">Lecture...</span>
                                </div>
                            )}
                        </div>

                        <p className={cn(
                            "text-xl md:text-3xl font-medium leading-relaxed",
                            isUserTurn ? "text-white" : "text-gray-300 italic"
                        )}>
                            {currentLine?.text}
                        </p>

                        {/* Feedback UI */}
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
