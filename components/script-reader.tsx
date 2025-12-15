"use client";

import { useState, useRef, useEffect } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { ArrowLeft, Highlighter, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptReaderProps {
    script: ParsedScript;
    userCharacter: string;
    onExit: () => void;
}

export function ScriptReader({ script, userCharacter, onExit }: ScriptReaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [highlightStyle, setHighlightStyle] = useState<"box" | "text">("box");

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a] text-white font-sans overflow-hidden">
            {/* Header */}
            <div className="flex-none p-4 border-b border-white/10 bg-black/80 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-white/10 rounded-full text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-bold leading-tight line-clamp-1 text-white">{script.title || "Lecture"}</h2>
                        <p className="text-xs text-gray-400">Rôle : <span className="text-yellow-400 font-bold">{userCharacter}</span></p>
                    </div>
                </div>

                {/* TOGGLE BUTTONS - FIXED LAYOUT */}
                <div className="flex items-center gap-0 bg-neutral-900 rounded-full p-1 border border-white/20 flex-shrink-0">
                    <button
                        onClick={() => setHighlightStyle("box")}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                            highlightStyle === "box" ? "bg-white text-black" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Layout className="w-4 h-4" />
                        Cadre
                    </button>
                    <button
                        onClick={() => setHighlightStyle("text")}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                            highlightStyle === "text" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Highlighter className="w-4 h-4" />
                        Surligné
                    </button>
                </div>
            </div>

            {/* Script Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-6 pb-32">
                    {script.lines.map((line, idx) => {
                        const isUser = line.character === userCharacter;
                        return (
                            <div
                                key={line.id}
                                className={cn(
                                    "relative p-4 rounded-xl transition-all duration-300",
                                    isUser && highlightStyle === "box"
                                        ? "bg-yellow-500/10 border border-yellow-500/30"
                                        : "border border-transparent hover:bg-white/5"
                                )}
                            >
                                <div className="mb-2">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest",
                                        isUser ? "text-yellow-400" : "text-gray-500"
                                    )}>
                                        {line.character}
                                    </span>
                                </div>
                                <p className={cn(
                                    "text-lg md:text-xl leading-relaxed",
                                    isUser && highlightStyle === "text"
                                        ? "bg-yellow-400 text-black px-3 py-1 rounded font-bold"
                                        : isUser ? "text-yellow-100 font-medium" : "text-gray-300"
                                )}>
                                    {line.text}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
