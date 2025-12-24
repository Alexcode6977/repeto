'use client';

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SessionListClientProps {
    sessions: any[];
    troupeId: string;
    isAdmin: boolean;
}

export function SessionListClient({ sessions, troupeId, isAdmin }: SessionListClientProps) {
    const now = new Date();

    // Upcoming: Closest first (Ascending order)
    const upcoming = sessions
        .filter(s => new Date(s.start_time) >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Past: Most recent first (Descending order)
    const past = sessions
        .filter(s => new Date(s.start_time) < now)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return (
        <Tabs defaultValue="upcoming" className="w-full">
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
            "bg-white/5 border-white/10 backdrop-blur-sm hover:border-white/20 transition-all group overflow-hidden",
            isPast && "opacity-75 hover:opacity-100"
        )}>
            <Link href={`/troupes/${troupeId}/sessions/${session.id}`} className="block p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {/* Date Block */}
                        <div className="text-center min-w-[60px] p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-primary/30 transition-colors">
                            <p className="text-[10px] uppercase font-black text-gray-500 leading-none mb-1">
                                {date.toLocaleDateString('fr-FR', { month: 'short' })}
                            </p>
                            <p className="text-2xl font-black text-white leading-none">
                                {date.getDate()}
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                                    {session.title || "Répétition"}
                                </h3>
                                {hasPlan ? (
                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[9px] px-1.5 py-0">Planifié</Badge>
                                ) : (
                                    !isPast && <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">À Planifier</Badge>
                                )}
                            </div>
                            <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {session.plays?.title || "Aucune pièce associée"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {hasPlan && (
                            <div className="text-right hidden md:block">
                                <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Contenu</p>
                                <p className="text-white font-bold text-xs">{session.session_plans.selected_scenes.length} scènes prévues</p>
                            </div>
                        )}
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </Link>
        </Card>
    );
}
