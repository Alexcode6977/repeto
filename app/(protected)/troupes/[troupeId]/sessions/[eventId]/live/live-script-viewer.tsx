'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ParsedScript } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, NotebookPen, Quote, Mic, MicOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { saveRawNote } from '@/lib/actions/session';
import { useKeyboardInset } from '@/lib/hooks/use-keyboard-inset';

interface LiveScriptViewerProps {
    sessionData: any;
    currentSceneIdx: number;
    scenes: any[];
    isReadOnly?: boolean;
    highlightedLineIndex?: number;
}

export function LiveScriptViewer({ sessionData, currentSceneIdx, scenes, isReadOnly, highlightedLineIndex }: LiveScriptViewerProps) {
    useKeyboardInset(true);

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

    // Line refs for scrolling
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Scroll to highlighted line when it changes
    useEffect(() => {
        if (highlightedLineIndex !== undefined) {
            const element = lineRefs.current.get(highlightedLineIndex);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add temporary highlight animation
                element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
                }, 2000);
            }
        }
    }, [highlightedLineIndex]);

    // Dictation State
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'fr-FR';

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setNoteText(prev => (prev ? prev + ' ' : '') + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleDictation = () => {
        if (!recognitionRef.current) {
            alert("Votre navigateur ne supporte pas la dictée vocale.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };


    // Find the global index of the current scene for injection
    const globalSceneIndex = useMemo(() => {
        if (!script || !currentScene) return -1;
        return script.scenes.findIndex(s => s.title === currentScene.title);
    }, [script, currentScene]);


    const handleInjectNote = async () => {
        if (!noteTarget || !play || globalSceneIndex === -1 || !noteText.trim()) return;

        setIsSubmitting(true);
        try {
            // Find context if line target
            let context = undefined;
            if (noteTarget.type === 'line' && noteTarget.lineIndex !== undefined) {
                const line = sceneLines.find(l => l.absoluteIndex === noteTarget.lineIndex);
                if (line) {
                    context = {
                        lineText: line.text,
                        characterName: line.character
                    };
                }
            }

            await saveRawNote(
                sessionData.id,
                play.id,
                globalSceneIndex,
                noteText,
                noteTarget.type === 'line' ? noteTarget.lineIndex : undefined,
                context
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
                {!isReadOnly ? (
                    <Popover open={openPopover && noteTarget?.type === 'scene'} onOpenChange={(open: boolean) => {
                        if (open) {
                            setNoteTarget({ type: 'scene' });
                            setOpenPopover(true);
                        } else {
                            setOpenPopover(false);
                            if (isListening) recognitionRef.current?.stop();
                        }
                    }}>
                        <PopoverTrigger asChild>
                            <div className="cursor-pointer group hover:bg-muted/10 -m-2 p-2 rounded-lg transition-colors">
                                <h2 className="text-xl font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                    {currentScene.title}
                                    <NotebookPen className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                </h2>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {play.title}
                                </p>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4 mobile-note-sheet max-md:border-t max-md:border-border/40 max-md:bg-background/95 max-md:shadow-[0_-20px_60px_rgba(0,0,0,0.55)] max-md:p-5" align="start">
                            <div className="space-y-3 keyboard-inset">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        <NotebookPen className="w-4 h-4 text-primary" />
                                        Note Scène
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("h-6 w-6 rounded-full", isListening && "text-red-500 bg-red-100 animate-pulse")}
                                        onClick={toggleDictation}
                                    >
                                        {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                                    </Button>
                                </div>
                                <Textarea
                                    placeholder="Note rapide..."
                                    className="min-h-[100px]"
                                    value={noteText}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                                />
                                <Button className="w-full" onClick={handleInjectNote} disabled={isSubmitting}>
                                    {isSubmitting ? "Ajout..." : "Enregistrer Note"}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                ) : (
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
                            {currentScene.title}
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium">
                            {play.title}
                        </p>
                    </div>
                )}
            </div>

            {/* Script Viewer */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
                {sceneLines.map((line, idx) => {
                    const isDirection = line.type === 'stage_direction';
                    const isDirectorNote = isDirection && line.character === 'Metteur en Scène';

                    return (
                        <Popover
                            key={`${line.id}-${idx}`}
                            open={openPopover && noteTarget?.type === 'line' && noteTarget?.lineIndex === line.absoluteIndex}
                            onOpenChange={(open) => {
                                if (open) {
                                    setNoteTarget({ type: 'line', lineIndex: line.absoluteIndex });
                                    setNoteText("");
                                    setOpenPopover(true);
                                } else {
                                    setOpenPopover(false);
                                    if (isListening) recognitionRef.current?.stop();
                                }
                            }}
                        >
                            <PopoverTrigger asChild>
                                <div
                                    ref={(el) => {
                                        if (el) lineRefs.current.set(line.absoluteIndex, el);
                                    }}
                                    className={cn(
                                        "relative py-2 px-4 rounded-lg transition-all cursor-pointer group",
                                        isDirectorNote ? "bg-purple-500/10 border-l-4 border-purple-500 my-4" :
                                            isDirection ? "italic text-muted-foreground pl-8 opacity-80" :
                                                "hover:bg-primary/5 active:bg-primary/10 border border-transparent hover:border-primary/10"
                                    )}
                                >
                                    {isDirectorNote ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                                                Note
                                            </span>
                                            <p className="font-medium text-purple-100 text-sm">
                                                {line.text.replace('[NOTE] ', '')}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {line.type === 'dialogue' && (
                                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">
                                                    {line.character}
                                                </p>
                                            )}
                                            <p className={cn(
                                                "leading-relaxed font-serif text-lg selection:bg-primary/20",
                                                line.type === 'dialogue' ? "text-foreground group-hover:text-foreground/90" : "text-muted-foreground text-sm"
                                            )}>
                                                {line.text}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </PopoverTrigger>

                            {!isReadOnly && (
                                <PopoverContent className="w-80 p-0 overflow-hidden rounded-xl bg-popover border-border shadow-2xl mobile-note-sheet max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-t max-md:border-border/40 max-md:bg-background/95 max-md:shadow-[0_-20px_60px_rgba(0,0,0,0.55)]" side="right" align="start">
                                    <div className="bg-primary/5 p-3 border-b border-border/50 flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Quote className="w-3 h-3" />
                                            Note sur Réplique
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-6 w-6 rounded-full", isListening && "text-red-500 bg-red-100 animate-pulse")}
                                            onClick={toggleDictation}
                                        >
                                            {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                                        </Button>
                                    </div>
                                    <div className="p-3 space-y-3 keyboard-inset">
                                        <div className="bg-muted/50 rounded-lg p-2 text-xs border border-border/50 max-h-[100px] overflow-y-auto">
                                            {line.character && (
                                                <span className="font-bold uppercase tracking-wider text-primary block mb-1">
                                                    {line.character}
                                                </span>
                                            )}
                                            <p className="italic text-muted-foreground font-serif leading-snug">
                                                "{line.text}"
                                            </p>
                                        </div>
                                        <Textarea
                                            placeholder="Note rapide..."
                                            className="border-0 bg-transparent focus-visible:ring-0 resize-none p-0 min-h-[80px] text-sm"
                                            value={noteText}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" onClick={handleInjectNote} disabled={isSubmitting}>
                                                {isSubmitting ? "..." : "Enregistrer"}
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            )}
                        </Popover>
                    );
                })}

                {/* Space at bottom */}
                <div className="h-40 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground italic">Fin de la scène</p>
                </div>
            </div>
        </div>
    );
}
