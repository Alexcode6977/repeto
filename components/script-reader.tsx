"use client";

import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface ScriptReaderProps {
    script: ParsedScript;
    userCharacter: string;
    onExit: () => void;
}

export function ScriptReader({ script, userCharacter, onExit }: ScriptReaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to first line of user on mount? Optional, maybe nice.
    useEffect(() => {
        // Find first user line
        // const firstLine = document.getElementById("first-user-line");
        // if (firstLine) firstLine.scrollIntoView({ behavior: "smooth", block: "center" });
    }, []);

    return (
        <div className="w-full h-[100dvh] flex flex-col bg-[#1a1a1a] text-white font-sans overflow-hidden md:h-[85vh] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl">

            {/* Header */}
            <div className="flex-none p-4 md:p-6 border-b border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-white/10 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-bold leading-tight line-clamp-1">{script.title || "Lecture du script"}</h2>
                        <p className="text-xs text-gray-400">Rôle : <span className="text-yellow-400 font-bold">{userCharacter}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <BookOpen className="w-3 h-3" />
                    Mode Lecture
                </div>
            </div>

            {/* Script Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                <div className="max-w-3xl mx-auto space-y-6 pb-32">
                    {script.lines.map((line, idx) => {
                        const isUser = line.character === userCharacter;
                        return (
                            <div
                                key={line.id}
                                id={isUser && idx === script.lines.findIndex(l => l.character === userCharacter) ? "first-user-line" : undefined}
                                className={cn(
                                    "relative p-4 rounded-xl transition-all duration-300",
                                    isUser
                                        ? "bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.05)]"
                                        : "hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest",
                                        isUser ? "text-yellow-400" : "text-gray-500"
                                    )}>
                                        {line.character}
                                    </span>
                                </div>
                                <p className={cn(
                                    "text-lg md:text-xl leading-relaxed",
                                    isUser ? "text-yellow-100 font-medium" : "text-gray-300"
                                )}>
                                    {line.text}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Floating Action / Legend (Mobile) */}
            <div className="md:hidden fixed bottom-6 right-6 z-20">
                <div className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 p-2 rounded-full shadow-lg">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs ring-4 ring-black/50">
                        Moi
                    </div>
                </div>
            </div>

        </div>
    );
}
