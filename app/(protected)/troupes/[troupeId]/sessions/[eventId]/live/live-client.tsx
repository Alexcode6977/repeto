'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronRight, ChevronLeft, Send, CheckCircle2, User, Play, Mic, MicOff, History, Clock, ArrowUpRight, Loader2 } from "lucide-react";
import { submitSessionFeedback, getLastFeedbacksForCharacters } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

interface LiveProps {
    sessionData: any;
    troupeId: string;
}

export function LiveSessionClient({ sessionData, troupeId }: LiveProps) {
    const plays = sessionData.plays || [];
    const plan = sessionData.session_plans;
    const selectedScenes = plan.selected_scenes || [];
    const selectedSceneIds = selectedScenes.map((s: any) => typeof s === 'string' ? s : s.id);

    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [characterFeedbacks, setCharacterFeedbacks] = useState<Record<string, string>>({});
    const [lastFeedbacks, setLastFeedbacks] = useState<Record<string, any>>({});
    const [isSubmittingMap, setIsSubmittingMap] = useState<Record<string, boolean>>({});
    const [isListening, setIsListening] = useState<string | null>(null); // characterId
    const recognitionRef = useRef<any>(null);

    // Derived data - Find scene and its parent play
    let sceneAndPlay = null;
    const currentSceneId = selectedSceneIds[currentSceneIndex];
    for (const p of plays) {
        const found = (p.play_scenes || []).find((s: any) => s.id === currentSceneId);
        if (found) {
            sceneAndPlay = { scene: found, play: p };
            break;
        }
    }

    const currentScene = sceneAndPlay?.scene;
    const currentPlay = sceneAndPlay?.play;
    const charactersInSceneIds = currentScene?.scene_characters?.map((sc: any) => sc.character_id) || [];
    const charactersInScene = currentPlay?.play_characters.filter((pc: any) => charactersInSceneIds.includes(pc.id)) || [];

    // Fetch history when scene changes
    useEffect(() => {
        if (charactersInSceneIds.length > 0) {
            getLastFeedbacksForCharacters(charactersInSceneIds).then(setLastFeedbacks);
        }
    }, [currentSceneIndex, charactersInSceneIds]);

    // Speech Recognition Setup
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'fr-FR';
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');

                if (isListening) {
                    setCharacterFeedbacks(prev => ({
                        ...prev,
                        [isListening]: transcript
                    }));
                }
            };

            recognition.onend = () => {
                setIsListening(null);
            };

            recognitionRef.current = recognition;
        }
    }, [isListening]);

    const toggleListening = (charId: string) => {
        if (isListening === charId) {
            recognitionRef.current?.stop();
            setIsListening(null);
        } else {
            if (isListening) recognitionRef.current?.stop();
            setIsListening(charId);
            setCharacterFeedbacks(prev => ({ ...prev, [charId]: prev[charId] || "" }));
            recognitionRef.current?.start();
        }
    };

    const handleSendFeedback = async (char: any) => {
        const text = characterFeedbacks[char.id];
        if (!text?.trim()) return;

        setIsSubmittingMap(prev => ({ ...prev, [char.id]: true }));
        try {
            await submitSessionFeedback(
                sessionData.id,
                char.id,
                text,
                char.actor_id,
                char.guest_id
            );

            // Re-fetch history for this character
            const latest = await getLastFeedbacksForCharacters([char.id]);
            setLastFeedbacks(prev => ({ ...prev, ...latest }));

            // Clear input
            setCharacterFeedbacks(prev => ({ ...prev, [char.id]: "" }));
        } catch (error) {
            alert("Erreur d'envoi");
        } finally {
            setIsSubmittingMap(prev => ({ ...prev, [char.id]: false }));
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">

            {/* Sidebar: Program Progress */}
            <div className="lg:col-span-1 space-y-4">
                <Card className="bg-card border-border h-full flex flex-col border-2 overflow-hidden">
                    <CardHeader className="p-4 border-b border-border bg-muted/30">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Programme de Travail</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1 flex-1 overflow-y-auto">
                        {selectedSceneIds.map((sid: any, idx: any) => {
                            let itemSceneAndPlay = null;
                            for (const p of plays) {
                                const found = (p.play_scenes || []).find((s: any) => s.id === sid);
                                if (found) {
                                    itemSceneAndPlay = { scene: found, play: p };
                                    break;
                                }
                            }
                            const scene = itemSceneAndPlay?.scene;
                            const isActive = idx === currentSceneIndex;
                            const isDone = idx < currentSceneIndex;

                            return (
                                <button
                                    key={`${sid}-${idx}`}
                                    onClick={() => setCurrentSceneIndex(idx)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 group",
                                        isActive ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" :
                                            isDone ? "opacity-30 hover:opacity-100 hover:bg-muted/50" : "hover:bg-muted/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 transition-transform",
                                        isActive ? "bg-primary-foreground text-primary scale-110" : "bg-muted text-muted-foreground group-hover:bg-muted/10"
                                    )}>
                                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black truncate leading-tight">{scene?.title}</p>
                                        <p className={cn(
                                            "text-[9px] uppercase tracking-wider truncate mt-0.5 font-bold",
                                            isActive ? "text-primary-foreground/60" : "text-muted-foreground/60"
                                        )}>
                                            {itemSceneAndPlay?.play?.title}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </CardContent>
                    <div className="p-4 border-t border-border bg-muted/30">
                        <Button
                            variant="ghost"
                            className="w-full rounded-xl text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-foreground"
                            asChild
                        >
                            <a href={`/troupes/${troupeId}/sessions`}>Quitter la séance</a>
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Main Live HUD */}
            <div className="lg:col-span-3 flex flex-col gap-6">
                {/* Scene Header */}
                <Card className="bg-primary/10 border-primary/20 backdrop-blur-md border-2 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Play className="w-32 h-32 text-primary" />
                    </div>
                    <CardContent className="p-8 flex items-center justify-between relative">
                        <div>
                            <p className="text-[10px] uppercase font-black text-primary tracking-[0.3em] mb-3 leading-none">Scène en cours</p>
                            <h2 className="text-5xl font-black text-foreground tracking-tighter leading-none mb-3">
                                {currentSceneIndex + 1}. {currentScene?.title}
                                <span className="text-sm font-bold text-muted-foreground ml-4 uppercase tracking-widest">{currentPlay?.title}</span>
                            </h2>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-primary/20 border-primary/30 text-primary uppercase text-[8px] font-black px-2 py-0.5">
                                        Objectif
                                    </Badge>
                                    <p className="text-sm font-medium text-muted-foreground italic">
                                        {plan.selected_scenes.find((s: any) => s.id === currentScene?.id)?.objective || "Travailler librement"}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setCurrentSceneIndex(prev => Math.min(selectedSceneIds.length - 1, prev + 1))}
                                    className="bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest h-8 rounded-lg border border-primary/20"
                                >
                                    Terminer la scène
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-12 h-12 rounded-2xl bg-muted/50 hover:bg-muted border border-border transition-all active:scale-95 text-foreground"
                                onClick={() => setCurrentSceneIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentSceneIndex === 0}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-12 h-12 rounded-2xl bg-muted/50 hover:bg-muted border border-border transition-all active:scale-95 text-foreground"
                                onClick={() => setCurrentSceneIndex(prev => Math.min(selectedSceneIds.length - 1, prev + 1))}
                                disabled={currentSceneIndex === selectedSceneIds.length - 1}
                            >
                                <ChevronRight className="w-6 h-6" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Feedback Input Zone - Refactored to Cards for Speed */}
                <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Feedback par personnage</p>
                        <Badge variant="outline" className="border-border bg-muted/50 text-[9px] font-bold text-muted-foreground">
                            {charactersInScene.length} personnages sur scène
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {charactersInScene.map((char: any) => {
                            const scenePlan = plan.selected_scenes.find((s: any) => s.id === currentScene?.id);
                            const charGoal = scenePlan?.characterObjectives?.find((co: any) => co.id === char.id)?.objective;
                            const text = characterFeedbacks[char.id] || "";
                            const isSubmitting = isSubmittingMap[char.id];
                            const history = lastFeedbacks[char.id];
                            const listening = isListening === char.id;

                            return (
                                <Card key={char.id} className="bg-card border-border overflow-hidden border-2 transition-all hover:border-primary/20">
                                    <div className="grid grid-cols-1 lg:grid-cols-12">
                                        {/* Char Info Section */}
                                        <div className="lg:col-span-3 p-6 border-b lg:border-b-0 lg:border-r border-border bg-muted/20">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 flex items-center justify-center">
                                                    <User className="w-6 h-6 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-xl font-black text-foreground truncate">{char.name}</h3>
                                                    <p className="text-[9px] text-muted-foreground font-bold uppercase">{char.actor_id ? "Membre" : "Invité"}</p>
                                                </div>
                                            </div>

                                            {charGoal && (
                                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                                                    <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1">
                                                        <ArrowUpRight className="w-3 h-3" /> Objectif
                                                    </p>
                                                    <p className="text-xs font-medium text-foreground/90 leading-tight italic">
                                                        {charGoal}
                                                    </p>
                                                </div>
                                            )}

                                            {history && (
                                                <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                        <History className="w-3 h-3" /> Dernière note
                                                    </p>
                                                    <div className="text-[11px] text-muted-foreground leading-relaxed italic line-clamp-3">
                                                        "{history.text}"
                                                    </div>
                                                    <p className="text-[9px] font-bold text-muted-foreground/60">
                                                        {history.events?.title} - {new Date(history.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Interaction Section */}
                                        <div className="lg:col-span-9 p-6 relative flex flex-col bg-muted/30">
                                            <div className="relative flex-1 group">
                                                <textarea
                                                    className={cn(
                                                        "w-full bg-transparent text-xl font-medium text-foreground placeholder:text-muted-foreground/30 outline-none resize-none leading-relaxed transition-all",
                                                        listening && "text-primary brightness-110"
                                                    )}
                                                    placeholder={`Notez vos impressions pour ${char.name}...`}
                                                    rows={3}
                                                    value={text}
                                                    onChange={(e) => setCharacterFeedbacks(prev => ({ ...prev, [char.id]: e.target.value }))}
                                                />

                                                <div className="absolute top-0 right-0 flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => toggleListening(char.id)}
                                                        className={cn(
                                                            "w-10 h-10 rounded-full transition-all",
                                                            listening ? "bg-red-500 text-foreground animate-pulse" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                        )}
                                                    >
                                                        {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex justify-end mt-4">
                                                <Button
                                                    size="sm"
                                                    disabled={isSubmitting || !text.trim()}
                                                    onClick={() => handleSendFeedback(char as any)}
                                                    className="rounded-xl px-6 py-5 bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95"
                                                >
                                                    {isSubmitting ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <><Send className="w-4 h-4 mr-2" /> Envoyer</>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
