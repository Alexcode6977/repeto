'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Users, Plus, Trash2, Info } from "lucide-react";
import { saveSessionPlan } from "@/lib/actions/session";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface PlannerProps {
    sessionData: any;
    troupeId: string;
    members: any[];
    guests: any[];
}

export function SessionPlannerClient({ sessionData, troupeId, members, guests }: PlannerProps) {
    const router = useRouter();
    const play = sessionData.plays;
    const attendance = sessionData.event_attendance || [];
    const initialPlan = sessionData.session_plans || { selected_scenes: [], general_notes: "" };

    // Normalize IDs from potential object structure
    const initialIds = (initialPlan.selected_scenes || []).map((s: any) => typeof s === 'string' ? s : s.id);

    const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>(initialIds);
    const [notes, setNotes] = useState(initialPlan.general_notes || "");
    const [isSaving, setIsSaving] = useState(false);
    const [filterMagic, setFilterMagic] = useState(false);

    // 1. Identify who is present
    const presentIds = useMemo(() => {
        return new Set(
            attendance
                .filter((a: any) => a.status === 'present')
                .map((a: any) => a.user_id || a.guest_id)
        );
    }, [attendance]);

    // 2. Scene Matching Logic
    const scenesWithMetadata = useMemo(() => {
        if (!play?.play_scenes) return [];

        return play.play_scenes.map((scene: any) => {
            const requiredCharIds = scene.scene_characters?.map((sc: any) => sc.character_id) || [];
            const requiredCharacters = play.play_characters.filter((pc: any) => requiredCharIds.includes(pc.id));

            const missingCharacters = requiredCharacters.filter((char: any) => {
                const actorId = char.actor_id || char.guest_id;
                if (!actorId) return true;
                return !presentIds.has(actorId);
            });

            const isPlayable = missingCharacters.length === 0;
            const isIncomplete = !isPlayable && missingCharacters.length <= 2;
            const isUnplayable = missingCharacters.length > 2;

            return {
                ...scene,
                isPlayable,
                isIncomplete,
                isUnplayable,
                requiredCharacters,
                missingCharacters
            };
        });
    }, [play, presentIds]);

    const filteredScenes = useMemo(() => {
        if (!filterMagic) return scenesWithMetadata;
        return scenesWithMetadata.filter((s: any) => s.isPlayable);
    }, [scenesWithMetadata, filterMagic]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const currentSelected = initialPlan.selected_scenes || [];
            const newPayload = selectedSceneIds.map(id => {
                const existing = currentSelected.find((s: any) => (typeof s === 'string' ? s === id : s.id === id));
                return typeof existing === 'object' ? existing : { id, objective: "", characterObjectives: [] };
            });

            await saveSessionPlan(sessionData.id, newPayload, notes);
            router.push(`/troupes/${troupeId}/sessions/${sessionData.id}/objectives`);
        } catch (error) {
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSceneSelection = (id: string) => {
        setSelectedSceneIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const selectedScenesData = selectedSceneIds.map(id => scenesWithMetadata.find((s: any) => s.id === id)).filter(Boolean);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left: Matching Grid */}
            <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Users className="w-6 h-6 text-primary" />
                            {play?.title || "Pièce"}
                        </h2>
                        <p className="text-gray-500 text-sm font-medium mt-1">Disponibilité des scènes selon les présences</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilterMagic(false)}
                            className={cn("rounded-lg text-[10px] uppercase font-bold px-3", !filterMagic && "bg-primary text-white hover:bg-primary")}
                        >
                            Toutes
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilterMagic(true)}
                            className={cn("rounded-lg text-[10px] uppercase font-bold px-3", filterMagic && "bg-green-500 text-white hover:bg-green-500")}
                        >
                            Filtre Magique
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredScenes.map((scene: any) => (
                        <Card
                            key={scene.id}
                            onClick={() => toggleSceneSelection(scene.id)}
                            className={cn(
                                "cursor-pointer transition-all border-white/10 relative overflow-hidden group",
                                selectedSceneIds.includes(scene.id) ? "ring-2 ring-primary border-primary/50" : "hover:border-white/20 bg-white/5",
                                scene.isPlayable ? "hover:bg-green-500/5" : "opacity-80"
                            )}
                        >
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            scene.isPlayable ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                                scene.isIncomplete ? "bg-orange-500" : "bg-red-500"
                                        )} />
                                        <CardTitle className="text-sm font-bold text-white truncate max-w-[150px]">
                                            {scene.title}
                                        </CardTitle>
                                    </div>
                                    {selectedSceneIds.includes(scene.id) && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                                <CardDescription className="text-[10px] uppercase font-black tracking-widest text-gray-400">
                                    {scene.requiredCharacters.length} personnages
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {scene.requiredCharacters.map((char: any) => {
                                        const isMissing = scene.missingCharacters.some((m: any) => m.id === char.id);
                                        return (
                                            <Badge
                                                key={char.id}
                                                variant="outline"
                                                className={cn(
                                                    "text-[8px] px-1.5 py-0 leading-none h-4 rounded-full border-white/10",
                                                    isMissing ? "bg-black/40 text-gray-600 line-through" : "bg-white/10 text-white"
                                                )}
                                            >
                                                {char.name}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Right: Planning Playlist */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl sticky top-24 border-2">
                    <CardHeader className="p-6 border-b border-white/5">
                        <h2 className="text-xl font-extrabold text-white tracking-tight leading-loose">Planifiez votre<br />séance</h2>
                        <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest leading-none mb-1">Étape 1</p>
                        <p className="text-white text-sm font-bold">Sélectionnez les scènes</p>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            {selectedScenesData.length === 0 ? (
                                <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <Plus className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 font-medium px-10 leading-relaxed text-balance text-center">Sélectionnez des scènes à gauche pour commencer.</p>
                                </div>
                            ) : (
                                selectedScenesData.map((scene: any, index) => (
                                    <div key={scene.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 group">
                                        <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                            {index + 1}
                                        </div>
                                        <span className="text-sm font-bold text-white flex-1 truncate">{scene.title}</span>
                                        <button
                                            onClick={() => toggleSceneSelection(scene.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all font-bold text-xs"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {selectedScenesData.length > 0 && (
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full mt-6 rounded-2xl py-7 bg-primary hover:bg-primary/80 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95"
                            >
                                {isSaving ? "Préparation..." : "Commencer la planification"}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
