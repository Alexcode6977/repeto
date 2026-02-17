"use client";

import { useState, useRef, useMemo } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { ArrowLeft, Highlighter, Layout, Download } from "lucide-react";
import { cn, getCollectiveMembersForLine, getSceneCharacters, isUserLine } from "@/lib/utils";
import { ScriptSettings } from "./script-setup";
import { exportToPdf } from "@/lib/pdf-export";
import { filterScriptLines, parseSegments } from "@/lib/utils/stage-directions";

import { StickyNote } from "lucide-react";
import { PRIVATE_NOTE_CHAR } from "./script-viewer";

interface ScriptReaderProps {
    script: ParsedScript;
    userCharacters: string[];
    onExit: () => void;
    settings: ScriptSettings;
    playId?: string;
    userId?: string;
    skipCharacters?: string[];
    privateNotes?: any[];
    showStageDirections?: boolean; // Toggle for showing/hiding stage directions
}

export function ScriptReader({ script, userCharacters, onExit, settings, skipCharacters = [], privateNotes = [], showStageDirections = true }: ScriptReaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const lineRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const [highlightStyle, setHighlightStyle] = useState<"box" | "text">("box");

    // Check if private notes are enabled
    const showPrivateNotes = userCharacters.includes(PRIVATE_NOTE_CHAR);

    // Pre-calculate per-scene characters for correct "TOUS" handling
    // We only need to do this once when script changes
    const sceneCharactersMap = useMemo(() => {
        return getSceneCharacters(script);
    }, [script]);

    // Build a map of line index -> scene info (including scene start index for lookup)
    const sceneInfoMap = useMemo(() => {
        const map = new Map<number, { title: string, startIndex: number }>();
        if (script.scenes && script.scenes.length > 0) {
            script.scenes.forEach((scene) => {
                map.set(scene.index, { title: scene.title, startIndex: scene.index });
            });
        }
        return map;
    }, [script.scenes]);

    // Compatible map for PDF export (which expects Map<number, string>)
    const sceneTitleMap = useMemo(() => {
        const map = new Map<number, string>();
        if (script.scenes && script.scenes.length > 0) {
            script.scenes.forEach((scene) => {
                map.set(scene.index, scene.title);
            });
        }
        return map;
    }, [script.scenes]);

    // Track current scene for sticky display AND context
    const getCurrentSceneInfo = (lineIndex: number): { title: string, startIndex: number } | null => {
        let currentScene: { title: string, startIndex: number } | null = null;
        for (const scene of script.scenes || []) {
            if (scene.index <= lineIndex) {
                currentScene = { title: scene.title, startIndex: scene.index };
            } else {
                break;
            }
        }
        // Fallback for scripts without scenes: treat as index 0
        if (!currentScene && (!script.scenes || script.scenes.length === 0)) {
            return { title: "", startIndex: 0 };
        }
        return currentScene;
    };

    // Pre-calculate line numbers for user characters
    const userLineNumbers = useMemo(() => {
        const map = new Map<string, number>();
        let counter = 0;

        script.lines.forEach((line, index) => {
            const sceneInfo = getCurrentSceneInfo(index);
            const activeChars = sceneInfo ? sceneCharactersMap.get(sceneInfo.startIndex) : undefined;
            const collectiveMembers = getCollectiveMembersForLine(script, index);

            if (isUserLine(line.character, userCharacters, activeChars, collectiveMembers)) {
                counter++;
                map.set(line.id, counter);
            }
        });
        return map;
    }, [script.lines, userCharacters, sceneCharactersMap]); // Add sceneCharactersMap dependency

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

    // Helper to check if a line should be skipped
    const shouldSkipLine = (lineChar: string) => {
        const normalizedLineChar = lineChar.toLowerCase().trim();
        return (skipCharacters || []).some(skipChar =>
            skipChar && normalizedLineChar === skipChar.toLowerCase().trim()
        );
    };

    // Filter lines based on mode AND skipCharacters
    const filteredLines = useMemo(() => {
        const linesWithOriginalIndex = script.lines
            .map((line, index) => ({
                ...line,
                originalIndex: index
            }))
            .filter(line => !shouldSkipLine(line.character)); // Skip ignored characters

        // Apply stage directions filtering (cast to preserve originalIndex)
        const stageFilteredLines = filterScriptLines(linesWithOriginalIndex, showStageDirections) as typeof linesWithOriginalIndex;

        if (settings.mode === "full") return stageFilteredLines;

        return stageFilteredLines.filter((line) => {
            const sceneInfo = getCurrentSceneInfo(line.originalIndex);
            const activeChars = sceneInfo ? sceneCharactersMap.get(sceneInfo.startIndex) : undefined;
            const collectiveMembers = getCollectiveMembersForLine(script, line.originalIndex);
            const isUser = isUserLine(line.character, userCharacters, activeChars, collectiveMembers);

            if (isUser) return true;

            if (settings.mode === "cue") {
                const nextLine = script.lines[line.originalIndex + 1];
                if (nextLine) {
                    const nextSceneInfo = getCurrentSceneInfo(line.originalIndex + 1);
                    const nextActiveChars = nextSceneInfo ? sceneCharactersMap.get(nextSceneInfo.startIndex) : undefined;
                    const nextCollectiveMembers = getCollectiveMembersForLine(script, line.originalIndex + 1);
                    return isUserLine(nextLine.character, userCharacters, nextActiveChars, nextCollectiveMembers) && !shouldSkipLine(nextLine.character);
                }
            }
            return false;
        });
    }, [script.lines, settings.mode, userCharacters, skipCharacters, showStageDirections, sceneCharactersMap]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground font-sans overflow-hidden">
            {/* Header */}
            <div className="flex-none px-4 pt-4 pb-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-[110] flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-accent hover:text-accent-foreground rounded-full h-10 w-10">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="sr-only">Retour</span>
                    </Button>
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold leading-tight line-clamp-1">{script.title || "Lecture"}</h2>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                            Rôles : <span className="text-primary font-bold">{userCharacters.join(", ")}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPdf(filteredLines, script.title || "Script", userCharacters.join(", "), settings, sceneTitleMap)}
                        className="gap-2 hidden sm:flex"
                    >
                        <Download className="w-4 h-4" />
                        Exporter PDF
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => exportToPdf(filteredLines, script.title || "Script", userCharacters.join(", "), settings, sceneTitleMap)}
                        className="sm:hidden"
                    >
                        <Download className="w-5 h-5" />
                        <span className="sr-only">PDF</span>
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
                                const sceneInfo = getCurrentSceneInfo((line as any).originalIndex);
                                const activeChars = sceneInfo ? sceneCharactersMap.get(sceneInfo.startIndex) : undefined;
                                const collectiveMembers = getCollectiveMembersForLine(script, (line as any).originalIndex);
                                const isUser = isUserLine(line.character, userCharacters, activeChars, collectiveMembers);

                                const lineNumber = userLineNumbers.get(line.id);
                                // The map keys are ORIGINAL indexes (from scenes array), so we need to find if this line starts a scene
                                const sceneTitle = sceneInfoMap.get((line as any).originalIndex)?.title;

                                // Private Note Logic

                                const note = showPrivateNotes && privateNotes.length > 0
                                    ? privateNotes.find(n => n.line_index === (line as any).originalIndex)
                                    : null;

                                const isIndication = line.character === "INDICATIONS";

                                return (
                                    <div key={line.id}>
                                        {sceneTitle && (
                                            <div className="flex items-center gap-3 py-4 mb-4 border-b border-border">
                                                <div className="bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                    {sceneTitle}
                                                </div>
                                            </div>
                                        )}

                                        {/* Private Note Display */}
                                        {note && (
                                            <div className="mb-2 ml-14 p-2 rounded border border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs flex gap-2 items-start animate-in slide-in-from-top-1 w-fit max-w-xl">
                                                <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" />
                                                <span><span className="font-bold text-blue-400">[Note Perso]</span> {note.text}</span>
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
                                                    {getCurrentSceneInfo((line as any).originalIndex)?.title?.split(' ').slice(0, 2).join(' ')}
                                                </span>
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {lineNumber && (
                                                        <span className="text-yellow-600 dark:text-yellow-400 text-[11px] font-bold">
                                                            #{lineNumber}
                                                        </span>
                                                    )}
                                                    {!isIndication && (
                                                        <span className={cn(
                                                            "text-[11px] font-bold uppercase tracking-widest",
                                                            isUser ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
                                                        )}>
                                                            {line.character}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-lg md:text-xl leading-relaxed">
                                                    <span className={cn(
                                                        isUser && highlightStyle !== "text" ? "text-yellow-800 dark:text-yellow-100 font-medium" : "",
                                                        !isUser && !isIndication ? "text-muted-foreground" : "",
                                                        isIndication ? "text-muted-foreground italic text-base" : ""
                                                    )}>
                                                        {parseSegments(getVisibleText(line.text, isUser) || "").map((segment, i) => (
                                                            <span key={i} className={cn(
                                                                segment.isDirection ? "italic text-muted-foreground bg-transparent font-normal" : "",
                                                                !segment.isDirection && isUser && highlightStyle === "text"
                                                                    ? "bg-yellow-400 text-black px-1 rounded box-decoration-clone"
                                                                    : ""
                                                            )}
                                                                style={
                                                                    !segment.isDirection && highlightStyle === "text" && isUser
                                                                        ? { backgroundColor: '#facc15', color: '#000000', padding: '4px 2px', borderRadius: '2px', display: 'inline', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }
                                                                        : undefined
                                                                }
                                                            >
                                                                {segment.text}
                                                            </span>
                                                        ))}
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
