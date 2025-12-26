'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, ChevronRight, ChevronLeft, Send, CheckCircle2, User, Play } from "lucide-react";
import { submitSessionFeedback } from "@/lib/actions/session";
// import { toast } from "sonner";
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
    const [feedbackText, setFeedbackText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

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


    const handleSendFeedback = async (char: any) => {
        if (!feedbackText.trim()) return;

        setIsSubmitting(true);
        try {
            await submitSessionFeedback(
                sessionData.id,
                char.id,
                feedbackText,
                char.actor_id,
                char.guest_id
            );
            alert(`Note envoyée pour ${char.name}`);
            setFeedbackText("");
        } catch (error) {
            alert("Erreur d'envoi");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">

            {/* Sidebar: Program Progress */}
            <div className="lg:col-span-1 space-y-4">
                <Card className="bg-white/5 border-white/10 h-full flex flex-col border-2 overflow-hidden">
                    <CardHeader className="p-4 border-b border-white/5 bg-white/5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Programme de Travail</CardTitle>
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
                                    key={sid}
                                    onClick={() => setCurrentSceneIndex(idx)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 group",
                                        isActive ? "bg-primary text-white shadow-xl shadow-primary/20" :
                                            isDone ? "opacity-30 hover:opacity-100 hover:bg-white/5" : "hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 transition-transform",
                                        isActive ? "bg-white text-primary scale-110" : "bg-white/5 text-gray-500 group-hover:bg-white/10"
                                    )}>
                                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black truncate leading-tight">{scene?.title}</p>
                                        <p className={cn(
                                            "text-[9px] uppercase tracking-wider truncate mt-0.5 font-bold",
                                            isActive ? "text-white/60" : "text-gray-600"
                                        )}>
                                            {itemSceneAndPlay?.play?.title}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </CardContent>
                    <div className="p-4 border-t border-white/5 bg-white/5">
                        <Button
                            variant="ghost"
                            className="w-full rounded-xl text-[10px] uppercase font-black tracking-widest text-gray-500 hover:text-white"
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
                            <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-3">
                                {currentSceneIndex + 1}. {currentScene?.title}
                                <span className="text-sm font-bold text-white/40 ml-4 uppercase tracking-widest">{currentPlay?.title}</span>
                            </h2>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-primary/20 border-primary/30 text-primary uppercase text-[8px] font-black px-2 py-0.5">
                                        Objectif
                                    </Badge>
                                    <p className="text-sm font-medium text-white/90 italic">
                                        {plan.selected_scenes.find((s: any) => s.id === currentScene?.id)?.objective || "Travailler librement"}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setCurrentSceneIndex(prev => Math.min(selectedSceneIds.length - 1, prev + 1))}
                                    className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest h-8 rounded-lg border border-white/5"
                                >
                                    Terminer la scène
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
                                onClick={() => setCurrentSceneIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentSceneIndex === 0}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
                                onClick={() => setCurrentSceneIndex(prev => Math.min(selectedSceneIds.length - 1, prev + 1))}
                                disabled={currentSceneIndex === selectedSceneIds.length - 1}
                            >
                                <ChevronRight className="w-6 h-6" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Feedback Input Zone */}
                <Card className="flex-1 bg-white/5 border-white/10 overflow-hidden flex flex-col border-2 relative">
                    <Tabs defaultValue={charactersInScene[0]?.id} className="flex-1 flex flex-col">
                        <div className="border-b border-white/5 px-8 pt-6">
                            <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-4">Feedback par personnage</p>
                            <TabsList className="bg-transparent h-12 gap-8 p-0">
                                {charactersInScene.map((char: any) => (
                                    <TabsTrigger
                                        key={char.id}
                                        value={char.id}
                                        className="data-[state=active]:text-primary data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-black transition-all uppercase tracking-widest"
                                    >
                                        {char.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <div className="flex-1 relative">
                            {charactersInScene.map((char: any) => (
                                <TabsContent key={char.id} value={char.id} className="m-0 h-full flex flex-col p-8 lg:p-12">
                                    <div className="flex items-center gap-6 mb-10">
                                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center shadow-2xl">
                                            <User className="w-10 h-10 text-primary/60" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-3xl font-black text-white tracking-tight">{char.name}</h3>
                                                <Badge className="bg-white/5 text-gray-400 text-[8px] uppercase font-black border-white/10">
                                                    {char.actor_id ? "Membre" : char.guest_id ? "Invité" : "Unassigned"}
                                                </Badge>
                                            </div>

                                            {(() => {
                                                const scenePlan = plan.selected_scenes.find((s: any) => s.id === currentScene?.id);
                                                const charGoal = scenePlan?.characterObjectives?.find((co: any) => co.id === char.id)?.objective;
                                                return charGoal ? (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                                        <span className="text-sm text-primary font-bold uppercase tracking-widest text-[10px]">Cible : {charGoal}</span>
                                                    </div>
                                                ) : <p className="text-xs text-gray-600 font-medium">Pas de consigne spécifique</p>;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-black/40 rounded-[2.5rem] border border-white/5 p-8 relative shadow-inner">
                                        <textarea
                                            className="w-full h-full bg-transparent text-2xl font-medium text-white placeholder:text-gray-800 outline-none resize-none leading-relaxed"
                                            placeholder={`Notez vos impressions pour ${char.name}...`}
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                        />
                                        <Button
                                            size="lg"
                                            disabled={isSubmitting || !feedbackText.trim()}
                                            onClick={() => handleSendFeedback(char as any)}
                                            className="absolute bottom-10 right-10 rounded-2xl px-10 py-8 bg-primary hover:bg-primary/80 text-white font-black uppercase text-sm tracking-widest shadow-[0_20px_50px_rgba(var(--primary),0.3)] transition-all active:scale-95"
                                        >
                                            {isSubmitting ? "Envoi..." : <><Send className="w-5 h-5 mr-3" /> Envoyer la note</>}
                                        </Button>
                                    </div>
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
