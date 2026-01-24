'use client';

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, Send, ChevronRight, ChevronLeft, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitSessionFeedback } from "@/lib/actions/session";

interface LiveSessionClientProps {
    sessionData: any;
    troupeId: string;
    currentUser: { id: string; name: string };
    isReadOnly?: boolean;
}

export function LiveSessionClient({ sessionData, troupeId, currentUser, isReadOnly = false }: LiveSessionClientProps) {
    // 1. Data Preparation
    const scenes = useMemo(() => {
        if (!sessionData.session_plans?.selected_scenes) return [];
        return sessionData.session_plans.selected_scenes.map((s: any) => {
            // Normalize ID (can be string or object depending on plan structure history)
            const sId = typeof s === 'string' ? s : s.id;

            // Find full scene details from plays
            for (const play of sessionData.plays || []) {
                const found = play.play_scenes.find((ps: any) => ps.id === sId);
                if (found) return { ...found, playTitle: play.title, playId: play.id, playCharacters: play.play_characters };
            }
            return null;
        }).filter(Boolean);
    }, [sessionData]);

    const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
    const [selectedActorId, setSelectedActorId] = useState<string | null>(null); // Id for feedback target
    const [feedbackText, setFeedbackText] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Safety check
    if (scenes.length === 0) return <div className="p-8 text-center text-muted-foreground">Aucune scène au programme.</div>;

    const currentScene = scenes[currentSceneIdx];

    // Get Actors in Current Scene
    const actorsInScene = useMemo(() => {
        if (!currentScene) return [];
        const actors = new Map<string, { id: string; name: string; characterName: string; avatar?: string }>();

        // Iterate characters in scene
        currentScene.scene_characters?.forEach((sc: any) => {
            const charDef = currentScene.playCharacters?.find((pc: any) => pc.id === sc.character_id);
            if (charDef) {
                const actorId = charDef.actor_id || charDef.guest_id;

                // Determine Actor Name/ID
                // If actorId is present, we try to use it. If not, we fall back to a "unassigned" key.
                if (actorId) {
                    const existing = actors.get(actorId);
                    if (existing) {
                        existing.characterName += ` & ${charDef.name}`;
                    } else {
                        // Note: We don't have full profile data here to get the real name (Alex, Bob...)
                        // Ideally we would fetch it or pass it.
                        // For now, we use the Character Name as the main identifier visually.
                        actors.set(actorId, {
                            id: actorId,
                            name: "Acteur", // Placeholder name since we lack profile data in this view context
                            characterName: charDef.name
                        });
                    }
                } else {
                    // Empty Role
                    actors.set(`unassigned-${charDef.id}`, {
                        id: `unassigned-${charDef.id}`,
                        name: "?",
                        characterName: charDef.name + " (Non distribué)"
                    });
                }
            }
        });
        return Array.from(actors.values());
    }, [currentScene]);

    const handleSendFeedback = async () => {
        if (!feedbackText.trim() || !selectedActorId) return;
        setIsSending(true);
        try {
            if (selectedActorId === 'scene-global') {
                // TODO: Handle global note (requires a different action or a convention)
                // For now, alerting user or skipping.
                alert("Note globale pas encore implémentée sur le backend.");
                return;
            }

            if (selectedActorId.startsWith("unassigned")) return;

            // We need characterId for the API `submitSessionFeedback(eventId, characterId, text, actorId)`
            // But we selected an ACTOR, who might have multiple characters.
            // The API expects `characterId`.
            // We need to find the characterId associated with this actor in this scene.
            // If multiple, maybe attach to the first one?
            const charDef = currentScene.playCharacters?.find((pc: any) => (pc.actor_id === selectedActorId || pc.guest_id === selectedActorId) && currentScene.scene_characters.some((sc: any) => sc.character_id === pc.id));

            if (charDef) {
                await submitSessionFeedback(sessionData.id, charDef.id, feedbackText, selectedActorId);
            }

            setFeedbackText("");
            setSelectedActorId(null); // Close drawer
        } catch (e) {
            console.error(e);
            alert("Erreur d'envoi");
        } finally {
            setIsSending(false);
        }
    };

    const handleSceneChange = (dir: 'next' | 'prev') => {
        if (dir === 'next' && currentSceneIdx < scenes.length - 1) setCurrentSceneIdx(c => c + 1);
        if (dir === 'prev' && currentSceneIdx > 0) setCurrentSceneIdx(c => c - 1);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] bg-background overflow-hidden relative">

            {/* A. TIMELINE (Haut) */}
            <div className="h-14 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-md overflow-x-auto overflow-y-hidden no-scrollbar flex items-center px-4 gap-2 z-20">
                {scenes.map((scene: any, idx: number) => {
                    const isActive = idx === currentSceneIdx;
                    return (
                        <button
                            key={scene.id}
                            onClick={() => setCurrentSceneIdx(idx)}
                            className={cn(
                                "shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border border-primary scale-105"
                                    : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                            )}
                        >
                            <span className="opacity-50 mr-2">{idx + 1}.</span>
                            {scene.title}
                        </button>
                    )
                })}
            </div>

            {/* B. LE PLATEAU (Centre) */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {/* Scene Info Overlay */}
                <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-background via-background/90 to-transparent p-6 pb-12 pointer-events-none">
                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            key={`title-${currentScene.id}`}
                            className="text-center"
                        >
                            <h2 className="text-2xl font-black tracking-tight text-foreground uppercase leading-none mb-1 drop-shadow-sm">
                                {currentScene.title}
                            </h2>
                            <p className="text-secondary-foreground/70 font-medium text-xs tracking-widest uppercase">
                                {currentScene.playTitle}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Actor Grid */}
                <div className="flex-1 overflow-y-auto p-4 pt-24 pb-32 no-scrollbar">
                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                        <AnimatePresence mode="popLayout">
                            {actorsInScene.map((actor, i) => (
                                <motion.button
                                    key={actor.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => !isReadOnly && setSelectedActorId(actor.id)}
                                    className="group relative flex flex-col items-center justify-center aspect-[4/5] bg-muted/40 rounded-[1.5rem] border border-white/5 hover:bg-primary/10 active:scale-95 transition-all overflow-hidden shadow-sm"
                                >
                                    {/* Avatar Visual */}
                                    <div className="w-16 h-16 rounded-full border-4 border-background shadow-lg mb-3 group-hover:scale-110 transition-transform bg-muted flex items-center justify-center">
                                        <Avatar className="w-full h-full">
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-lg">
                                                {actor.characterName.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    {/* Role Name */}
                                    <div className="text-center px-2 w-full">
                                        <span className="block text-sm font-bold text-foreground leading-tight mb-1 truncate px-1">
                                            {actor.characterName}
                                        </span>
                                    </div>

                                    {/* Tap indicator */}
                                    {!isReadOnly && (
                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </motion.button>
                            ))}

                            {actorsInScene.length === 0 && (
                                <div className="col-span-2 py-10 text-center text-muted-foreground text-sm italic">
                                    Aucun acteur dans cette scène.
                                </div>
                            )}

                        </AnimatePresence>

                        {/* Global Scene Note Button */}
                        <motion.button
                            layout
                            onClick={() => !isReadOnly && setSelectedActorId("scene-global")}
                            className="col-span-2 relative flex items-center justify-between px-6 py-4 bg-gradient-to-r from-secondary/10 to-secondary/5 rounded-[1.5rem] border border-secondary/20 hover:border-secondary/40 active:scale-95 transition-all mt-2"
                        >
                            <div className="text-left">
                                <span className="block text-sm font-black text-secondary-foreground">Note Globale</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Feedback troupe</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground">
                                <Sparkles className="w-5 h-5" />
                            </div>
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* C. BOTTOM CONTROLS */}
            <div className="h-20 shrink-0 bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-between px-6 pb-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSceneChange('prev')}
                    disabled={currentSceneIdx === 0}
                    className="h-12 w-12 rounded-full hover:bg-muted"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Scène</span>
                    <span className="text-xl font-bold font-mono">
                        {currentSceneIdx + 1}<span className="text-muted-foreground/40 text-sm">/{scenes.length}</span>
                    </span>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSceneChange('next')}
                    disabled={currentSceneIdx === scenes.length - 1}
                    className="h-12 w-12 rounded-full hover:bg-muted"
                >
                    <ChevronRight className="w-6 h-6" />
                </Button>
            </div>

            {/* CUSTOM DRAWER OVERLAY */}
            <AnimatePresence>
                {selectedActorId && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedActorId(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-50 bg-[#15151a] border-t border-white/10 rounded-t-[2rem] p-6 pb-8 shadow-2xl"
                        >
                            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6 opacity-20" />

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-white">
                                    {selectedActorId === 'scene-global' ? 'Note Globale' : 'Feedback'}
                                </h3>
                                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 bg-white/5 hover:bg-white/10" onClick={() => setSelectedActorId(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {/* Quick Tags */}
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-6 px-6">
                                    {["⚡️ Énergie", "🐢 Rythme", "🔊 Volume", "🎭 Émotion", "📝 Texte"].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setFeedbackText(prev => (prev ? prev + " " : "") + tag)}
                                            className="shrink-0 px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wide text-gray-300 hover:bg-primary hover:text-white hover:border-primary transition-colors"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Votre note..."
                                        className="w-full min-h-[140px] bg-black/20 border border-white/10 rounded-2xl text-base p-4 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-white placeholder:text-gray-600"
                                        autoFocus
                                    />
                                    <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
                                        <Mic className="w-5 h-5 text-primary" />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSendFeedback}
                                    disabled={isSending || !feedbackText.trim()}
                                    className="w-full rounded-2xl h-14 text-sm font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
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
