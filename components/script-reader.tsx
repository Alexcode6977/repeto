"use client";

import { useState, useRef, useEffect } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { ArrowLeft, BookOpen, Settings2, Highlighter, Layout, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptReaderProps {
    script: ParsedScript;
    userCharacter: string;
    onExit: () => void;
}

export function ScriptReader({ script, userCharacter, onExit }: ScriptReaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [highlightStyle, setHighlightStyle] = useState<"box" | "text">("box");
    const [showSettings, setShowSettings] = useState(false);

    // Scroll to first line of user on mount? Optional, maybe nice.
    useEffect(() => {
        // Find first user line
        // const firstLine = document.getElementById("first-user-line");
        // if (firstLine) firstLine.scrollIntoView({ behavior: "smooth", block: "center" });
    }, []);

    return (
        <div className="w-full h-[100dvh] flex flex-col bg-[#1a1a1a] text-white font-sans overflow-hidden md:h-[85vh] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl">

            {/* Header */}
            <div className="flex-none p-4 md:p-6 border-b border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center z-10 relative">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-white/10 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-bold leading-tight line-clamp-1">{script.title || "Lecture du script"}</h2>
                        <p className="text-xs text-gray-400">Rôle : <span className="text-yellow-400 font-bold">{userCharacter}</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Style Toggle (Desktop) */}
                    <div className="hidden md:flex bg-white/10 rounded-full p-1 border border-white/10 shadow-inner">
                        <button
                            onClick={() => setHighlightStyle("box")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                highlightStyle === "box" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <Layout className="w-3 h-3" />
                            Cadre
                        </button>
                        <button
                            onClick={() => setHighlightStyle("text")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                highlightStyle === "text" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <Highlighter className="w-3 h-3" />
                            Surligné
                        </button>
                    </div>

                    <div className="md:hidden cursor-pointer flex items-center gap-2 text-xs font-bold text-white bg-white/10 px-4 py-2 rounded-full border border-white/10 hover:bg-white/20 transition-all active:scale-95" onClick={() => setShowSettings(!showSettings)}>
                        {highlightStyle === "box" ? <Layout className="w-3 h-3" /> : <Highlighter className="w-3 h-3" />}
                        <span className="ml-1">{highlightStyle === "box" ? "Cadre" : "Surligné"}</span>
                        <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                    </div>
                </div>

                {/* Mobile Settings Dropdown */}
                {showSettings && (
                    <div className="absolute top-20 right-4 bg-black/90 border border-white/10 p-2 rounded-xl flex flex-col gap-1 z-30 md:hidden animate-in zoom-in-95 backdrop-blur-xl shadow-2xl">
                        <button
                            onClick={() => { setHighlightStyle("box"); setShowSettings(false); }}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all",
                                highlightStyle === "box" ? "bg-white/10 text-white" : "text-gray-400"
                            )}
                        >
                            <Layout className="w-4 h-4" />
                            Cadre
                        </button>
                        <button
                            onClick={() => { setHighlightStyle("text"); setShowSettings(false); }}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all",
                                highlightStyle === "text" ? "bg-yellow-500 text-black" : "text-gray-400"
                            )}
                        >
                            <Highlighter className="w-4 h-4" />
                            Surligné
                        </button>
                    </div>
                )}
            </div>

            {/* Script Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth" onClick={() => setShowSettings(false)}>
                <div className="max-w-3xl mx-auto space-y-6 pb-32">
                    {script.lines.map((line, idx) => {
                        const isUser = line.character === userCharacter;
                        return (
                            <div
                                key={line.id}
                                id={isUser && idx === script.lines.findIndex(l => l.character === userCharacter) ? "first-user-line" : undefined}
                                className={cn(
                                    "relative p-4 rounded-xl transition-all duration-300",
                                    isUser && highlightStyle === "box"
                                        ? "bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.05)]"
                                        : "border border-transparent hover:bg-white/5"
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
                                    isUser && highlightStyle === "text"
                                        ? "bg-yellow-500 text-black px-2 py-1 rounded-md box-decoration-clone inline shadow-lg shadow-yellow-500/20 font-bold"
                                        : isUser ? "text-yellow-100 font-medium" : "text-gray-300"
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
                <div className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 p-2 rounded-full shadow-lg" onClick={() => setShowSettings(!showSettings)}>
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs ring-4 ring-black/50">
                        <Settings2 className="w-4 h-4" />
                    </div>
                </div>
            </div>

        </div>
    );
}
