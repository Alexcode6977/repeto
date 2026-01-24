'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mic, Send, X, Sparkles, MessageSquare, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitSessionFeedback } from '@/lib/actions/session';
import { injectDirectorNote } from '@/lib/actions/director';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface LiveActorGridProps {
    actorsInScene: any[];
    sessionData: any;
    currentScene: any;
    globalSceneIndex: number; // For injecting director notes
    isReadOnly?: boolean;
}

export function LiveActorGrid({ actorsInScene, sessionData, currentScene, globalSceneIndex, isReadOnly }: LiveActorGridProps) {
    const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
    const [interactionType, setInteractionType] = useState<'feedback' | 'direction' | null>(null);
    const [feedbackText, setFeedbackText] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Helper to find character ID for the selected actor in this scene
    const getTargetCharacter = (actorId: string) => {
        if (!currentScene) return null;
        // Find play character matching actor
        return currentScene.playCharacters?.find((pc: any) =>
            (pc.actor_id === actorId || pc.guest_id === actorId) &&
            currentScene.scene_characters.some((sc: any) => sc.character_id === pc.id)
        );
    };

    const handleSend = async () => {
        if (!feedbackText.trim() || !selectedActorId || !interactionType) return;
        setIsSending(true);

        try {
            const starChar = getTargetCharacter(selectedActorId);

            if (interactionType === 'feedback') {
                // Ephemeral Feedback (Session Stats)
                if (starChar) {
                    await submitSessionFeedback(sessionData.id, starChar.id, feedbackText, selectedActorId);
                }
            } else {
                // Persistent Director Note (Script Injection)
                // We inject it at the start of the scene (globalSceneIndex)
                // Format: [À LUCIEN] ...
                const prefix = starChar ? `[À ${starChar.name.toUpperCase()}] ` : "";
                await injectDirectorNote(
                    currentScene.playId,
                    globalSceneIndex,
                    prefix + feedbackText,
                    undefined // Start of scene
                );
            }

            setFeedbackText("");
            setSelectedActorId(null);
            setInteractionType(null);
        } catch (e) {
            console.error(e);
            alert("Erreur d'envoi");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar h-full bg-background/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 sticky top-0 bg-background/95 backdrop-blur py-2 z-10 w-full text-center">
                Sur le plateau
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                    {actorsInScene.map((actor, i) => (
                        <motion.div
                            key={actor.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative group aspect-square lg:aspect-[4/5] bg-card/40 rounded-[2rem] border border-white/5 hover:border-primary/20 transition-all overflow-hidden flex flex-col items-center justify-center p-4"
                        >
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full border-4 border-background shadow-xl mb-4 group-hover:scale-105 transition-transform">
                                <Avatar className="w-full h-full">
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-xl">
                                        {actor.characterName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            {/* Name info */}
                            <div className="text-center space-y-1 z-10">
                                <span className="block text-lg font-black text-foreground leading-tight">
                                    {actor.characterName}
                                </span>
                                <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {actor.name}
                                </span>
                            </div>

                            {/* HOVER ACTIONS (Desktop/Touch) */}
                            {!isReadOnly && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-6 z-20">
                                    <Button
                                        onClick={() => {
                                            setSelectedActorId(actor.id);
                                            setInteractionType('feedback');
                                        }}
                                        className="w-full bg-blue-500/20 hover:bg-blue-500 text-blue-200 hover:text-white border border-blue-500/50 rounded-xl"
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Feedback
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setSelectedActorId(actor.id);
                                            setInteractionType('direction');
                                        }}
                                        className="w-full bg-purple-500/20 hover:bg-purple-500 text-purple-200 hover:text-white border border-purple-500/50 rounded-xl"
                                    >
                                        <StickyNote className="w-4 h-4 mr-2" />
                                        Direction
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {actorsInScene.length === 0 && (
                    <div className="col-span-full py-20 text-center text-muted-foreground italic">
                        Personne sur scène...
                    </div>
                )}
            </div>

            {/* DRAWER FOR INPUT */}
            <AnimatePresence>
                {selectedActorId && interactionType && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedActorId(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 bg-[#15151a] border-t border-white/10 rounded-t-[2rem] p-6 pb-8 shadow-2xl max-w-2xl mx-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    {interactionType === 'feedback' ? (
                                        <>
                                            <MessageSquare className="w-5 h-5 text-blue-400" />
                                            Feedback Session
                                        </>
                                    ) : (
                                        <>
                                            <StickyNote className="w-5 h-5 text-purple-400" />
                                            Note de Jeu (Script)
                                        </>
                                    )}
                                </h3>
                                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setSelectedActorId(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <p className="text-sm text-gray-400 mb-4">
                                {interactionType === 'feedback'
                                    ? "Ce message sera visible dans le rapport de session (éphémère)."
                                    : "Ce message sera ajouté au script comme une didascalie (permanent)."}
                            </p>

                            <div className="space-y-4">
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder={interactionType === 'feedback' ? "Bravo pour l'énergie..." : "Joue cette scène avec..."}
                                    className="w-full min-h-[140px] bg-black/20 border border-white/10 rounded-2xl text-base p-4 resize-none focus:outline-none focus:border-primary/50 text-white placeholder:text-gray-600"
                                    autoFocus
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={isSending || !feedbackText.trim()}
                                    className={cn(
                                        "w-full rounded-2xl h-14 text-sm font-black uppercase tracking-[0.2em] shadow-lg",
                                        interactionType === 'feedback'
                                            ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
                                            : "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20"
                                    )}
                                >
                                    {isSending ? "Envoi..." : "Envoyer"}
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
