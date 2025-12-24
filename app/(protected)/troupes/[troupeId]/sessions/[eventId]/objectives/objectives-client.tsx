'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveSessionPlan } from "@/lib/actions/session";
import { useRouter } from "next/navigation";
import { Check, Play, User, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectivesClientProps {
    sessionData: any;
    troupeId: string;
}

export function ObjectivesClient({ sessionData, troupeId }: ObjectivesClientProps) {
    const router = useRouter();
    const play = sessionData.plays;
    const plan = sessionData.session_plans;
    const lineStats = sessionData.lineStats || [];

    // Initialize scenes with character-level objectives if they don't exist
    const [scenesWithObjectives, setScenesWithObjectives] = useState<any[]>(() => {
        const initial = plan.selected_scenes || [];
        return initial.map((s: any) => ({
            ...s,
            characterObjectives: s.characterObjectives || []
        }));
    });

    const [isSaving, setIsSaving] = useState(false);
    const [expandedScene, setExpandedScene] = useState<string | null>(scenesWithObjectives[0]?.id);

    const handleUpdateSceneObjective = (id: string, objective: string) => {
        setScenesWithObjectives(prev =>
            prev.map(s => s.id === id ? { ...s, objective } : s)
        );
    };

    const handleUpdateCharacterObjective = (sceneId: string, charId: string, objective: string) => {
        setScenesWithObjectives(prev =>
            prev.map(s => {
                if (s.id !== sceneId) return s;
                const charOs = [...(s.characterObjectives || [])];
                const existingIdx = charOs.findIndex(co => co.id === charId);
                if (existingIdx >= 0) {
                    charOs[existingIdx] = { ...charOs[existingIdx], objective };
                } else {
                    charOs.push({ id: charId, objective });
                }
                return { ...s, characterObjectives: charOs };
            })
        );
    };

    const handleSave = async (shouldLaunch = false) => {
        setIsSaving(true);
        try {
            await saveSessionPlan(sessionData.id, scenesWithObjectives, plan.general_notes);
            if (shouldLaunch) {
                router.push(`/troupes/${troupeId}/sessions/${sessionData.id}/live`);
            } else {
                router.push(`/troupes/${troupeId}/sessions`);
            }
        } catch (error) {
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                {scenesWithObjectives.map((item, index) => {
                    const scene = play.play_scenes.find((s: any) => s.id === item.id);
                    const sceneChars = play.play_characters.filter((pc: any) =>
                        scene?.scene_characters?.some((sc: any) => sc.character_id === pc.id)
                    );
                    const isExpanded = expandedScene === item.id;

                    return (
                        <Card key={item.id} className={cn(
                            "bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border-2 transition-all",
                            isExpanded ? "border-primary/40 ring-1 ring-primary/20" : "hover:border-white/20"
                        )}>
                            <div
                                className="p-6 cursor-pointer flex items-center justify-between"
                                onClick={() => setExpandedScene(isExpanded ? null : item.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-sm font-black text-primary border border-primary/20">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-xl uppercase tracking-tighter">{scene?.title}</h3>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                            {sceneChars.length} personnages • {lineStats.filter((ls: any) => ls.scene_id === item.id).reduce((acc: number, curr: any) => acc + (curr.line_count || 0), 0)} répliques
                                        </p>
                                    </div>
                                </div>
                                {isExpanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                            </div>

                            {isExpanded && (
                                <CardContent className="p-8 pt-0 space-y-8 animate-in slide-in-from-top-2 duration-300">
                                    {/* Global Scene Objective */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2">
                                            <MessageSquare className="w-3 h-3" /> Objectif Global de la Scène
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Travail du rythme et des silences..."
                                            value={item.objective}
                                            onChange={(e) => handleUpdateSceneObjective(item.id, e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:border-primary/50 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Character Specific Objectives */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em] flex items-center gap-2">
                                            <User className="w-3 h-3" /> Objectifs par personnage
                                        </label>
                                        <div className="grid gap-3">
                                            {sceneChars.map((char: any) => {
                                                const charStat = lineStats.find((ls: any) => ls.scene_id === item.id && ls.character_id === char.id);
                                                const charObj = item.characterObjectives?.find((co: any) => co.id === char.id)?.objective || "";

                                                return (
                                                    <div key={char.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-2xl bg-black/40 border border-white/5 group hover:border-white/10 transition-colors">
                                                        <div className="md:col-span-3">
                                                            <p className="font-bold text-white group-hover:text-primary transition-colors">{char.name}</p>
                                                            <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">
                                                                {charStat?.line_count || 0} répliques
                                                            </p>
                                                        </div>
                                                        <div className="md:col-span-9">
                                                            <input
                                                                type="text"
                                                                placeholder={`Focaliser ${char.name} sur...`}
                                                                value={charObj}
                                                                onChange={(e) => handleUpdateCharacterObjective(item.id, char.id, e.target.value)}
                                                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm text-white placeholder:text-gray-700 outline-none focus:border-primary/30 transition-all font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-end pt-8">
                <Button
                    variant="ghost"
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                    className="rounded-2xl px-8 h-16 font-bold text-gray-500 hover:text-white transition-all uppercase text-[10px] tracking-widest"
                >
                    Valider et quitter
                </Button>
                <Button
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                    className="rounded-2xl px-12 h-16 bg-primary hover:bg-primary/80 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/40 active:scale-95 transition-all"
                >
                    <Play className="w-4 h-4 mr-3" />
                    Valider et lancer la séance
                </Button>
            </div>
        </div>
    );
}
