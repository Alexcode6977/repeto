'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Quote, Plus, StickyNote } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { AnnotationContext, ParsedScript } from '@/lib/types';

interface InteractiveScriptViewerProps {
    script: ParsedScript;
    currentSceneIdx: number;
    context: AnnotationContext;
    setContext: (ctx: AnnotationContext) => void;
    onMobileInteract?: (ctx: AnnotationContext) => void;
    privateNotes?: any[]; // Array of private notes
}

export function InteractiveScriptViewer({ script, currentSceneIdx, context, setContext, privateNotes = [] }: InteractiveScriptViewerProps) {

    // Filter lines for the current scene
    const sceneLines = useMemo(() => {
        if (!script?.scenes?.[currentSceneIdx]) return [];

        const currentScene = script.scenes[currentSceneIdx];
        const startLine = currentScene.index; // Start index in the lines array
        const nextScene = script.scenes[currentSceneIdx + 1];
        const endLine = nextScene ? nextScene.index : script.lines.length;

        return script.lines.slice(startLine, endLine).map((line, relativeIdx) => ({
            ...line,
            absoluteIndex: startLine + relativeIdx
        }));
    }, [script, currentSceneIdx]);

    // Find scene note
    const sceneNote = privateNotes.find(n => n.scene_index === currentSceneIdx && n.line_index === null);

    return (
        <div className="flex flex-col h-full bg-card/50 relative overflow-hidden">

            {/* Header / Global Scene Context Indicator */}
            <div
                className={cn(
                    "p-6 border-b border-white/5 backdrop-blur-sm sticky top-0 z-20 cursor-pointer transition-all",
                    context.type === 'scene' && context.index === currentSceneIdx
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-background/80 hover:bg-background"
                )}
                onClick={() => setContext({
                    type: 'scene',
                    title: script.scenes[currentSceneIdx]?.title || "Scène",
                    index: currentSceneIdx
                })}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className={cn(
                            "text-xl font-black uppercase tracking-tight transition-colors",
                            context.type === 'scene' && context.index === currentSceneIdx ? "text-amber-500" : "text-amber-500/80"
                        )}>
                            {script.scenes[currentSceneIdx]?.title || "Scène"}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            {context.type === 'scene' && context.index === currentSceneIdx && (
                                <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-in fade-in zoom-in">
                                    CIBLE SÉLECTIONNÉE
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Private Scene Note Display */}
                {sceneNote && (
                    <div className="mt-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-200 text-sm italic relative group">
                        <div className="absolute -top-2 -right-2 bg-blue-500 text-black p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <StickyNote className="w-3 h-3" />
                        </div>
                        <span className="font-bold not-italic mr-2 text-blue-400">[Note Perso]</span>
                        {sceneNote.text}
                    </div>
                )}
            </div>

            {/* Script Viewer */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4">
                {sceneLines.map((line, idx) => {
                    const isDirection = line.type === 'stage_direction';
                    const isDirectorNote = isDirection && (line.text.includes('[Metteur en scène]') || line.text.includes('[Régie ')); // Updated logic

                    const isSelected = context.type === 'line' && context.lineIndex === line.absoluteIndex;

                    // Private Line Note
                    const lineNote = privateNotes.find(n => n.line_index === line.absoluteIndex);

                    return (
                        <div key={`${line.id}-${idx}`} className="relative">
                            {/* Private Note Display (Line Level) */}
                            {lineNote && (
                                <div className="mt-2 ml-6 p-2 rounded border border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs flex gap-2 items-start animate-in slide-in-from-top-1">
                                    <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" />
                                    <span><span className="font-bold text-blue-400">[Note Perso]</span> {lineNote.text}</span>
                                </div>
                            )}

                            <div
                                className={cn(
                                    "group relative rounded-xl transition-all duration-200 cursor-pointer border-2",
                                    isSelected
                                        ? "bg-amber-500/5 border-amber-500/30 shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)] px-6 py-4"
                                        : "border-transparent hover:bg-white/5 px-6 py-3"
                                )}
                                onClick={() => {
                                    if (isSelected) {
                                        setContext({ type: 'none' });
                                    } else {
                                        setContext({
                                            type: 'line',
                                            lineIndex: line.absoluteIndex,
                                            lineContent: line.text,
                                            character: line.character,
                                            sceneIndex: currentSceneIdx
                                        });
                                    }
                                }}
                            >
                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500">
                                        <Plus className="w-3 h-3" />
                                    </div>
                                )}

                                {/* Line Content */}
                                <div className={cn(
                                    "transition-all",
                                    isDirectorNote ? "bg-purple-500/10 border-l-4 border-purple-500/50 p-4 rounded-r-lg" :
                                        isDirection ? "italic text-muted-foreground/80 pl-4 border-l border-white/10" : ""
                                )}>
                                    {isDirectorNote ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 opacity-70">
                                                Note Metteur en Scène
                                            </span>
                                            <p className="font-medium text-purple-50 text-sm leading-relaxed">
                                                {line.text}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {line.type === 'dialogue' && (
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className={cn(
                                                        "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                                                        isSelected ? "text-amber-400" : "text-muted-foreground/60"
                                                    )}>
                                                        {line.character}
                                                    </p>
                                                </div>
                                            )}
                                            <p className={cn(
                                                "leading-relaxed",
                                                line.type === 'dialogue' ? "font-serif text-lg text-foreground/90" : "text-xs",
                                                isSelected && line.type === 'dialogue' && "text-white"
                                            )}>
                                                {line.text}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Space at bottom */}
                <div className="h-32" />
            </div>
        </div>
    );
}
