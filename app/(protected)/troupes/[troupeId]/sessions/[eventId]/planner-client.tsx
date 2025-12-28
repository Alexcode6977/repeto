'use client';

import { useState, useMemo } from "react";
import { Reorder } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Users, Plus, Trash2, Info, MessageSquare, User, ChevronDown, ChevronUp, Play, GripVertical, X, FileText } from "lucide-react";
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
    const plays = sessionData.plays || [];
    const attendance = sessionData.event_attendance || [];
    const initialPlan = sessionData.session_plans || { selected_scenes: [], general_notes: "" };

    const [selectedPlayId, setSelectedPlayId] = useState<string>(plays[0]?.id || "");
    const selectedPlay = useMemo(() => plays.find((p: any) => p.id === selectedPlayId), [plays, selectedPlayId]);

    // Normalize IDs from potential object structure
    const initialIds = (initialPlan.selected_scenes || []).map((s: any) => typeof s === 'string' ? s : s.id);

    const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>(initialIds);
    const [generalNotes, setGeneralNotes] = useState(initialPlan.general_notes || "");
    const [isSaving, setIsSaving] = useState(false);
    const [filterMagic, setFilterMagic] = useState(false);
    const [focusActorId, setFocusActorId] = useState<string | null>(null);
    const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);

    // Collect all play characters for easy lookup
    const allPlayCharacters = useMemo(() => {
        return plays.flatMap((p: any) => p.play_characters || []);
    }, [plays]);

    // Initial objectives from plan
    const [scenesWithObjectives, setScenesWithObjectives] = useState<any[]>(() => {
        return (initialPlan.selected_scenes || []).map((s: any) => ({
            id: typeof s === 'string' ? s : s.id,
            objective: s.objective || "",
            characterObjectives: s.characterObjectives || []
        }));
    });

    // 1. Identify who is present
    const presentIds = useMemo(() => {
        return new Set<string>(
            attendance
                .filter((a: any) => a.status === 'present')
                .map((a: any) => a.user_id || a.guest_id)
        );
    }, [attendance]);

    // Performance Projection Logic
    const performanceProjections = useMemo(() => {
        const stats: Record<string, number> = {}; // actorId -> lineCount

        selectedSceneIds.forEach(sceneId => {
            const play = plays.find((p: any) => (p.play_scenes || []).some((s: any) => s.id === sceneId));
            if (!play) return;

            const lineStats = play.lineStats || [];
            const sceneLines = lineStats.filter((ls: any) => ls.scene_id === sceneId);

            sceneLines.forEach((ls: any) => {
                const character = (play.play_characters || []).find((c: any) => c.id === ls.character_id);
                if (!character) return;

                const actorId = character.actor_id || character.guest_id;
                if (!actorId) return;

                stats[actorId] = (stats[actorId] || 0) + (ls.line_count || 0);
            });
        });

        return stats;
    }, [selectedSceneIds, plays]);

    // Coaching Advice Logic
    const coachMessages = useMemo(() => {
        if (selectedSceneIds.length === 0) return [];
        const messages: string[] = [];
        const counts = Object.values(performanceProjections);
        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

        Object.entries(performanceProjections).forEach(([actorId, count]) => {
            const member = members.find((m: any) => (m.user_id || m.id) === actorId);
            const guest = guests.find((g: any) => g.id === actorId);
            const name = member ? member.profiles?.first_name || member.profiles?.email : guest?.name || "Inconnu";

            if (count > avg * 1.5 && count > 20) {
                messages.push(`Attention, ${name} est très sollicité (${count} répliques).`);
            } else if (count < avg * 0.5 && count > 0) {
                messages.push(`${name} pourrait travailler davantage (seulement ${count} répliques).`);
            }
        });

        // Add advice for present members NOT in any selected scene
        presentIds.forEach((presentId: string) => {
            if (!performanceProjections[presentId]) {
                const member = members.find((m: any) => (m.user_id || m.id) === presentId);
                const guest = guests.find((g: any) => g.id === presentId);
                const name = member ? member.profiles?.first_name || member.profiles?.email : guest?.name || "Inconnu";
                messages.push(`${name} est présent mais n'apparaît dans aucune scène sélectionnée.`);
            }
        });

        if (messages.length === 0) {
            messages.push("Votre séance semble bien équilibrée !");
        }

        return messages;
    }, [performanceProjections, members, guests, selectedSceneIds, presentIds]);

    // 2. Scene Matching Logic (for the selected play)
    const scenesWithMetadata = useMemo(() => {
        if (!selectedPlay?.play_scenes) return [];

        return selectedPlay.play_scenes.map((scene: any) => {
            const requiredCharIds = scene.scene_characters?.map((sc: any) => sc.character_id) || [];
            const requiredCharacters = selectedPlay.play_characters.filter((pc: any) => requiredCharIds.includes(pc.id));

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
                playTitle: selectedPlay.title,
                isPlayable,
                isIncomplete,
                isUnplayable,
                requiredCharacters,
                missingCharacters
            };
        });
    }, [selectedPlay, presentIds]);

    // Get list of present actors for filter dropdown
    const presentActors = useMemo(() => {
        const actors: { id: string; name: string }[] = [];
        attendance.filter((a: any) => a.status === 'present').forEach((a: any) => {
            const actorId = a.user_id || a.guest_id;
            const member = members.find((m: any) => (m.user_id || m.id) === actorId);
            const guest = guests.find((g: any) => g.id === actorId);
            const name = member ? member.profiles?.first_name || member.profiles?.email : guest?.name || "Inconnu";
            if (actorId) actors.push({ id: actorId, name });
        });
        return actors;
    }, [attendance, members, guests]);

    const filteredScenes = useMemo(() => {
        let scenes = scenesWithMetadata;

        // Apply magic filter (playable only)
        if (filterMagic) {
            scenes = scenes.filter((s: any) => s.isPlayable);
        }

        // Apply focus actor filter
        if (focusActorId) {
            scenes = scenes.filter((s: any) => {
                return s.requiredCharacters.some((char: any) => {
                    const actorId = char.actor_id || char.guest_id;
                    return actorId === focusActorId;
                });
            });
        }

        return scenes;
    }, [scenesWithMetadata, filterMagic, focusActorId]);

    const handleSave = async (shouldLaunch = false) => {
        setIsSaving(true);
        try {
            await saveSessionPlan(sessionData.id, scenesWithObjectives, generalNotes);
            if (shouldLaunch) {
                router.push(`/troupes/${troupeId}/sessions/${sessionData.id}/live`);
            } else {
                alert("Préparation enregistrée !");
            }
        } catch (error) {
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

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

    const toggleSceneSelection = (id: string) => {
        setSelectedSceneIds(prev => {
            const isSelected = prev.includes(id);
            if (isSelected) {
                setScenesWithObjectives(so => so.filter(s => s.id !== id));
                return prev.filter(sid => sid !== id);
            } else {
                setScenesWithObjectives(so => [...so, { id, objective: "", characterObjectives: [] }]);
                return [...prev, id];
            }
        });
    };

    const selectedScenesData = useMemo(() => {
        return selectedSceneIds.map(id => {
            // Find scene in ANY play
            for (const p of plays) {
                const found = (p.play_scenes || []).find((s: any) => s.id === id);
                if (found) return { ...found, playTitle: p.title };
            }
            return null;
        }).filter(Boolean);
    }, [selectedSceneIds, plays]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left: Matching Grid */}
            <div className="lg:col-span-6 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                            <Users className="w-6 h-6 text-primary" />
                            Préparation des scènes
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {plays.map((p: any) => (
                                <Button
                                    key={p.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedPlayId(p.id)}
                                    className={cn(
                                        "rounded-xl text-xs font-bold px-4 py-2 h-auto border transition-all",
                                        selectedPlayId === p.id
                                            ? "bg-primary/20 text-primary border-primary/50"
                                            : "text-muted-foreground border-border hover:bg-muted"
                                    )}
                                >
                                    {p.title}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Focus Actor Filter */}
                        <div className="flex items-center gap-2">
                            <Select
                                value={focusActorId || "all"}
                                onValueChange={(v) => setFocusActorId(v === "all" ? null : v)}
                            >
                                <SelectTrigger className="w-[160px] bg-muted/50 border-border text-xs font-bold rounded-xl h-9">
                                    <User className="w-3 h-3 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Focus acteur" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les acteurs</SelectItem>
                                    {presentActors.map(actor => (
                                        <SelectItem key={actor.id} value={actor.id}>
                                            {actor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {focusActorId && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setFocusActorId(null)}
                                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        {/* Magic Filter */}
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFilterMagic(false)}
                                className={cn("rounded-lg text-[10px] uppercase font-bold px-3", !filterMagic && "bg-primary text-primary-foreground hover:bg-primary")}
                            >
                                Toutes
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFilterMagic(true)}
                                className={cn("rounded-lg text-[10px] uppercase font-bold px-3", filterMagic && "bg-green-500 text-foreground hover:bg-green-500")}
                            >
                                Jouables
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredScenes.map((scene: any) => (
                        <Card
                            key={scene.id}
                            onClick={() => toggleSceneSelection(scene.id)}
                            className={cn(
                                "cursor-pointer transition-all border-border relative overflow-hidden group",
                                selectedSceneIds.includes(scene.id) ? "ring-2 ring-primary border-primary/50" : "hover:border-primary/20 bg-card",
                                scene.isPlayable ? "hover:bg-green-500/5" : (scene.isUnplayable ? "opacity-40 grayscale" : "opacity-80")
                            )}
                        >
                            {scene.isUnplayable && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                                    <div className="bg-red-500 text-foreground text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-xl rotate-[-5deg] border-2 border-white/10">
                                        {scene.missingCharacters.length} absents
                                    </div>
                                </div>
                            )}
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            scene.isPlayable ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                                scene.isIncomplete ? "bg-orange-500" : "bg-red-500"
                                        )} />
                                        <CardTitle className="text-sm font-bold text-foreground truncate max-w-[150px]">
                                            {scene.title}
                                        </CardTitle>
                                    </div>
                                    {selectedSceneIds.includes(scene.id) && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                                <CardDescription className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex justify-between items-center">
                                    <span>{scene.requiredCharacters.length} personnages</span>
                                    {scene.lineStats && (
                                        <span className="text-primary/60">
                                            {scene.lineStats.reduce((acc: number, curr: any) => acc + (curr.line_count || 0), 0)} répliques
                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                                {scene.summary && (
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 italic leading-relaxed">
                                        "{scene.summary}"
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-1">
                                    {scene.requiredCharacters.map((char: any) => {
                                        const isMissing = scene.missingCharacters.some((m: any) => m.id === char.id);
                                        return (
                                            <Badge
                                                key={char.id}
                                                variant="outline"
                                                className={cn(
                                                    "text-[8px] px-1.5 py-0 leading-none h-4 rounded-full border-border",
                                                    isMissing ? "bg-muted/50 text-muted-foreground/40 line-through" : "bg-muted text-foreground"
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
            <div className="lg:col-span-6 space-y-6">

                {/* 1. Projections de Prestation */}
                {/* 1. Projections de Prestation & Conseils du Coach */}
                {selectedSceneIds.length > 0 && (
                    <div className="space-y-4">
                        <Card className="bg-muted/30 border-border backdrop-blur-xl border-2">
                            <CardHeader className="p-4 border-b border-border">
                                <h3 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Temps de prestation prévu</h3>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                {Object.entries(performanceProjections).map(([actorId, lineCount]) => {
                                    const member = members.find((m: any) => m.user_id === actorId);
                                    const guest = guests.find((g: any) => g.id === actorId);
                                    const name = member ? member.profiles?.first_name || member.profiles?.email : guest?.name || "Inconnu";

                                    return (
                                        <div key={actorId} className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground font-medium">{name}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] font-bold border-border bg-muted/50">
                                                    {lineCount} répliques
                                                </Badge>
                                                <span className="text-muted-foreground/60 font-bold">~{Math.round(lineCount * 0.3)} min</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Conseils du Coach */}
                        <Card className="bg-primary/5 border-primary/20 backdrop-blur-xl border-2 overflow-hidden">
                            <CardHeader className="p-4 bg-primary/10 border-b border-primary/10">
                                <h3 className="text-[10px] uppercase font-black text-primary tracking-widest flex items-center gap-2">
                                    <Info className="w-3 h-3" /> Conseils du Coach
                                </h3>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                {coachMessages.map((msg, i) => (
                                    <p key={i} className="text-[11px] font-medium text-foreground/80 leading-relaxed italic">
                                        • {msg}
                                    </p>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Card className="bg-card border-border backdrop-blur-xl sticky top-24 border-2">
                    <CardHeader className="p-6 border-b border-border">
                        <h2 className="text-xl font-extrabold text-foreground tracking-tight leading-loose">Planifiez votre<br />séance</h2>
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Résumé & Objectifs</p>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* General Notes Section */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                Notes générales de séance
                            </label>
                            <textarea
                                placeholder="Objectifs généraux, points d'attention, consignes pour tous..."
                                value={generalNotes}
                                onChange={(e) => setGeneralNotes(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/30 transition-all resize-none min-h-[80px]"
                            />
                        </div>

                        <Reorder.Group
                            axis="y"
                            values={selectedSceneIds}
                            onReorder={setSelectedSceneIds}
                            className="space-y-4"
                        >
                            {selectedScenesData.length === 0 ? (
                                <div className="py-10 text-center border-2 border-dashed border-border rounded-3xl">
                                    <Plus className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground font-medium px-10 leading-relaxed text-balance text-center">Sélectionnez des scènes à gauche pour commencer.</p>
                                </div>
                            ) : (
                                selectedScenesData.map((scene: any, index) => {
                                    const isExpanded = expandedSceneId === scene.id;
                                    const sceneObj = scenesWithObjectives.find(s => s.id === scene.id);

                                    return (
                                        <Reorder.Item
                                            key={scene.id}
                                            value={scene.id}
                                            className={cn(
                                                "flex flex-col gap-3 p-4 rounded-2xl bg-muted/30 border border-border group relative transition-all",
                                                isExpanded && "border-primary/50 bg-primary/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
                                                    <GripVertical className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedSceneId(isExpanded ? null : scene.id)}>
                                                    <span className="text-sm font-bold text-foreground block truncate">{scene.title}</span>
                                                    <span className="text-[9px] uppercase font-black text-muted-foreground block">{scene.playTitle}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleSceneSelection(scene.id);
                                                        }}
                                                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <div className="cursor-pointer p-1" onClick={() => setExpandedSceneId(isExpanded ? null : scene.id)}>
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[8px] uppercase font-black text-primary tracking-widest flex items-center gap-1">
                                                            <MessageSquare className="w-2.5 h-2.5" /> Objectif Global
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ex: Rythme et silences..."
                                                            value={sceneObj?.objective || ""}
                                                            onChange={(e) => handleUpdateSceneObjective(scene.id, e.target.value)}
                                                            className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/30 transition-all font-medium"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[8px] uppercase font-black text-gray-500 tracking-widest flex items-center gap-1">
                                                            <User className="w-2.5 h-2.5" /> Par personnage
                                                        </label>
                                                        <div className="space-y-2">
                                                            {scene.scene_characters?.map((sc: any) => {
                                                                const char = allPlayCharacters.find((c: any) => c.id === sc.character_id);
                                                                if (!char) return null;
                                                                const charObj = sceneObj?.characterObjectives?.find((co: any) => co.id === char.id)?.objective || "";

                                                                return (
                                                                    <div key={char.id} className="space-y-1">
                                                                        <span className="text-[9px] font-bold text-muted-foreground block">{char.name}</span>
                                                                        <input
                                                                            type="text"
                                                                            placeholder={`Focaliser sur...`}
                                                                            value={charObj}
                                                                            onChange={(e) => handleUpdateCharacterObjective(scene.id, char.id, e.target.value)}
                                                                            className="w-full bg-background/50 border border-border rounded-lg px-3 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/20 transition-all"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Reorder.Item>
                                    );
                                })
                            )}
                        </Reorder.Group>

                        {selectedScenesData.length > 0 && (
                            <div className="sticky bottom-0 -mx-6 -mb-6 p-6 bg-gradient-to-t from-background/95 via-background/90 to-transparent backdrop-blur-sm pt-10 mt-6 rounded-b-3xl border-t border-border space-y-3">
                                <Button
                                    onClick={() => handleSave(true)}
                                    disabled={isSaving}
                                    className="w-full rounded-2xl py-7 bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95"
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    {isSaving ? "Chargement..." : "Ouvrir la Séance"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSave(false)}
                                    disabled={isSaving}
                                    className="w-full rounded-xl py-4 text-gray-500 hover:text-foreground font-bold uppercase text-[9px] tracking-widest transition-all"
                                >
                                    Enregistrer la préparation
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
