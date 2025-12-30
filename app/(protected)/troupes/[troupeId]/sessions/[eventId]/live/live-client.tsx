'use client';

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronRight, ChevronLeft, Send, User, Mic, MicOff, History, ArrowUpRight, Loader2, Target, BookOpen } from "lucide-react";
import { submitSessionFeedback, getLastFeedbacksForCharacters } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

interface LiveProps {
    sessionData: any;
    troupeId: string;
    isReadOnly?: boolean;
}

export function LiveSessionClient({ sessionData, troupeId, isReadOnly = false }: LiveProps) {
    const plays = sessionData.plays || [];
    const plan = sessionData.session_plans;
    const selectedScenes = plan.selected_scenes || [];
    const selectedSceneIds = selectedScenes.map((s: any) => typeof s === 'string' ? s : s.id);

    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [characterFeedbacks, setCharacterFeedbacks] = useState<Record<string, string>>({});
    const [lastFeedbacks, setLastFeedbacks] = useState<Record<string, any>>({});
    const [isSubmittingMap, setIsSubmittingMap] = useState<Record<string, boolean>>({});
    const [isListening, setIsListening] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Derived data
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

    // Get scene objective
    const sceneObjective = plan.selected_scenes.find((s: any) => s.id === currentScene?.id)?.objective;

    // Fetch history when scene changes
    useEffect(() => {
        if (charactersInSceneIds.length > 0) {
            getLastFeedbacksForCharacters(charactersInSceneIds).then(setLastFeedbacks);
        }
    }, [currentSceneIndex]);

    // Scroll timeline to active scene
    useEffect(() => {
        if (timelineRef.current) {
            const activeButton = timelineRef.current.querySelector('[data-active="true"]');
            if (activeButton) {
                activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [currentSceneIndex]);

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

            const latest = await getLastFeedbacksForCharacters([char.id]);
            setLastFeedbacks(prev => ({ ...prev, ...latest }));
            setCharacterFeedbacks(prev => ({ ...prev, [char.id]: "" }));
        } catch (error) {
            alert("Erreur d'envoi");
        } finally {
            setIsSubmittingMap(prev => ({ ...prev, [char.id]: false }));
        }
    };

    const goToScene = (index: number) => {
        setCurrentSceneIndex(Math.max(0, Math.min(selectedSceneIds.length - 1, index)));
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Timeline Bar */}
            <div className="relative">
                <div
                    ref={timelineRef}
                    className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {selectedSceneIds.map((sid: string, idx: number) => {
                        let itemScene = null;
                        let itemPlay = null;
                        for (const p of plays) {
                            const found = (p.play_scenes || []).find((s: any) => s.id === sid);
                            if (found) {
                                itemScene = found;
                                itemPlay = p;
                                break;
                            }
                        }
                        const isActive = idx === currentSceneIndex;
                        const isDone = idx < currentSceneIndex;

                        return (
                            <button
                                key={`${sid}-${idx}`}
                                data-active={isActive}
                                onClick={() => goToScene(idx)}
                                className={cn(
                                    "flex-shrink-0 px-4 py-3 rounded-xl transition-all border-2",
                                    isActive
                                        ? "bg-primary text-primary-foreground border-primary scale-105 shadow-xl shadow-primary/30"
                                        : isDone
                                            ? "bg-muted/30 text-muted-foreground border-border opacity-50 hover:opacity-100"
                                            : "bg-muted/50 text-foreground border-border hover:border-primary/50"
                                )}
                            >
                                <div className="text-[10px] font-black uppercase tracking-wider opacity-70">
                                    {itemPlay?.title?.substring(0, 15)}
                                </div>
                                <div className="text-sm font-bold whitespace-nowrap">
                                    {idx + 1}. {itemScene?.title}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Navigation Arrows */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none px-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border pointer-events-auto shadow-lg"
                        onClick={() => goToScene(currentSceneIndex - 1)}
                        disabled={currentSceneIndex === 0}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border pointer-events-auto shadow-lg"
                        onClick={() => goToScene(currentSceneIndex + 1)}
                        disabled={currentSceneIndex === selectedSceneIds.length - 1}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content - 2 Columns Side by Side */}
            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0 h-[calc(100vh-280px)]">

                {/* Left: Scene Info & Script */}
                <Card className="bg-card border-border border-2 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-border bg-primary/5">
                        <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="bg-primary/20 border-primary/30 text-primary text-[9px] font-black uppercase">
                                Scène {currentSceneIndex + 1}/{selectedSceneIds.length}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {currentPlay?.title}
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-foreground tracking-tight">
                            {currentScene?.title}
                        </h2>

                        {sceneObjective && (
                            <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
                                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[9px] font-black text-primary uppercase tracking-wider mb-1">Objectif</p>
                                    <p className="text-sm font-medium text-foreground">{sceneObjective}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <CardContent className="p-6 flex-1 overflow-y-auto">
                        {currentScene?.summary ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <BookOpen className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Résumé de la scène</span>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed italic">
                                    "{currentScene.summary}"
                                </p>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-medium">Pas de texte disponible</p>
                                    <p className="text-xs opacity-60">Le résumé de la scène sera affiché ici</p>
                                </div>
                            </div>
                        )}

                        {/* Characters in scene */}
                        <div className="mt-6 pt-6 border-t border-border">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3">
                                {charactersInScene.length} personnages sur scène
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {charactersInScene.map((char: any) => (
                                    <Badge key={char.id} variant="outline" className="px-3 py-1 text-xs font-bold">
                                        {char.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Feedback per Character */}
                <div className="flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" />
                            Feedback par personnage
                        </p>
                    </div>

                    <div className="space-y-4">
                        {charactersInScene.map((char: any) => {
                            const scenePlan = plan.selected_scenes.find((s: any) => s.id === currentScene?.id);
                            const charGoal = scenePlan?.characterObjectives?.find((co: any) => co.id === char.id)?.objective;
                            const text = characterFeedbacks[char.id] || "";
                            const isSubmitting = isSubmittingMap[char.id];
                            const history = lastFeedbacks[char.id];
                            const listening = isListening === char.id;

                            return (
                                <Card key={char.id} className="bg-card border-border border-2 overflow-hidden">
                                    <div className="p-4">
                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 flex items-center justify-center">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-black text-foreground truncate">{char.name}</h3>
                                                {charGoal && (
                                                    <p className="text-[10px] text-primary font-bold flex items-center gap-1">
                                                        <ArrowUpRight className="w-3 h-3" />
                                                        {charGoal}
                                                    </p>
                                                )}
                                            </div>
                                            {history && (
                                                <div className="text-right opacity-50 hover:opacity-100 transition-opacity">
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                                                        <History className="w-3 h-3" /> Dernier
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[120px]">
                                                        {history.text}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Input */}
                                        <div className="relative">
                                            <textarea
                                                className={cn(
                                                    "w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none transition-all focus:border-primary/50",
                                                    listening && "border-red-500 bg-red-500/5",
                                                    isReadOnly && "opacity-50 cursor-not-allowed"
                                                )}
                                                placeholder={isReadOnly ? "Lecture seule..." : `Notes pour ${char.name}...`}
                                                rows={2}
                                                value={text}
                                                readOnly={isReadOnly}
                                                onChange={(e) => setCharacterFeedbacks(prev => ({ ...prev, [char.id]: e.target.value }))}
                                            />

                                            {!isReadOnly && (
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => toggleListening(char.id)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-lg transition-all",
                                                            listening ? "bg-red-500 text-white animate-pulse" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                        )}
                                                    >
                                                        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Submit */}
                                        {!isReadOnly && (
                                            <div className="flex justify-end mt-2">
                                                <Button
                                                    size="sm"
                                                    disabled={isSubmitting || !text.trim()}
                                                    onClick={() => handleSendFeedback(char)}
                                                    className="rounded-lg px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-bold text-xs"
                                                >
                                                    {isSubmitting ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <><Send className="w-3 h-3 mr-1" /> Envoyer</>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div >
    );
}
