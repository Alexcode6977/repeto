'use client';

import { useMemo } from 'react';
import { ParsedScript } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Quote, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { AnnotationContext } from './annotator-client';

interface InteractiveScriptViewerProps {
    script: ParsedScript;
    currentSceneIdx: number;
    context: AnnotationContext;
    setContext: (ctx: AnnotationContext) => void;
    onMobileInteract?: (ctx: AnnotationContext) => void;
}

export function InteractiveScriptViewer({ script, currentSceneIdx, context, setContext }: InteractiveScriptViewerProps) {

    // Filter lines for the current scene
    const sceneLines = useMemo(() => {
        if (!script || !script.scenes[currentSceneIdx]) return [];

        const currentScene = script.scenes[currentSceneIdx];
        const startLine = currentScene.index;
        const nextScene = script.scenes[currentSceneIdx + 1];
        const endLine = nextScene ? nextScene.index : script.lines.length;

        return script.lines.slice(startLine, endLine).map((line, relativeIdx) => ({
            ...line,
            absoluteIndex: startLine + relativeIdx
        }));

    }, [script, currentSceneIdx]);

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
                <div>
                    <h2 className={cn(
                        "text-xl font-black uppercase tracking-tight transition-colors",
                        context.type === 'scene' && context.index === currentSceneIdx ? "text-amber-400" : "text-foreground"
                    )}>
                        {script.scenes[currentSceneIdx]?.title || "Scène"}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all",
                            context.type === 'scene' && context.index === currentSceneIdx
                                ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20"
                                : "bg-muted/50 text-muted-foreground border-white/5"
                        )}>
                            {context.type === 'scene' && context.index === currentSceneIdx ? "Cible Sélectionnée" : "Cliquer pour cibler la scène"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Script Viewer */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4">
                {sceneLines.map((line, idx) => {
                    const isDirection = line.type === 'stage_direction';
                    const isDirectorNote = isDirection && line.text.includes('[Metteur en scène]');

                    const isSelected = context.type === 'line' && context.lineIndex === line.absoluteIndex;

                    return (
                        <div key={`${line.id}-${idx}`} className="relative">
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
