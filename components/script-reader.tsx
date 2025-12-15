"use client";

import { useState, useRef, useMemo } from "react";
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

    // Pre-calculate line numbers for user character
    const userLineNumbers = new Map<string, number>();
    let counter = 0;
    script.lines.forEach((line) => {
        if (line.character === userCharacter) {
            counter++;
            userLineNumbers.set(line.id, counter);
        }
    });

    // Build a map of line index -> scene info
    const sceneAtIndex = useMemo(() => {
        const map = new Map<number, string>();
        if (script.scenes && script.scenes.length > 0) {
            script.scenes.forEach((scene, idx) => {
                map.set(scene.index, scene.title);
            });
        }
        return map;
    }, [script.scenes]);

    // Track current scene for sticky display
    const getCurrentScene = (lineIndex: number): string | null => {
        let currentScene: string | null = null;
        for (const scene of script.scenes || []) {
            if (scene.index <= lineIndex) {
                currentScene = scene.title;
            } else {
                break;
            }
        }
        return currentScene;
    };

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

            {/* Script Content with Scene Indicator */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="flex">
                    {/* Left Scene Indicator Column */}
                    <div className="hidden md:block w-24 flex-shrink-0 bg-black/40 border-r border-white/5 sticky left-0">
                        {/* This is a placeholder - actual indicators are inline */}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-4 md:p-8">
                        <div className="max-w-3xl mx-auto space-y-4 pb-32">
                            {script.lines.map((line, idx) => {
                                const isUser = line.character === userCharacter;
                                const lineNumber = userLineNumbers.get(line.id);
                                const sceneTitle = sceneAtIndex.get(idx);

                                return (
                                    <div key={line.id}>
                                        {/* Scene Header - Shows when a new scene starts */}
                                        {sceneTitle && (
                                            <div className="flex items-center gap-3 py-4 mb-4 border-b border-white/10">
                                                <div className="bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                    {sceneTitle}
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={cn(
                                                "relative p-4 rounded-xl transition-all duration-200 flex gap-4",
                                                isUser && highlightStyle === "box"
                                                    ? "bg-yellow-500/15 border-2 border-yellow-500/50"
                                                    : "border border-transparent hover:bg-white/5"
                                            )}
                                        >
                                            {/* Scene indicator on left for desktop */}
                                            <div className="hidden md:flex flex-col items-center w-12 flex-shrink-0 pt-1">
                                                {/* Small scene badge on each line (optional visual) */}
                                                <span className="text-[9px] text-gray-600 font-mono">
                                                    {getCurrentScene(idx)?.split(' ').slice(0, 2).join(' ')}
                                                </span>
                                            </div>

                                            <div className="flex-1">
                                                {/* Character name with line number */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    {lineNumber && (
                                                        <span className="text-yellow-400 text-[11px] font-bold">
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

                                                {/* Text content - FORCED YELLOW HIGHLIGHT */}
                                                <p
                                                    className="text-lg md:text-xl leading-relaxed"
                                                    style={
                                                        highlightStyle === "text" && isUser
                                                            ? { backgroundColor: '#facc15', color: '#000', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', display: 'inline' }
                                                            : undefined
                                                    }
                                                >
                                                    <span className={cn(
                                                        isUser && highlightStyle !== "text" ? "text-yellow-100 font-medium" : "",
                                                        !isUser ? "text-gray-300" : ""
                                                    )}>
                                                        {line.text}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
