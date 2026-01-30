'use client';

import { useMemo } from 'react';
import { ParsedScript } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Quote } from 'lucide-react';
import { AnnotationContext } from './annotator-client';

interface InteractiveScriptViewerProps {
    script: ParsedScript;
    currentSceneIdx: number;
    context: AnnotationContext;
    setContext: (ctx: AnnotationContext) => void;
}

export function InteractiveScriptViewer({ script, currentSceneIdx, context, setContext }: InteractiveScriptViewerProps) {

    // Filter lines for the current scene (Same logic as LiveScriptViewer)
    const sceneLines = useMemo(() => {
        if (!script || !script.scenes[currentSceneIdx]) return [];

        const currentScene = script.scenes[currentSceneIdx];
        const startLine = currentScene.index;
        const nextScene = script.scenes[currentSceneIdx + 1];
        const endLine = nextScene ? nextScene.index : script.lines.length;

        // Return lines with their ABSOLUTE index in the script
        return script.lines.slice(startLine, endLine).map((line, relativeIdx) => ({
            ...line,
            absoluteIndex: startLine + relativeIdx
        }));

    }, [script, currentSceneIdx]);

    return (
        <div className="flex flex-col h-full bg-card/50 border-r border-border/50 relative">

            {/* Header / Global Scene Context Indicator */}
            <div
                className={cn(
                    "p-6 border-b border-border/50 backdrop-blur-sm sticky top-0 z-20 cursor-pointer transition-colors",
                    context.type === 'scene' ? "bg-amber-500/10 border-b-amber-500/30" : "bg-background/50 hover:bg-background/80"
                )}
                onClick={() => setContext({ type: 'scene' })}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className={cn(
                            "text-xl font-black uppercase tracking-tight transition-colors",
                            context.type === 'scene' ? "text-amber-500" : "text-foreground"
                        )}>
                            {script.scenes[currentSceneIdx]?.title || "Scène"}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full border",
                                context.type === 'scene'
                                    ? "bg-amber-500 text-black border-amber-500"
                                    : "bg-muted text-muted-foreground border-transparent"
                            )}>
                                {context.type === 'scene' ? "Cible Actuelle" : "Cliquer pour cibler la scène entière"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Script Viewer */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
                {sceneLines.map((line, idx) => {
                    const isDirection = line.type === 'stage_direction';
                    const isDirectorNote = isDirection && line.character === 'Metteur en Scène';

                    const isSelected = context.type === 'line' && context.lineIndex === line.absoluteIndex;

                    return (
                        <div
                            key={`${line.id}-${idx}`}
                            className={cn(
                                "group relative rounded-xl transition-all duration-200 cursor-pointer border-2",
                                isSelected
                                    ? "bg-amber-500/5 border-amber-500/50 shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)] pl-6 pr-4 py-4"
                                    : "border-transparent hover:bg-muted/30 px-4 py-1"
                            )}
                            onClick={() => {
                                // Toggle selection
                                if (isSelected) {
                                    setContext({ type: 'scene' });
                                } else {
                                    setContext({
                                        type: 'line',
                                        lineIndex: line.absoluteIndex,
                                        lineContent: line.text,
                                        character: line.character
                                    });
                                }
                            }}
                        >
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500">
                                    <Quote className="w-3 h-3 fill-current" />
                                </div>
                            )}

                            {/* Line Content */}
                            <div className={cn(
                                "transition-all",
                                isDirectorNote ? "bg-purple-500/10 border-l-4 border-purple-500 p-3 rounded-r-lg" :
                                    // Standard Direction
                                    isDirection ? "italic text-muted-foreground" : ""
                            )}>
                                {isDirectorNote ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                                            Note Metteur en Scène
                                        </span>
                                        <p className="font-medium text-purple-100 text-sm">
                                            {line.text.replace('[NOTE] ', '')}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {line.type === 'dialogue' && (
                                            <p className={cn(
                                                "text-xs font-bold uppercase tracking-widest mb-1 transition-colors",
                                                isSelected ? "text-amber-500" : "text-muted-foreground"
                                            )}>
                                                {line.character}
                                            </p>
                                        )}
                                        <p className={cn(
                                            "leading-relaxed font-serif",
                                            line.type === 'dialogue' ? "text-lg text-foreground" : "text-sm",
                                            isSelected && line.type === 'dialogue' && "font-medium"
                                        )}>
                                            {line.text}
                                        </p>
                                    </>
                                )}
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
