'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, ChevronRight, ChevronLeft, Send, CheckCircle2, User } from "lucide-react";
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
                <Card className="bg-white/5 border-white/10 h-full flex flex-col">
                    <CardHeader className="p-4 border-b border-white/5">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-500">Programme</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1 flex-1 overflow-y-auto">
                        {selectedSceneIds.map((sid: any, idx: any) => {
                            let sceneAndPlay = null;
                            for (const p of plays) {
                                const found = (p.play_scenes || []).find((s: any) => s.id === sid);
                                if (found) {
                                    sceneAndPlay = { scene: found, play: p };
                                    break;
                                }
                            }
                            const scene = sceneAndPlay?.scene;
                            const isActive = idx === currentSceneIndex;
                            const isDone = idx < currentSceneIndex;

                            return (
                                <button
                                    key={sid}
                                    onClick={() => setCurrentSceneIndex(idx)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center gap-3",
                                        isActive ? "bg-primary text-white shadow-lg shadow-primary/20" :
                                            isDone ? "opacity-50 hover:bg-white/5" : "hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                                        isActive ? "bg-white text-primary" : "bg-white/5 text-gray-500"
                                    )}>
                                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{scene?.title}</p>
                                        <p className="text-[8px] text-gray-500 uppercase tracking-tighter truncate leading-none mt-0.5">
                                            {sceneAndPlay?.play?.title}
                                        </p>
                                        {isActive && (
                                            <p className="text-[8px] text-white/70 uppercase tracking-tighter truncate mt-1">
                                                {plan.selected_scenes.find((s: any) => s.id === sid)?.objective || "Pas d'objectif"}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </CardContent>
                    <div className="p-4 border-t border-white/5">
                        <Button
                            variant="destructive"
                            className="w-full rounded-xl text-[10px] uppercase font-black tracking-widest"
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
                <Card className="bg-primary/10 border-primary/20 backdrop-blur-md">
                    <CardContent className="p-8 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-black text-primary tracking-[0.3em] mb-2 leading-none">Scène Actuelle</p>
                            <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-2">
                                {currentScene?.title}
                                <span className="text-sm font-bold text-white/40 ml-4 uppercase">{currentPlay?.title}</span>
                            </h2>

                            <p className="text-sm font-medium text-white/70 italic">
                                Objectif : {plan.selected_scenes.find((s: any) => s.id === currentScene?.id)?.objective || "Travailler librement"}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full bg-white/5 hover:bg-white/10"
                                onClick={() => setCurrentSceneIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentSceneIndex === 0}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full bg-white/5 hover:bg-white/10"
                                onClick={() => setCurrentSceneIndex(prev => Math.min(selectedSceneIds.length - 1, prev + 1))}
                                disabled={currentSceneIndex === selectedSceneIds.length - 1}
                            >
                                <ChevronRight className="w-6 h-6" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Feedback Input Zone */}
                <Card className="flex-1 bg-white/5 border-white/10 overflow-hidden flex flex-col">
                    <Tabs defaultValue={charactersInScene[0]?.id} className="flex-1 flex flex-col">
                        <div className="border-b border-white/5 px-6">
                            <TabsList className="bg-transparent h-14 gap-6">
                                {charactersInScene.map((char: any) => (
                                    <TabsTrigger
                                        key={char.id}
                                        value={char.id}
                                        className="data-[state=active]:text-primary data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-2 text-xs font-bold transition-all uppercase tracking-widest"
                                    >
                                        {char.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <div className="flex-1 relative">
                            {charactersInScene.map((char: any) => (
                                <TabsContent key={char.id} value={char.id} className="m-0 h-full flex flex-col p-8">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                            <User className="w-8 h-8 text-gray-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">{char.name}</h3>
                                            <p className="text-sm text-gray-500 font-medium mb-2">
                                                {char.actor_id ? "Membre de la troupe" : char.guest_id ? "Invité" : "Non attribué"}
                                            </p>
                                            {(() => {
                                                const scenePlan = plan.selected_scenes.find((s: any) => s.id === currentScene?.id);
                                                const charGoal = scenePlan?.characterObjectives?.find((co: any) => co.id === char.id)?.objective;
                                                return charGoal ? (
                                                    <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl inline-block">
                                                        <p className="text-[10px] uppercase font-black text-primary tracking-widest leading-none mb-1">Cible</p>
                                                        <p className="text-sm text-white font-bold">{charGoal}</p>
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-black/20 rounded-3xl border border-white/5 p-6 relative group">
                                        <textarea
                                            className="w-full h-full bg-transparent text-xl font-medium text-white placeholder:text-gray-700 outline-none resize-none leading-relaxed"
                                            placeholder={`Votre retour pour ${char.name}...`}
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                        />
                                        <Button
                                            size="lg"
                                            disabled={isSubmitting || !feedbackText.trim()}
                                            onClick={() => handleSendFeedback(char as any)}
                                            className="absolute bottom-6 right-6 rounded-2xl px-8 bg-primary hover:bg-primary/80 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/50"
                                        >
                                            {isSubmitting ? "Envoi..." : <><Send className="w-4 h-4 mr-2" /> Envoyer la note</>}
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
