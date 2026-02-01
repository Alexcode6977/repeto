'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Send, X, StickyNote, Mic, Lightbulb, Hammer, Sun, Volume2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { injectDirectorNote } from '@/lib/actions/director';
import { AnnotationContext } from './annotator-client';

interface MobileAnnotatorSheetProps {
    isOpen: boolean;
    onClose: () => void;
    actorsInScene: any[];
    playId: string;
    globalSceneIndex: number;
    context: AnnotationContext;
}

const TECH_ROLES = [
    { id: 'tech-sound', name: 'Régie Son', icon: Volume2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { id: 'tech-light', name: 'Régie Lumière', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { id: 'tech-spot', name: 'Poursuite', icon: Sun, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { id: 'tech-set', name: 'Décor / Plateau', icon: Hammer, color: 'text-stone-400', bg: 'bg-stone-500/10 border-stone-500/20' },
];

export function MobileAnnotatorSheet({ isOpen, onClose, actorsInScene, playId, globalSceneIndex, context }: MobileAnnotatorSheetProps) {
    const [selectedTarget, setSelectedTarget] = useState<{ id: string, name: string, type: 'actor' | 'tech', characterName?: string } | null>(null);
    const [noteText, setNoteText] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Reset state when opening/closing
    useEffect(() => {
        if (!isOpen) {
            // unexpected close
            setTimeout(() => {
                setSelectedTarget(null);
                setNoteText("");
            }, 300);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!noteText.trim() || !selectedTarget) return;
        setIsSending(true);

        try {
            let authorName = "Metteur en Scène";
            if (selectedTarget.type === 'tech') {
                authorName = selectedTarget.name;
            } else if (selectedTarget.characterName) {
                authorName = selectedTarget.characterName;
            }

            const targetLineIndex = context.type === 'line' ? context.lineIndex : undefined;

            await injectDirectorNote(
                playId,
                globalSceneIndex,
                noteText,
                targetLineIndex,
                authorName
            );

            setNoteText("");
            setSelectedTarget(null);
            onClose(); // Close sheet after send
        } catch (e) {
            console.error(e);
            alert("Erreur d'envoi");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t border-white/10 bg-[#0a0a0a] p-0 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/50 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-3">
                        {selectedTarget && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 -ml-2 rounded-full" onClick={() => setSelectedTarget(null)}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        )}
                        <div>
                            <SheetTitle className="text-base font-black uppercase tracking-wide">
                                {selectedTarget ? (
                                    <span className="flex items-center gap-2">
                                        <StickyNote className="w-4 h-4 text-amber-500" />
                                        Note : {selectedTarget.type === 'tech' ? selectedTarget.name : selectedTarget.characterName}
                                    </span>
                                ) : (
                                    "Ajouter une note"
                                )}
                            </SheetTitle>
                            <SheetDescription className="text-xs truncate max-w-[280px]">
                                {context.type === 'scene'
                                    ? "Au début de la scène"
                                    : context.type === 'line'
                                        ? `Avant la réplique "${context.lineContent?.substring(0, 20)}..."`
                                        : "Entre les répliques"
                                }
                            </SheetDescription>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 relative">
                    <AnimatePresence mode="wait">
                        {!selectedTarget ? (
                            <motion.div
                                key="grid"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 pb-10"
                            >
                                {/* Actors Grid */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 px-1">
                                        Personnages
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {actorsInScene.map((actor) => (
                                            <div
                                                key={actor.id}
                                                onClick={() => setSelectedTarget({ id: actor.id, name: actor.name, characterName: actor.characterName, type: 'actor' })}
                                                className="cursor-pointer bg-white/5 hover:bg-white/10 active:scale-95 transition-all border border-white/5 rounded-2xl p-3 flex items-center gap-3"
                                            >
                                                <Avatar className="w-10 h-10 border border-white/10">
                                                    <AvatarImage src={actor.avatar} />
                                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-[10px]">
                                                        {actor.characterName.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate text-white">
                                                        {actor.characterName}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        {actor.name}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {actorsInScene.length === 0 && (
                                            <div className="col-span-full py-4 text-center text-xs text-muted-foreground italic">
                                                Aucun personnage
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tech Grid */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 px-1">
                                        Régie & Technique
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {TECH_ROLES.map((role) => (
                                            <div
                                                key={role.id}
                                                onClick={() => setSelectedTarget({ id: role.id, name: role.name, type: 'tech' })}
                                                className={cn(
                                                    "cursor-pointer rounded-2xl p-3 flex flex-col items-center justify-center gap-2 transition-all border active:scale-95",
                                                    role.bg
                                                )}
                                            >
                                                <role.icon className={cn("w-5 h-5", role.color)} />
                                                <span className={cn("text-[10px] font-black uppercase tracking-wider text-center", role.color)}>
                                                    {role.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="input"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="h-full flex flex-col"
                            >
                                <textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder={
                                        selectedTarget.type === 'tech'
                                            ? `Instruction pour ${selectedTarget.name}...`
                                            : `Note de jeu pour ${selectedTarget.characterName}...`
                                    }
                                    className="w-full flex-1 bg-white/5 border border-white/10 rounded-2xl text-base p-4 resize-none focus:outline-none focus:border-amber-500/50 text-white placeholder:text-gray-500 mb-4"
                                    autoFocus
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={isSending || !noteText.trim()}
                                    className="w-full rounded-2xl h-12 text-xs font-black uppercase tracking-[0.2em] shadow-lg bg-amber-500 hover:bg-amber-600 text-black shrink-0"
                                >
                                    {isSending ? "Envoi..." : "Ajouter la note"}
                                    <Send className="w-4 h-4 ml-2" />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </SheetContent>
        </Sheet>
    );
}
