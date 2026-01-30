'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send, X, StickyNote, Mic, Lightbulb, Hammer, Sun, Volume2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { injectDirectorNote } from '@/lib/actions/director';
import { AnnotationContext } from './annotator-client';

interface AnnotatorGridProps {
    actorsInScene: any[]; // Actors present in the scene
    playCharacters: any[]; // All play characters
    playId: string;
    currentScene: any;
    globalSceneIndex: number; // For injecting director notes
    context: AnnotationContext;
}

const TECH_ROLES = [
    { id: 'tech-sound', name: 'Régie Son', icon: Volume2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { id: 'tech-light', name: 'Régie Lumière', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { id: 'tech-spot', name: 'Poursuite', icon: Sun, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { id: 'tech-set', name: 'Décor / Plateau', icon: Hammer, color: 'text-stone-400', bg: 'bg-stone-500/10 border-stone-500/20' },
];

export function AnnotatorGrid({ actorsInScene, playCharacters, playId, currentScene, globalSceneIndex, context }: AnnotatorGridProps) {
    const [selectedTarget, setSelectedTarget] = useState<{ id: string, name: string, type: 'actor' | 'tech', characterName?: string } | null>(null);
    const [noteText, setNoteText] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!noteText.trim() || !selectedTarget) return;
        setIsSending(true);

        try {
            // Determine Author Name
            let authorName = "Metteur en Scène";
            if (selectedTarget.type === 'tech') {
                authorName = selectedTarget.name; // e.g. "Régie Son"
            } else if (selectedTarget.characterName) {
                authorName = selectedTarget.characterName; // e.g. "César"
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
            // We do NOT reset context here, user might want to add another note to same spot
        } catch (e) {
            console.error(e);
            alert("Erreur d'envoi");
            setIsSending(false);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar h-full bg-background/50 pb-32">

            {/* 1. Context Indicator (Sticky) */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 mb-4 border-b border-white/5">
                <div className="flex items-center justify-center gap-2 text-xs uppercase font-black tracking-widest text-muted-foreground">
                    <span>
                        {context.type === 'scene' ? "Cible : Scène entière" : "Cible : Réplique"}
                    </span>
                    {context.type === 'line' && <StickyNote className="w-3 h-3 text-amber-500" />}
                </div>
                {context.type === 'line' && (
                    <p className="text-center text-[10px] text-muted-foreground/60 italic mt-1 line-clamp-1 px-4">
                        "{context.lineContent}"
                    </p>
                )}
            </div>


            {/* 2. Actors Grid */}
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 mb-4 px-2">
                Personnages Présents
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 mb-8">
                {actorsInScene.map((actor) => (
                    <motion.div
                        key={actor.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTarget({ id: actor.id, name: actor.name, characterName: actor.characterName, type: 'actor' })}
                        className="cursor-pointer bg-card/40 hover:bg-primary/10 border border-white/5 hover:border-primary/30 rounded-2xl p-3 flex flex-col items-center gap-2 transition-all group"
                    >
                        <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                            <AvatarImage src={actor.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-xs">
                                {actor.characterName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <span className="block text-xs font-black text-foreground leading-tight group-hover:text-primary transition-colors">
                                {actor.characterName}
                            </span>
                            <span className="block text-[10px] text-muted-foreground uppercase tracking-wide truncate max-w-[100px]">
                                {actor.name}
                            </span>
                        </div>
                    </motion.div>
                ))}
                {actorsInScene.length === 0 && (
                    <div className="col-span-full py-10 text-center text-muted-foreground italic text-xs">
                        Aucun personnage détecté dans cette scène.
                    </div>
                )}
            </div>

            {/* 3. Tech Roles */}
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 mb-4 px-2">
                Régie & Technique
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {TECH_ROLES.map((role) => (
                    <motion.div
                        key={role.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTarget({ id: role.id, name: role.name, type: 'tech' })}
                        className={cn(
                            "cursor-pointer rounded-2xl p-4 flex flex-col items-center gap-2 transition-all border",
                            role.bg, "hover:opacity-80"
                        )}
                    >
                        <role.icon className={cn("w-6 h-6", role.color)} />
                        <span className={cn("text-[10px] font-black uppercase tracking-wider text-center", role.color)}>
                            {role.name}
                        </span>
                    </motion.div>
                ))}
            </div>


            {/* DRAWER FOR INPUT */}
            <AnimatePresence>
                {selectedTarget && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTarget(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 bg-[#15151a] border-t border-white/10 rounded-t-[2rem] p-6 pb-8 shadow-2xl max-w-2xl mx-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                                        <StickyNote className="w-5 h-5 text-amber-500" />
                                        Note pour {selectedTarget.type === 'tech' ? selectedTarget.name : selectedTarget.characterName}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {context.type === 'scene'
                                            ? "S'appliquera au début de la scène"
                                            : context.type === 'line' ? `S'appliquera avant la réplique de ${context.character}` : "Position personnalisée"}
                                    </p>
                                </div>
                                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setSelectedTarget(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder={
                                        selectedTarget.type === 'tech'
                                            ? `Instruction ${selectedTarget.name} (ex: Black out, Musique off...)`
                                            : `Indication de jeu pour ${selectedTarget.characterName}...`
                                    }
                                    className="w-full min-h-[140px] bg-black/20 border border-white/10 rounded-2xl text-base p-4 resize-none focus:outline-none focus:border-amber-500/50 text-white placeholder:text-gray-600"
                                    autoFocus
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={isSending || !noteText.trim()}
                                    className="w-full rounded-2xl h-14 text-sm font-black uppercase tracking-[0.2em] shadow-lg bg-amber-500 hover:bg-amber-600 text-black"
                                >
                                    {isSending ? "Ajout..." : "Ajouter au script"}
                                    <Send className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
}
