'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ParsedScript } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotebookPen, Quote, Mic, MicOff, X, Send } from 'lucide-react';
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

    const play = useMemo(() => {
        if (!currentScene) return null;
        return sessionData.plays?.find((p: any) => p.id === currentScene.playId);
    }, [currentScene, sessionData.plays]);

    const script = play?.script_content as ParsedScript;

    const sceneLines = useMemo(() => {
        if (!script || !currentScene) return [];
        const scriptSceneIdx = script.scenes.findIndex(s => s.title === currentScene.title);
        if (scriptSceneIdx === -1) return [];

        const startLine = script.scenes[scriptSceneIdx].index;
        const nextScene = script.scenes[scriptSceneIdx + 1];
        const endLine = nextScene ? nextScene.index : script.lines.length;

        return script.lines.slice(startLine, endLine).map((line, relativeIdx) => ({
            ...line,
            absoluteIndex: startLine + relativeIdx
        }));
    }, [script, currentScene]);

    // Note state
    const [noteTarget, setNoteTarget] = useState<{ type: 'scene' | 'line', lineIndex?: number, character?: string, text?: string } | null>(null);
    const [noteText, setNoteText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Desktop popover state
    const [openPopover, setOpenPopover] = useState(false);

    // Mobile modal state
    const [showMobileModal, setShowMobileModal] = useState(false);

    // Line refs for scrolling
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    useEffect(() => {
        if (highlightedLineIndex !== undefined) {
            const element = lineRefs.current.get(highlightedLineIndex);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
                }, 2000);
            }
        }
    }, [highlightedLineIndex]);

    // Dictation
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

            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
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

    const globalSceneIndex = useMemo(() => {
        if (!script || !currentScene) return -1;
        return script.scenes.findIndex(s => s.title === currentScene.title);
    }, [script, currentScene]);

    const handleInjectNote = async () => {
        if (!noteTarget || !play || globalSceneIndex === -1 || !noteText.trim()) return;

        setIsSubmitting(true);
        try {
            let context = undefined;
            if (noteTarget.type === 'line' && noteTarget.lineIndex !== undefined) {
                const line = sceneLines.find(l => l.absoluteIndex === noteTarget.lineIndex);
                if (line) {
                    context = { lineText: line.text, characterName: line.character };
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
            setShowMobileModal(false);
            setNoteTarget(null);
            if (isListening) recognitionRef.current?.stop();
        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'ajout de la note");
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeMobileModal = () => {
        setShowMobileModal(false);
        setNoteTarget(null);
        setNoteText("");
        if (isListening) recognitionRef.current?.stop();
    };

    // Detect mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const openNoteFor = (type: 'scene' | 'line', lineIndex?: number, character?: string, text?: string) => {
        if (isReadOnly) return;
        const target = { type, lineIndex, character, text };
        setNoteTarget(target);
        setNoteText("");

        if (isMobile) {
            setShowMobileModal(true);
        } else {
            setOpenPopover(true);
        }
    };

    if (!currentScene || !script) return <div className="p-8 text-center text-muted-foreground">Sélectionnez une scène...</div>;

    return (
        <div className="flex flex-col h-full bg-card/50 border-r border-border/50 relative">

            {/* Header / Scene Title */}
            <div className="p-4 md:p-6 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-20">
                {!isReadOnly ? (
                    <>
                        {/* Desktop: Popover on scene title */}
                        <div className="hidden md:block">
                            <Popover open={openPopover && noteTarget?.type === 'scene'} onOpenChange={(open) => {
                                if (open) {
                                    openNoteFor('scene');
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
                                        <p className="text-sm text-muted-foreground font-medium">{play.title}</p>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" align="start">
                                    <DesktopNoteForm
                                        label="Note Scène"
                                        noteText={noteText}
                                        setNoteText={setNoteText}
                                        isListening={isListening}
                                        toggleDictation={toggleDictation}
                                        handleSubmit={handleInjectNote}
                                        isSubmitting={isSubmitting}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Mobile: Simple click opens modal */}
                        <div
                            className="md:hidden cursor-pointer active:bg-muted/20 -m-2 p-2 rounded-lg transition-colors"
                            onClick={() => openNoteFor('scene')}
                        >
                            <h2 className="text-lg font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                                {currentScene.title}
                                <NotebookPen className="w-4 h-4 text-primary/50" />
                            </h2>
                            <p className="text-sm text-muted-foreground font-medium">{play.title}</p>
                        </div>
                    </>
                ) : (
                    <div>
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-foreground">{currentScene.title}</h2>
                        <p className="text-sm text-muted-foreground font-medium">{play.title}</p>
                    </div>
                )}
            </div>

            {/* Script Viewer */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-6">
                {sceneLines.map((line, idx) => {
                    const isDirection = line.type === 'stage_direction';
                    const isDirectorNote = isDirection && line.character === 'Metteur en Scène';

                    return (
                        <div key={`${line.id}-${idx}`}>
                            {/* Desktop: Popover */}
                            <div className="hidden md:block">
                                <Popover
                                    open={openPopover && noteTarget?.type === 'line' && noteTarget?.lineIndex === line.absoluteIndex}
                                    onOpenChange={(open) => {
                                        if (open) {
                                            openNoteFor('line', line.absoluteIndex, line.character, line.text);
                                        } else {
                                            setOpenPopover(false);
                                            if (isListening) recognitionRef.current?.stop();
                                        }
                                    }}
                                >
                                    <PopoverTrigger asChild>
                                        <ScriptLine line={line} isDirection={isDirection} isDirectorNote={isDirectorNote} lineRefs={lineRefs} />
                                    </PopoverTrigger>
                                    {!isReadOnly && !isDirectorNote && (
                                        <PopoverContent className="w-80 p-0 overflow-hidden rounded-xl" side="right" align="start">
                                            <div className="bg-primary/5 p-3 border-b border-border/50 flex justify-between items-center">
                                                <span className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                    <Quote className="w-3 h-3" /> Note sur Réplique
                                                </span>
                                                <Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-full", isListening && "text-red-500 bg-red-100 animate-pulse")} onClick={toggleDictation}>
                                                    {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                                                </Button>
                                            </div>
                                            <div className="p-3 space-y-3">
                                                <div className="bg-muted/50 rounded-lg p-2 text-xs border border-border/50 max-h-[100px] overflow-y-auto">
                                                    {line.character && <span className="font-bold uppercase tracking-wider text-primary block mb-1">{line.character}</span>}
                                                    <p className="italic text-muted-foreground font-serif leading-snug">"{line.text}"</p>
                                                </div>
                                                <Textarea placeholder="Note rapide..." className="border-0 bg-transparent focus-visible:ring-0 resize-none p-0 min-h-[80px] text-sm" value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus />
                                                <div className="flex justify-end">
                                                    <Button size="sm" onClick={handleInjectNote} disabled={isSubmitting}>{isSubmitting ? "..." : "Enregistrer"}</Button>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    )}
                                </Popover>
                            </div>

                            {/* Mobile: Click opens modal */}
                            <div className="md:hidden">
                                <ScriptLine
                                    line={line}
                                    isDirection={isDirection}
                                    isDirectorNote={isDirectorNote}
                                    lineRefs={lineRefs}
                                    onClick={!isReadOnly && !isDirectorNote ? () => openNoteFor('line', line.absoluteIndex, line.character, line.text) : undefined}
                                />
                            </div>
                        </div>
                    );
                })}

                <div className="h-20 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground italic">Fin de la scène</p>
                </div>
            </div>

            {/* MOBILE NOTE MODAL */}
            {showMobileModal && noteTarget && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center px-8 md:hidden" onClick={closeMobileModal}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
                    <div
                        className="relative w-full max-w-[300px] bg-card rounded-[1.75rem] shadow-2xl border border-border/30 overflow-hidden animate-in fade-in duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close */}
                        <button onClick={closeMobileModal} className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center z-10">
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>

                        {/* Context */}
                        <div className="px-5 pt-5 pb-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary mb-3">
                                {noteTarget.type === 'scene' ? 'Note de scène' : 'Note sur réplique'}
                            </p>

                            {noteTarget.type === 'line' && (
                                <div className="bg-muted/40 rounded-xl p-3 border border-border/40">
                                    {noteTarget.character && (
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">{noteTarget.character}</p>
                                    )}
                                    <p className="text-[13px] italic text-muted-foreground font-serif leading-snug line-clamp-3">
                                        &laquo; {noteTarget.text} &raquo;
                                    </p>
                                </div>
                            )}

                            {noteTarget.type === 'scene' && (
                                <p className="text-sm font-bold text-foreground">{currentScene.title}</p>
                            )}
                        </div>

                        {/* Input */}
                        <div className="px-5 pb-5 space-y-3">
                            <Textarea
                                placeholder="Votre indication..."
                                className="min-h-[120px] rounded-xl border-border/60 bg-background/80 text-sm resize-none focus-visible:ring-primary/50"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                autoFocus
                            />

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleDictation}
                                    className={cn(
                                        "rounded-full h-10 flex-shrink-0",
                                        isListening && "bg-red-500/10 border-red-500/40 text-red-500"
                                    )}
                                >
                                    {isListening ? <MicOff className="w-4 h-4 mr-1.5" /> : <Mic className="w-4 h-4 mr-1.5" />}
                                    {isListening ? "Stop" : "Dicter"}
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={handleInjectNote}
                                    disabled={isSubmitting || !noteText.trim()}
                                    className="rounded-full h-10 flex-1 font-bold"
                                >
                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                    {isSubmitting ? "..." : "Enregistrer"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Sub-components ---

function ScriptLine({ line, isDirection, isDirectorNote, lineRefs, onClick }: {
    line: any;
    isDirection: boolean;
    isDirectorNote: boolean;
    lineRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    onClick?: () => void;
}) {
    return (
        <div
            ref={(el) => { if (el) lineRefs.current.set(line.absoluteIndex, el); }}
            onClick={onClick}
            className={cn(
                "relative py-2 px-3 md:px-4 rounded-lg transition-all",
                isDirectorNote ? "bg-purple-500/10 border-l-4 border-purple-500 my-4" :
                    isDirection ? "italic text-muted-foreground pl-6 md:pl-8 opacity-80" :
                        onClick ? "cursor-pointer hover:bg-primary/5 active:bg-primary/10 border border-transparent hover:border-primary/10" :
                            "cursor-pointer group hover:bg-primary/5 active:bg-primary/10 border border-transparent hover:border-primary/10"
            )}
        >
            {isDirectorNote ? (
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Note</span>
                    <p className="font-medium text-purple-800 dark:text-purple-100 text-sm">{line.text.replace('[NOTE] ', '')}</p>
                </div>
            ) : (
                <>
                    {line.type === 'dialogue' && (
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">
                            {line.character}
                        </p>
                    )}
                    <p className={cn(
                        "leading-relaxed font-serif selection:bg-primary/20",
                        line.type === 'dialogue' ? "text-base md:text-lg text-foreground" : "text-muted-foreground text-sm"
                    )}>
                        {line.text}
                    </p>
                </>
            )}
        </div>
    );
}

function DesktopNoteForm({ label, noteText, setNoteText, isListening, toggleDictation, handleSubmit, isSubmitting }: {
    label: string;
    noteText: string;
    setNoteText: (v: string) => void;
    isListening: boolean;
    toggleDictation: () => void;
    handleSubmit: () => void;
    isSubmitting: boolean;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm flex items-center gap-2">
                    <NotebookPen className="w-4 h-4 text-primary" />
                    {label}
                </h4>
                <Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-full", isListening && "text-red-500 bg-red-100 animate-pulse")} onClick={toggleDictation}>
                    {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                </Button>
            </div>
            <Textarea placeholder="Note rapide..." className="min-h-[100px]" value={noteText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)} />
            <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "Ajout..." : "Enregistrer Note"}</Button>
        </div>
    );
}
