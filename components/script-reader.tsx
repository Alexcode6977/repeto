"use client";

import { useState, useRef } from "react";
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

    // Count user lines for numbering
    let userLineCounter = 0;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a] text-white font-sans overflow-hidden">
            {/* Header - Title only */}
            <div className="flex-none px-4 pt-8 pb-4 border-b border-white/10 bg-black/80 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-white/10 rounded-full text-white">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h2 className="text-lg font-bold leading-tight line-clamp-1 text-white">{script.title || "Lecture"}</h2>
                    <p className="text-xs text-gray-400">Rôle : <span className="text-yellow-400 font-bold">{userCharacter}</span></p>
                </div>
            </div>

            {/* Toggle Bar - SEPARATE ROW */}
            <div className="flex-none px-4 py-4 bg-black/60 border-b border-white/5 flex justify-center">
                <div className="flex items-center gap-0 bg-neutral-800 rounded-full p-1.5 border border-white/20 shadow-lg">
                    <button
                        onClick={() => setHighlightStyle("box")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold transition-all",
                            highlightStyle === "box" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Layout className="w-5 h-5" />
                        Encadré
                    </button>
                    <button
                        onClick={() => setHighlightStyle("text")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold transition-all",
                            highlightStyle === "text" ? "bg-yellow-400 text-black shadow-md" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Highlighter className="w-5 h-5" />
                        Surligné
                    </button>
                </div>
            </div>

            {/* Script Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-4 pb-32">
                    {script.lines.map((line) => {
                        const isUser = line.character === userCharacter;

                        // Increment counter for user lines
                        if (isUser) {
                            userLineCounter++;
                        }
                        const lineNumber = isUser ? userLineCounter : null;

                        return (
                            <div
                                key={line.id}
                                className={cn(
                                    "relative p-4 rounded-xl transition-all duration-200",
                                    isUser && highlightStyle === "box"
                                        ? "bg-yellow-500/15 border-2 border-yellow-500/50"
                                        : "border border-transparent hover:bg-white/5"
                                )}
                            >
                                {/* Character name with line number */}
                                <div className="flex items-center gap-2 mb-2">
                                    {isUser && lineNumber && (
                                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            #{lineNumber}
                                        </span>
                                    )}
                                    <span className={cn(
                                        "text-[11px] font-bold uppercase tracking-widest",
                                        isUser ? "text-yellow-400" : "text-gray-500"
                                    )}>
                                        {line.character}
                                    </span>
                                </div>

                                {/* Text content */}
                                {highlightStyle === "text" && isUser ? (
                                    <p className="text-lg md:text-xl leading-relaxed">
                                        <span className="bg-yellow-400 text-black px-2 py-1 rounded font-bold inline leading-loose">
                                            {line.text}
                                        </span>
                                    </p>
                                ) : (
                                    <p className={cn(
                                        "text-lg md:text-xl leading-relaxed",
                                        isUser ? "text-yellow-100 font-medium" : "text-gray-300"
                                    )}>
                                        {line.text}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
