'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send, StickyNote, Lightbulb, Hammer, Sun, Volume2, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { injectDirectorNote } from '@/lib/actions/director';
import { AnnotationContext } from '@/lib/types';

interface AnnotatorGridProps {
    actorsInScene: any[]; // Actors present in the scene
    playId: string;
    currentScene: any;
    context: AnnotationContext;
}

const TECH_ROLES = [
    { id: 'tech-sound', name: 'Régie Son', icon: Volume2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { id: 'tech-light', name: 'Régie Lumière', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { id: 'tech-spot', name: 'Poursuite', icon: Sun, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { id: 'tech-set', name: 'Décor / Plateau', icon: Hammer, color: 'text-stone-400', bg: 'bg-stone-500/10 border-stone-500/20' },
];

export function AnnotatorGrid({ actorsInScene, playId, context }: AnnotatorGridProps) {
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]); // Array of IDs
    const [selectedTargetType, setSelectedTargetType] = useState<'actor' | 'tech' | null>(null);
    const [noteText, setNoteText] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Reset targets when context changes
    useEffect(() => {
        setSelectedTargets([]);
        setSelectedTargetType(null);
        setNoteText("");
    }, [context]);

    const toggleTarget = (id: string, type: 'actor' | 'tech') => {
        if (selectedTargetType && selectedTargetType !== type && selectedTargets.length > 0) return;

        setSelectedTargets(prev => {
            const isAlreadySelected = prev.includes(id);
            const next = isAlreadySelected ? prev.filter(t => t !== id) : [...prev, id];

            if (next.length === 0) {
                setSelectedTargetType(null);
            } else {
                setSelectedTargetType(type);
            }
            return next;
        });
    };

    const handleSend = async () => {
        if (!noteText.trim() || context.type === 'none' || !selectedTargetType) return;
        setIsSending(true);

        try {
            // Map IDs back to Names for injection
            const targetNames = selectedTargets.map(id => {
                const actor = actorsInScene.find(a => a.id === id);
                if (actor) return actor.characterName;
                const tech = TECH_ROLES.find(t => t.id === id);
                if (tech) return tech.name;
                return id;
            });

            const targetLineIndex = context.type === 'line' ? context.lineIndex : undefined;
            const sceneIndex = context.type === 'line' ? context.sceneIndex : (context.type === 'scene' ? context.index : 0);

            await injectDirectorNote(
                playId,
                sceneIndex,
                noteText,
                targetLineIndex,
                targetNames,
                selectedTargetType === 'tech'
            );

            setNoteText("");
            setSelectedTargets([]);
            setSelectedTargetType(null);
        } catch (e) {
            console.error(e);
            alert("Erreur d'envoi");
        } finally {
            setIsSending(false);
        }
    };

    if (context.type === 'none') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Aucune sélection</h3>
                    <p className="text-xs text-muted-foreground max-w-[200px]">
                        Cliquez sur le titre de la scène ou sur une réplique pour ajouter une indication de jeu.
                    </p>
                </div>
            </div>
        );
    }

    const isActorsBlocked = selectedTargetType === 'tech' && selectedTargets.length > 0;
    const isTechBlocked = selectedTargetType === 'actor' && selectedTargets.length > 0;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">

            {/* 1. Header Area (Static) */}
            <div className="p-4 border-b border-white/5 bg-black/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                        {context.type === 'scene' ? "Note de Scène" : "Note de Réplique"}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                    <Users className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-500">{selectedTargets.length}</span>
                </div>
            </div>

            {/* 2. Input Area (Now at the top) */}
            <div className="p-4 border-b border-white/5 bg-black/20 space-y-3 shrink-0">
                <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={selectedTargetType === 'tech' ? "Instruction technique..." : "Indication de jeu..."}
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl text-sm p-3 resize-none focus:outline-none focus:border-amber-500/50 text-white placeholder:text-gray-600 custom-scrollbar"
                />
                <Button
                    onClick={handleSend}
                    disabled={isSending || !noteText.trim() || selectedTargets.length === 0}
                    className="w-full rounded-xl h-12 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg bg-amber-500 hover:bg-amber-600 text-black transition-all active:scale-98 disabled:opacity-30"
                >
                    {isSending ? "Enregistrement..." : "Enregistrer l'indication"}
                    <Send className="w-4 h-4 ml-2" />
                </Button>
            </div>

            {/* 3. Scrollable Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-10">

                {/* Actors Section */}
                <div className={cn("space-y-3 transition-opacity duration-200", isActorsBlocked && "opacity-20 pointer-events-none")}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                        Personnages Concernés
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {actorsInScene.map((actor) => {
                            const isSelected = selectedTargets.includes(actor.id);
                            return (
                                <div
                                    key={actor.id}
                                    onClick={() => toggleTarget(actor.id, 'actor')}
                                    className={cn(
                                        "cursor-pointer group flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200",
                                        isSelected
                                            ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20"
                                            : "bg-muted/30 border-white/5 hover:border-white/10 hover:bg-muted/50"
                                    )}
                                >
                                    <Avatar className={cn(
                                        "w-10 h-10 border transition-transform duration-200",
                                        isSelected ? "border-amber-500 scale-110" : "border-white/10"
                                    )}>
                                        <AvatarImage src={actor.avatar} />
                                        <AvatarFallback className={cn(
                                            "font-black text-[10px] text-white",
                                            isSelected ? "bg-amber-500 text-black" : "bg-gradient-to-br from-indigo-500 to-purple-500"
                                        )}>
                                            {actor.characterName.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-center">
                                        <p className={cn(
                                            "text-[10px] font-bold truncate max-w-[100px] transition-colors",
                                            isSelected ? "text-amber-500" : "text-foreground/90"
                                        )}>
                                            {actor.characterName}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        {actorsInScene.length === 0 && (
                            <div className="col-span-full py-4 text-center text-[10px] text-muted-foreground italic bg-white/5 rounded-xl border border-dashed border-white/10">
                                Aucun personnage présent
                            </div>
                        )}
                    </div>
                </div>

                {/* Tech Section */}
                <div className={cn("space-y-3 transition-opacity duration-200", isTechBlocked && "opacity-20 pointer-events-none")}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                        Régie & Technique
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {TECH_ROLES.map((role) => {
                            const isSelected = selectedTargets.includes(role.id);
                            return (
                                <div
                                    key={role.id}
                                    onClick={() => toggleTarget(role.id, 'tech')}
                                    className={cn(
                                        "cursor-pointer p-4 rounded-xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95",
                                        isSelected
                                            ? "bg-amber-500/10 border-amber-500/40"
                                            : cn("bg-muted/20 border-white/5 hover:bg-muted/40", role.bg)
                                    )}
                                >
                                    <role.icon className={cn("w-5 h-5", isSelected ? "text-amber-500" : role.color)} />
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-wider text-center",
                                        isSelected ? "text-amber-500" : role.color
                                    )}>
                                        {role.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>
    );
}
