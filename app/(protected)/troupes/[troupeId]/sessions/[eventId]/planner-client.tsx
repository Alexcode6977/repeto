'use client';

import { useState, useMemo, useEffect } from "react";
import { Reorder } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle, Save, Calendar, Clock, Trash2 } from "lucide-react";
import { saveSessionPlan } from "@/lib/actions/session";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SessionComposition } from "./components/session-composition";
import { SessionSegmentBuilder } from "./components/session-segment-builder";
import { SessionPlanStructure, SessionSegment } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createActorMap, calculateSessionWorkload } from "@/lib/utils/session-calculations";

interface PlannerProps {
    sessionData: any;
    troupeId: string;
    members: any[];
    guests: any[];
}

export function SessionPlannerClient({ sessionData, troupeId, members, guests }: PlannerProps) {
    const router = useRouter();
    const plays = sessionData.plays || [];
    const attendanceRecords = sessionData.event_attendance || [];
    const existingPlan = sessionData.session_plans;



    // --- State ---
    const [status, setStatus] = useState<'preparation' | 'upcoming' | 'processing' | 'validated'>(existingPlan?.status || 'preparation');
    const [isSaving, setIsSaving] = useState(false);

    // Plan Structure State
    const [title, setTitle] = useState(sessionData.title || "");
    const [objective, setObjective] = useState<string>("");
    const [segments, setSegments] = useState<SessionSegment[]>([]);

    // Initialize state from DB if exists
    useEffect(() => {
        if (existingPlan?.plan_structure) {
            const structure = existingPlan.plan_structure as SessionPlanStructure;
            setObjective(structure.objective || "");
            setSegments(structure.segments || []);
        } else if (existingPlan?.selected_scenes) {
            // Fallback: Convert old linear list to a single segment if possible (or multiple if mixed plays)
            // For now, let's just leave empty or try to group by play
            // Simplified: just start fresh or manual migration if needed
        }
    }, [existingPlan]);

    // --- Derived Data ---

    const uniquePlays = useMemo(() => {
        const map = new Map<string, any>();
        plays.forEach((play: any) => {
            if (play?.id && !map.has(play.id)) {
                map.set(play.id, play);
            }
        });
        return Array.from(map.values());
    }, [plays]);

    // Map: UserId -> Attendance Status
    const attendanceMap = useMemo(() => {
        const map: Record<string, string> = {};
        attendanceRecords.forEach((a: any) => {
            const id = a.user_id || a.guest_id;
            if (id) map[id] = a.status;
        });
        return map;
    }, [attendanceRecords]);

    // Map: CharacterId -> Actor (User/Guest Object)
    const actorMap = useMemo(() => {
        return createActorMap(plays, members, guests);
    }, [plays, members, guests]);


    // Workload Calculation (Presence Ratio)
    const workload = useMemo(() => {
        return calculateSessionWorkload(segments, plays, actorMap);
    }, [segments, plays, actorMap]);


    // --- Handlers ---

    const handleAddSegment = (playId: string) => {
        const play = plays.find((p: any) => p.id === playId);
        if (!play) return;

        const newSegment: SessionSegment = {
            playId: play.id,
            playTitle: play.title,
            segmentNote: "",
            characterNotes: {},
            scenes: []
        };

        setSegments([...segments, newSegment]);
    };

    const handleUpdateSegment = (index: number, updated: SessionSegment) => {
        const newSegments = [...segments];
        newSegments[index] = updated;
        setSegments(newSegments);
    };

    const handleDeleteSegment = (index: number) => {
        const newSegments = [...segments];
        newSegments.splice(index, 1);
        setSegments(newSegments);
    };

    const handleSave = async (newStatus: 'preparation' | 'upcoming' = 'preparation') => {
        setIsSaving(true);
        try {
            const structure: SessionPlanStructure = {
                objective,
                segments
            };

            // Flatten scenes for legacy compatibility / search
            const allSelectedScenes: any[] = [];
            segments.forEach(s => {
                s.scenes.forEach(sc => {
                    allSelectedScenes.push({
                        id: sc.id,
                        // We could pass objective here if we wanted to map stricture back to flat, 
                        // but managing duality is hard. Let's trust structure.
                    });
                });
            });

            await saveSessionPlan(
                sessionData.id,
                allSelectedScenes,
                objective, // Using general_notes column for objective mainly
                newStatus,
                structure,
                title
            );

            setStatus(newStatus);
            // router.refresh(); // Or handle UI update
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la sauvegarde");
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Header / Composition Area */}
            <div className="lg:col-span-12 space-y-6">
                <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Titre de la séance</Label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-3xl font-black h-auto px-4 py-2"
                        placeholder="Titre de la séance"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Objectives */}
                    <Card className="lg:col-span-2 border-border/50 bg-muted/5">
                        <CardHeader className="uppercase text-xs font-bold text-muted-foreground tracking-widest pb-2">
                            Objectif de la séance
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Quel est le but principal de cette répétition ?"
                                value={objective}
                                onChange={(e) => setObjective(e.target.value)}
                                className="bg-background text-lg min-h-[120px] resize-none border-border"
                            />
                        </CardContent>
                    </Card>

                    {/* Right: Composition */}
                    <div className="lg:col-span-1">
                        <SessionComposition
                            members={members}
                            guests={guests}
                            attendance={attendanceMap}
                            workload={workload}
                        />
                    </div>
                </div>
            </div>

            {/* Main Builder Area */}
            <div className="lg:col-span-12 space-y-12 mt-8">
                <div className="header-divider flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Programme de la séance
                    </h2>
                    <div className="h-px bg-border flex-1" />
                </div>

                <div className="space-y-8">
                    {/* List of Segments */}
                    <Reorder.Group axis="y" values={segments} onReorder={setSegments} className="space-y-8">
                        {segments.map((segment, idx) => {
                            const play = plays.find((p: any) => p.id === segment.playId);
                            if (!play) return null;

                            return (
                                <Reorder.Item key={idx} value={segment} className="relative">
                                    {/* Ideally create a unique ID for segment to use as key/value properly */}
                                    {/* Note: using idx for key in Reorder.Group map is risky if reordering, 
                                     but since we just render builder, we rely on state order. 
                                     Ideally segments should have IDs. */}
                                    <SessionSegmentBuilder
                                        segment={segment}
                                        play={play}
                                        attendance={attendanceMap}
                                        actorMap={actorMap}
                                        onUpdate={(updated) => handleUpdateSegment(idx, updated)}
                                        onDelete={() => handleDeleteSegment(idx)}
                                    />
                                </Reorder.Item>
                            );
                        })}
                    </Reorder.Group>

                    {/* Add Segment Button */}
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-card/50 hover:bg-card transition-colors gap-4">
                        <p className="text-sm font-bold text-muted-foreground">Ajouter une pièce au programme</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {uniquePlays.map((play: any) => (
                                <Button
                                    key={play.id}
                                    variant="outline"
                                    onClick={() => handleAddSegment(play.id)}
                                    className="rounded-full"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {play.title}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="lg:col-span-12 mt-8 p-4 md:p-6 bg-muted/30 rounded-2xl border border-border">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="hidden md:block">
                        <p className="font-bold text-sm">
                            {segments.length} segments • {segments.reduce((acc, s) => acc + s.scenes.length, 0)} scènes
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isSaving ? "Sauvegarde..." : (status === 'upcoming' ? "Publié et visible" : "Brouillon non visible")}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button
                            variant="secondary"
                            onClick={() => handleSave('preparation')}
                            disabled={isSaving}
                            className="flex-1 md:flex-none font-bold rounded-full h-12"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Sauvegarder
                        </Button>

                        <Button
                            onClick={() => handleSave('upcoming')}
                            disabled={isSaving}
                            className={cn(
                                "flex-1 md:flex-none font-bold rounded-full h-12",
                                status === 'upcoming' ? "bg-green-600 hover:bg-green-700" : ""
                            )}
                        >
                            {status === 'upcoming' ? (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mettre à jour
                                </>
                            ) : (
                                "Publier"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
