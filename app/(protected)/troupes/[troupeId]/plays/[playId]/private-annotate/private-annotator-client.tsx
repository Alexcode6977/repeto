'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParsedScript, AnnotationContext } from '@/lib/types';
import { InteractiveScriptViewer } from '../annotate/interactive-script-viewer';
import { upsertPrivateNote } from '@/lib/actions/private-notes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PrivateAnnotatorClientProps {
    play: any;
    troupeId: string;
    script: ParsedScript;
    privateNotes: any[];
}

export function PrivateAnnotatorClient({ play, troupeId, script, privateNotes }: PrivateAnnotatorClientProps) {
    const router = useRouter();
    const [viewSceneIdx, setViewSceneIdx] = useState(0);
    const [context, setContext] = useState<AnnotationContext>({ type: 'none' });

    // Local state for note input
    const [noteText, setNoteText] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const scenes = script.scenes || [];

    // Load existing note when context changes
    useEffect(() => {
        if (context.type === 'none') {
            setNoteText("");
            return;
        }

        const sceneIdx = context.type === 'scene' ? context.index : (context.type === 'line' ? context.sceneIndex : viewSceneIdx);
        const lineIdx = context.type === 'line' ? context.lineIndex : undefined;

        // Find existing note
        const existing = privateNotes.find(n =>
            n.scene_index === sceneIdx &&
            ((lineIdx === undefined && n.line_index === null) || n.line_index === lineIdx)
        );

        setNoteText(existing ? existing.text : "");
    }, [context, privateNotes, viewSceneIdx]);

    const handleSave = async () => {
        if (context.type === 'none') return;
        setIsSaving(true);
        try {
            const sceneIdx = context.type === 'scene' ? context.index : (context.type === 'line' ? context.sceneIndex : viewSceneIdx);
            const lineIdx = context.type === 'line' ? context.lineIndex : undefined;

            await upsertPrivateNote(play.id, sceneIdx, noteText, lineIdx);
            toast.success("Note enregistrée");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden relative">
            {/* TOP BAR */}
            <div className="h-14 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 z-20">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
                            Note Personnelles
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-wider">Privé</span>
                        </h1>
                        <p className="text-[10px] text-muted-foreground">{play.title}</p>
                    </div>
                </div>

                {/* SCENE SELECTOR */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2 md:inline hidden">Afficher :</span>
                    <Select value={viewSceneIdx.toString()} onValueChange={(val) => setViewSceneIdx(parseInt(val))}>
                        <SelectTrigger className="w-[180px] md:w-[240px] h-9 bg-muted/50 border-white/5 font-bold text-xs ring-offset-background focus:ring-blue-500/20">
                            <SelectValue placeholder="Sélectionner une scène" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#15151a] border-white/10">
                            {scenes.map((scene: any, idx: number) => (
                                <SelectItem key={`select-${idx}`} value={idx.toString()} className="text-xs font-bold focus:bg-blue-500 focus:text-white">
                                    {idx + 1}. {scene.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* LEFT: SCRIPT (2/3) */}
                <div className="flex-[2] min-w-0 border-r border-border/10 bg-black/20 overflow-hidden relative">
                    <InteractiveScriptViewer
                        script={script}
                        currentSceneIdx={viewSceneIdx}
                        context={context}
                        setContext={setContext}
                        privateNotes={privateNotes} // Pass private notes to viewer
                    />
                </div>

                {/* RIGHT: EDITOR PANEL (1/3) */}
                <div className="flex-[1] min-w-[300px] bg-background overflow-hidden h-full flex flex-col border-l border-white/5">
                    {context.type === 'none' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-50">
                            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                                <StickyNote className="w-8 h-8 text-blue-400/50" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Aucune sélection</h3>
                                <p className="text-xs text-muted-foreground max-w-[200px]">
                                    Cliquez sur une scène ou une réplique pour prendre une note.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 bg-blue-500/5 shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
                                    <StickyNote className="w-4 h-4" />
                                    {context.type === 'scene' ? "Note de Scène" : "Note sur Réplique"}
                                </span>
                                {context.type === 'line' && (
                                    <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2 border-l-2 border-white/10 pl-3">
                                        "{context.lineContent}"
                                    </p>
                                )}
                            </div>

                            {/* Input Block (Top) */}
                            <div className="p-4 space-y-3 border-b border-white/5 bg-black/20 shrink-0">
                                <textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Écrivez votre note personnelle ici..."
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl text-sm p-3 resize-none focus:outline-none focus:border-blue-500/50 text-white placeholder:text-gray-600 custom-scrollbar"
                                    autoFocus
                                />
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wider uppercase text-xs h-10 rounded-xl shadow-lg"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Enregistrer
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Remaining Space (Empty) */}
                            <div className="flex-1 bg-background/50">
                                {/* Could list previous versions or history here later */}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
