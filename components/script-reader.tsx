"use client";

import { useState, useRef, useMemo } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { ArrowLeft, Highlighter, Layout, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScriptSettings } from "./script-setup";
import { exportToPdf } from "@/lib/pdf-export";

interface ScriptReaderProps {
    script: ParsedScript;
    userCharacters: string[];
    onExit: () => void;
    settings: ScriptSettings;
    playId?: string;
    userId?: string;
}

export function ScriptReader({ script, userCharacters, onExit, settings }: ScriptReaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const lineRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const [highlightStyle, setHighlightStyle] = useState<"box" | "text">("box");

    // Helper to check if user is in this line's character
    const isUserLine = (lineChar: string) => {
        if (!lineChar || !userCharacters || userCharacters.length === 0) return false;

        const normalizedLineChar = lineChar.toLowerCase().trim();
        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());

        return userCharacters.some(userChar => {
            const normalizedUserChar = userChar.toLowerCase().trim();
            return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
        });
    };

    // Pre-calculate line numbers for user characters
    const userLineNumbers = useMemo(() => {
        const map = new Map<string, number>();
        let counter = 0;
        script.lines.forEach((line) => {
            if (isUserLine(line.character)) {
                counter++;
                map.set(line.id, counter);
            }
        });
        return map;
    }, [script.lines, userCharacters]);

    // Build a map of line index -> scene info
    const sceneAtIndex = useMemo(() => {
        const map = new Map<number, string>();
        if (script.scenes && script.scenes.length > 0) {
            script.scenes.forEach((scene) => {
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

    // Helper for visibility masking
    const getVisibleText = (text: string, isUser: boolean) => {
        if (!isUser || settings.visibility === "visible") return text;

        if (settings.visibility === "hint") {
            const words = text.split(" ");
            if (words.length <= 2) return text;
            return `${words[0]} ${words[1]} ...`;
        }

        return "...............";
    };

    // Filter lines based on mode
    const filteredLines = useMemo(() => {
        const linesWithOriginalIndex = script.lines.map((line, index) => ({
            ...line,
            originalIndex: index
        }));

        if (settings.mode === "full") return linesWithOriginalIndex;

        return linesWithOriginalIndex.filter((line) => {
            const isUser = isUserLine(line.character);
            if (isUser) return true;

            if (settings.mode === "cue") {
                const nextLine = script.lines[line.originalIndex + 1];
                return nextLine && isUserLine(nextLine.character);
            }
            return false;
        });
    }, [script.lines, settings.mode, userCharacters]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground font-sans overflow-hidden">
            {/* Header */}
            <div className="flex-none px-4 pt-8 pb-4 border-b border-border bg-background/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-muted rounded-full text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-bold leading-tight line-clamp-1 text-foreground">{script.title || "Lecture"}</h2>
                        <p className="text-xs text-muted-foreground">Rôles : <span className="text-yellow-600 dark:text-yellow-400 font-bold">{userCharacters.join(", ")}</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => exportToPdf(filteredLines, script.title || "Script", userCharacters.join(", "), settings, sceneAtIndex)}
                        className="bg-card hover:bg-muted border border-border rounded-xl flex items-center gap-2 text-xs font-bold py-2 h-auto"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exporter PDF</span>
                    </Button>
                </div>
            </div>

            {/* Toggle Bar */}
            <div className="flex-none px-4 py-4 bg-background/60 border-b border-border flex justify-center">
                <div className="flex items-center gap-0 bg-muted rounded-full p-1.5 border border-border shadow-lg">
                    <button
                        onClick={() => setHighlightStyle("box")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold transition-all",
                            highlightStyle === "box" ? "bg-white text-black shadow-md" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Layout className="w-5 h-5" />
                        Encadré
                    </button>
                    <button
                        onClick={() => setHighlightStyle("text")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold transition-all",
                            highlightStyle === "text" ? "bg-yellow-400 text-black shadow-md" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Highlighter className="w-5 h-5" />
                        Surligné
                    </button>
                </div>
            </div>

            {/* Script Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="flex">
                    <div className="hidden md:block w-24 flex-shrink-0 bg-background/40 border-r border-border sticky left-0" />
                    <div className="flex-1 p-4 md:p-8">
                        <div className="max-w-3xl mx-auto space-y-4 pb-32">
                            {filteredLines.map((line, idx) => {
                                const isUser = isUserLine(line.character);
                                const lineNumber = userLineNumbers.get(line.id);
                                const sceneTitle = sceneAtIndex.get((line as any).originalIndex);

                                return (
                                    <div key={line.id}>
                                        {sceneTitle && (
                                            <div className="flex items-center gap-3 py-4 mb-4 border-b border-border">
                                                <div className="bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                    {sceneTitle}
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            ref={(el) => {
                                                if (el) lineRefs.current.set(line.id, el);
                                            }}
                                            className={cn(
                                                "relative p-4 rounded-xl transition-all duration-200 flex gap-4",
                                                isUser && highlightStyle === "box"
                                                    ? "bg-yellow-500/15 border-2 border-yellow-500/50"
                                                    : "border border-transparent hover:bg-card"
                                            )}
                                        >
                                            <div className="hidden md:flex flex-col items-center w-12 flex-shrink-0 pt-1">
                                                <span className="text-[9px] text-muted-foreground font-mono">
                                                    {getCurrentScene(idx)?.split(' ').slice(0, 2).join(' ')}
                                                </span>
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {lineNumber && (
                                                        <span className="text-yellow-600 dark:text-yellow-400 text-[11px] font-bold">
                                                            #{lineNumber}
                                                        </span>
                                                    )}
                                                    <span className={cn(
                                                        "text-[11px] font-bold uppercase tracking-widest",
                                                        isUser ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
                                                    )}>
                                                        {line.character}
                                                    </span>
                                                </div>

                                                <p className="text-lg md:text-xl leading-relaxed">
                                                    <span className={cn(
                                                        isUser && highlightStyle !== "text" ? "text-yellow-800 dark:text-yellow-100 font-medium" : "",
                                                        !isUser ? "text-muted-foreground" : "",
                                                        isUser && highlightStyle === "text" ? "bg-yellow-400 text-black px-1 rounded box-decoration-clone" : ""
                                                    )}
                                                        style={
                                                            highlightStyle === "text" && isUser
                                                                ? { backgroundColor: '#facc15', color: '#000000', padding: '4px 8px', borderRadius: '4px', display: 'inline', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }
                                                                : undefined
                                                        }
                                                    >
                                                        {getVisibleText(line.text, isUser)}
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
