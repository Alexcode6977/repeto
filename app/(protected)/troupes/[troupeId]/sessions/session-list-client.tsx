'use client';

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface SessionListClientProps {
    sessions: any[];
    troupeId: string;
    isAdmin: boolean;
}

export function SessionListClient({ sessions, troupeId, isAdmin }: SessionListClientProps) {
    const searchParams = useSearchParams();
    const view = searchParams.get('view');
    const now = new Date();

    // Filter by view if specified
    const filteredSessions = sessions.filter(s => {
        const hasPlan = s.session_plans && s.session_plans.selected_scenes?.length > 0;
        if (view === 'prep') return !hasPlan;
        if (view === 'live') return hasPlan;
        return true;
    });

    // Upcoming: Closest first (Ascending order)
    const upcoming = filteredSessions
        .filter(s => new Date(s.start_time) >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Past: Most recent first (Descending order)
    const past = filteredSessions
        .filter(s => new Date(s.start_time) < now)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const title = view === 'prep' ? "Sessions à préparer" : view === 'live' ? "Sessions prêtes à jouer" : null;

    return (
        <Tabs defaultValue="upcoming" className="w-full">
            {title && (
                <div className="mb-6 text-center">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest">
                        {title}
                    </Badge>
                </div>
            )}
            <div className="flex justify-center mb-8">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl h-12">
                    <TabsTrigger
                        value="upcoming"
                        className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-widest"
                    >
                        À venir ({upcoming.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="past"
                        className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-bold text-xs uppercase tracking-widest"
                    >
                        Passées ({past.length})
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="upcoming" className="space-y-4 focus-visible:outline-none">
                {upcoming.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <p className="text-gray-500 italic">Aucune séance prévue pour le moment.</p>
                    </div>
                ) : (
                    upcoming.map(session => (
                        <SessionCard key={session.id} session={session} troupeId={troupeId} isAdmin={isAdmin} />
                    ))
                )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4 focus-visible:outline-none">
                {past.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <p className="text-gray-500 italic">Aucun historique de séance.</p>
                    </div>
                ) : (
                    past.map(session => (
                        <SessionCard key={session.id} session={session} troupeId={troupeId} isAdmin={isAdmin} isPast />
                    ))
                )}
            </TabsContent>
        </Tabs>
    );
}

function SessionCard({ session, troupeId, isAdmin, isPast }: { session: any, troupeId: string, isAdmin: boolean, isPast?: boolean }) {
    const hasPlan = session.session_plans && session.session_plans.selected_scenes?.length > 0;
    const date = new Date(session.start_time);

    return (
        <Card className={cn(
            "bg-white/5 border-white/10 backdrop-blur-sm hover:border-white/20 transition-all group overflow-hidden relative",
            isPast && "opacity-75 hover:opacity-100"
        )}>
            <div className="flex items-center justify-between p-6">
                <Link href={`/troupes/${troupeId}/sessions/${session.id}`} className="flex items-center gap-6 flex-1 min-w-0">
                    {/* Date Block */}
                    <div className="text-center min-w-[60px] p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-primary/30 transition-colors">
                        <p className="text-[10px] uppercase font-black text-gray-500 leading-none mb-1">
                            {date.toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                        <p className="text-2xl font-black text-white leading-none">
                            {date.getDate()}
                        </p>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors truncate">
                                {session.title || "Répétition"}
                            </h3>
                            {hasPlan ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[9px] px-1.5 py-0 shrink-0">Prête</Badge>
                            ) : (
                                !isPast && <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0 shrink-0">À Préparer</Badge>
                            )}
                        </div>
                        <p className="text-sm font-medium text-gray-500 flex items-center gap-2 truncate">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {session.plays?.title || "Aucune pièce associée"}
                        </p>
                    </div>
                </Link>

                <div className="flex items-center gap-4 ml-4">
                    {hasPlan && (
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden lg:block">
                                <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest leading-none mb-1">Programme fixé</p>
                                <p className="text-white font-bold text-xs leading-none">{session.session_plans.selected_scenes.length} scènes</p>
                            </div>
                            <Button asChild size="sm" className="rounded-xl bg-primary hover:bg-primary/80 text-white font-black text-[10px] uppercase tracking-widest px-4 h-9 shadow-lg shadow-primary/20 transition-all active:scale-95">
                                <Link href={`/troupes/${troupeId}/sessions/${session.id}/live`}>
                                    Ouvrir la Séance
                                </Link>
                            </Button>
                        </div>
                    )}
                    <Link href={`/troupes/${troupeId}/sessions/${session.id}`} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </Card>
    );
}
