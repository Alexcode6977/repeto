'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ParsedScript, ScriptLine } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, NotebookPen, Quote } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { injectDirectorNote } from '@/lib/actions/director';
import { AnimatePresence, motion } from 'framer-motion';

interface LiveScriptViewerProps {
    sessionData: any;
    currentSceneIdx: number;
    scenes: any[];
    isReadOnly?: boolean;
}

export function LiveScriptViewer({ sessionData, currentSceneIdx, scenes, isReadOnly }: LiveScriptViewerProps) {
    const currentScene = scenes[currentSceneIdx];

    // Find the relevant play for the current scene
    const play = useMemo(() => {
        if (!currentScene) return null;
        return sessionData.plays?.find((p: any) => p.id === currentScene.playId);
    }, [currentScene, sessionData.plays]);

    const script = play?.script_content as ParsedScript;

    // Filter lines for the current scene
    const sceneLines = useMemo(() => {
        if (!script || !currentScene) return [];

        // Find current scene in script.scenes
        // Warning: The scene object in `scenes` prop comes from session plan logic, 
        // we need to match it with `script.scenes`.
        // We use Scene Title + Order Index to match safely or ID if available
        const scriptSceneIdx = script.scenes.findIndex(s => s.title === currentScene.title);

        if (scriptSceneIdx === -1) return [];

        const startLine = script.scenes[scriptSceneIdx].index;
        const nextScene = script.scenes[scriptSceneIdx + 1];
        const endLine = nextScene ? nextScene.index : script.lines.length;

        // Return lines with their ABSOLUTE index in the script (for injection)
        return script.lines.slice(startLine, endLine).map((line, relativeIdx) => ({
            ...line,
            absoluteIndex: startLine + relativeIdx
        }));

    }, [script, currentScene]);

    // Note Injection State
    const [noteTarget, setNoteTarget] = useState<{ type: 'scene' | 'line', lineIndex?: number } | null>(null);
    const [noteText, setNoteText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openPopover, setOpenPopover] = useState(false);

    // Find the global index of the current scene for injection
    const globalSceneIndex = useMemo(() => {
        if (!script || !currentScene) return -1;
        return script.scenes.findIndex(s => s.title === currentScene.title);
    }, [script, currentScene]);


    const handleInjectNote = async () => {
        if (!noteTarget || !play || globalSceneIndex === -1 || !noteText.trim()) return;

        setIsSubmitting(true);
        try {
            await injectDirectorNote(
                play.id,
                globalSceneIndex,
                noteText,
                noteTarget.type === 'line' ? noteTarget.lineIndex : undefined
            );
            setNoteText("");
            setOpenPopover(false);
            setNoteTarget(null);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'ajout de la note");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!currentScene || !script) return <div className="p-8 text-center text-muted-foreground">Sélectionnez une scène...</div>;

    return (
        <div className="flex flex-col h-full bg-card/50 border-r border-border/50 relative">

            {/* Header / Global Scene Note */}
            <div className="p-6 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
                            {currentScene.title}
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium">
                            {play.title}
                        </p>
                    </div>

                    {!isReadOnly && (
                        <Popover open={openPopover && noteTarget?.type === 'scene'} onOpenChange={(open: boolean) => {
                            if (open) {
                                setNoteTarget({ type: 'scene' });
                                setOpenPopover(true);
                            } else {
                                setOpenPopover(false);
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <Button size="sm" variant="outline" className="text-primary hover:bg-primary/10 border-primary/20 gap-2">
                                    <NotebookPen className="w-4 h-4" />
                                    Note Scène
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end">
                                <div className="space-y-3">
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        <NotebookPen className="w-4 h-4 text-primary" />
                                        Indication Globale
                                    </h4>
                                    <Textarea
                                        placeholder="Ex: Rythme plus soutenu, tension qui monte..."
                                        className="min-h-[100px]"
                                        value={noteText}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                                    />
                                    <Button className="w-full" onClick={handleInjectNote} disabled={isSubmitting}>
                                        {isSubmitting ? "Ajout..." : "Ajouter au script"}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

            {/* Script Viewer */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
                {sceneLines.map((line, idx) => {
                    const isDirection = line.type === 'stage_direction';
                    const isDirectorNote = isDirection && line.character === 'Metteur en Scène';

                    return (
                        <div key={`${line.id}-${idx}`} className="group relative">

                            {/* Hover Interaction: Insert Before */}
                            {!isReadOnly && !isDirection && (
                                <div className="absolute -top-3 left-0 right-0 h-6 opacity-0 group-hover:opacity-100 flex items-center justify-center z-10 transition-opacity">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white hover:scale-110 transition-all text-[10px] uppercase font-bold"
                                                onClick={() => {
                                                    setNoteTarget({ type: 'line', lineIndex: line.absoluteIndex });
                                                    setNoteText("");
                                                }}
                                            >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Ajouter une note
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-72 p-0 overflow-hidden rounded-xl bg-popover border-border shadow-2xl">
                                            <div className="bg-primary/5 p-3 border-b border-border/50">
                                                <span className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                    <Quote className="w-3 h-3" />
                                                    Note sur réplique
                                                </span>
                                            </div>
                                            <div className="p-3 space-y-3">
                                                <Textarea
                                                    placeholder="Instruction avant cette réplique..."
                                                    className="border-0 bg-transparent focus-visible:ring-0 resize-none p-0 min-h-[60px] text-sm"
                                                    value={noteText}
                                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="flex justify-end">
                                                    <Button size="sm" onClick={handleInjectNote} disabled={isSubmitting}>
                                                        Ajouter
                                                    </Button>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}

                            {/* Line Content */}
                            <div className={cn(
                                "relative py-1 px-4 rounded-lg transition-all",
                                isDirectorNote ? "bg-purple-500/10 border-l-4 border-purple-500 my-4" :
                                    isDirection ? "italic text-muted-foreground pl-8" :
                                        "hover:bg-muted/30"
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
                                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                                {line.character}
                                            </p>
                                        )}
                                        <p className={cn(
                                            "leading-relaxed font-serif text-lg",
                                            line.type === 'dialogue' ? "text-foreground" : "text-muted-foreground text-sm"
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
