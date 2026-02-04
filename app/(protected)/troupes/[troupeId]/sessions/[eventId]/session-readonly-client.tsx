'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Play, Users, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateSessionStatus } from "@/lib/actions/session";
import { useState } from "react";
import { SessionPlanStructure, SessionSegment } from "@/lib/types";

import { SessionComposition } from "./components/session-composition";
import { createActorMap, calculateSessionWorkload } from "@/lib/utils/session-calculations";

interface SessionReadOnlyClientProps {
    sessionData: any;
    troupeId: string;
    isDirector: boolean;
    members: any[];
    guests: any[];
}

export function SessionReadOnlyClient({ sessionData, troupeId, isDirector, members, guests }: SessionReadOnlyClientProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const plan = sessionData.session_plans?.[0] || sessionData.session_plans;

    // Support new structure with fallback to old
    const structure = plan?.plan_structure as SessionPlanStructure | undefined;
    const segments = structure?.segments || [];
    const generalNotes = structure?.objective || plan?.general_notes;

    // Legacy fallback
    const legacyScenes = !structure && plan?.selected_scenes ? plan.selected_scenes : [];

    const attendance = sessionData.event_attendance || [];

    // --- Detailed Presence & Workload Logic ---
    const attendanceMap: Record<string, string> = {};
    attendance.forEach((a: any) => {
        const id = a.user_id || a.guest_id;
        if (id) attendanceMap[id] = a.status;
    });

    const plays = sessionData.plays || [];

    // 1. Actor Map
    const actorMap = createActorMap(plays, members, guests);

    // 2. Workload
    const workload = calculateSessionWorkload(structure?.segments || [], plays, actorMap);

    const presentCount = attendance.filter((a: any) => a.status === 'present').length;
    const absentCount = attendance.filter((a: any) => a.status === 'absent').length;
    const unknownCount = attendance.filter((a: any) => !a.status || a.status === 'unknown').length;

    const handleStartSession = async () => {
        setIsLoading(true);
        try {
            await updateSessionStatus(sessionData.id, 'upcoming');
            router.push(`/troupes/${troupeId}/sessions/${sessionData.id}/live`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-10 max-w-5xl mx-auto pb-20">
            {/* Header / Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/40 pb-8">
                <div className="space-y-4">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 text-xs uppercase tracking-widest font-bold">
                        À VENIR
                    </Badge>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-2">{sessionData.title || "Séance de répétition"}</h1>
                        <div className="flex flex-wrap items-center gap-6 text-muted-foreground text-sm font-medium">
                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> {new Date(sessionData.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {new Date(sessionData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {sessionData.location && <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {sessionData.location}</span>}
                        </div>
                    </div>
                </div>

                {isDirector && (
                    <Button
                        size="lg"
                        onClick={handleStartSession}
                        disabled={isLoading}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 rounded-full px-8 h-12 text-base transition-all hover:scale-105 active:scale-95"
                    >
                        <Play className="w-5 h-5 mr-2 fill-current" />
                        Lancer le Live
                    </Button>
                )}
            </div>

            {/* Objective & Attendance Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Objective */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" /> Objectif de la séance
                    </h3>
                    <div className="bg-muted/10 border border-border/50 rounded-2xl p-6">
                        <p className="text-foreground/90 text-lg font-medium leading-relaxed whitespace-pre-line italic">
                            {generalNotes || "Aucun objectif spécifique défini pour cette séance."}
                        </p>
                    </div>
                </div>

                {/* Attendance Summary */}
                {/* Attendance Summary - REPLACED WITH DETAILED COMPOSITION */}
                <div className="space-y-2">
                    <SessionComposition
                        members={members}
                        guests={guests}
                        attendance={attendanceMap}
                        workload={workload}
                    />
                </div>
            </div>

            {/* Program Content */}
            <div className="space-y-8 pt-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary" />
                        Au Programme
                    </h2>
                    <div className="h-px bg-border/50 flex-1" />
                </div>

                {segments.length > 0 ? (
                    <div className="space-y-12">
                        {segments.map((segment: SessionSegment, idx) => (
                            <div key={idx} className="space-y-6">
                                {/* Play Header */}
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-black border border-primary/20">
                                            {idx + 1}
                                        </span>
                                        {segment.playTitle}
                                    </h3>
                                    {segment.segmentNote ? (
                                        <p className="text-base text-muted-foreground italic pl-[3.25rem] border-l-2 border-primary/20 ml-4 py-1">
                                            {segment.segmentNote}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground pl-[3.25rem] opacity-50">Aucune consigne spécifique.</p>
                                    )}


                                    {/* Character Notes / Remarks */}
                                    {segment.characterNotes && Object.keys(segment.characterNotes).length > 0 && (
                                        <div className="pl-[3.25rem] ml-4 mt-2 space-y-2">
                                            {Object.entries(segment.characterNotes).map(([charId, note]) => {
                                                const character = plays.find((p: any) => p.id === segment.playId)?.play_characters?.find((c: any) => c.id === charId);
                                                const charName = character?.name || "Personnage inconnu";

                                                // Find actor for this character
                                                const actor = actorMap[charId];
                                                const actorName = actor ? (actor.first_name || actor.name || "Inconnu") : "Non attribué";

                                                return (
                                                    <div key={charId} className="text-sm bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-lg p-2 flex gap-2 items-start max-w-xl">
                                                        <span className="font-bold whitespace-nowrap text-xs uppercase tracking-wider mt-0.5">{actorName} ({charName}):</span>
                                                        <span className="italic">{note as string}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Scenes List */}
                                <div className="grid gap-3 pl-0 md:pl-[3.25rem]">
                                    {segment.scenes.map((scene, sIdx) => {
                                        const sceneNote = scene.note || scene.description; // Depending on where the note is stored in the scene object
                                        return (
                                            <div key={sIdx} className="group relative bg-card/50 hover:bg-muted/50 border border-border/50 hover:border-primary/20 rounded-xl p-4 transition-all duration-300">
                                                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Badge variant="outline" className="bg-background/50 font-mono text-xs opacity-70">
                                                            SCÈNE {sIdx + 1}
                                                        </Badge>
                                                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                                            {scene.title}
                                                        </span>
                                                    </div>

                                                    {sceneNote && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground italic max-w-lg text-right">
                                                            {sceneNote}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Legacy View */
                    <div className="grid gap-3">
                        {legacyScenes.map((scene: any, idx: number) => (
                            <Card key={idx} className="overflow-hidden hover:bg-muted/50 transition-colors border border-border/50">
                                <div className="p-4 flex items-center gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-4 ring-background/50">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="font-bold text-foreground truncate">{scene.title}</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground/80 line-clamp-1">{typeof scene === 'string' ? "Scène" : scene.summary || "Pas de résumé"}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
