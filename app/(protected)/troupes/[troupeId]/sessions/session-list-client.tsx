'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronRight, Calendar, CheckCircle2, Clock, Loader2, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type SessionTab = 'preparation' | 'upcoming' | 'processing' | 'validated';

interface SessionPlan {
    status?: 'preparation' | 'draft' | 'upcoming' | 'published' | 'processing' | 'validated' | null;
    selected_scenes?: Array<{ id: string }> | null;
}

interface SessionPlay {
    title?: string | null;
}

interface SessionItem {
    id: string;
    start_time: string;
    title?: string | null;
    plays?: SessionPlay | SessionPlay[] | null;
    session_plans?: SessionPlan | SessionPlan[] | null;
}

interface SessionListClientProps {
    sessions: SessionItem[];
    troupeId: string;
    isAdmin: boolean;
}

const getSessionPlan = (session: SessionItem): SessionPlan | undefined => {
    if (!session.session_plans) return undefined;
    return Array.isArray(session.session_plans) ? session.session_plans[0] : session.session_plans;
};

const getPlayTitle = (session: SessionItem): string => {
    if (!session.plays) return "Aucune pièce associée";
    if (Array.isArray(session.plays)) return session.plays[0]?.title || "Aucune pièce associée";
    return session.plays.title || "Aucune pièce associée";
};

export function SessionListClient({ sessions, troupeId, isAdmin }: SessionListClientProps) {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab');

    // Categorize sessions based on status
    const preparation = sessions.filter(s => {
        const status = getSessionPlan(s)?.status;
        return !status || status === 'preparation' || status === 'draft';
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const upcoming = sessions.filter(s => {
        const status = getSessionPlan(s)?.status;
        return status === 'upcoming' || status === 'published';
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const processing = sessions.filter(s => {
        const status = getSessionPlan(s)?.status;
        return status === 'processing';
    }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()); // Recent first

    const validated = sessions.filter(s => {
        const status = getSessionPlan(s)?.status;
        return status === 'validated';
    }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()); // Recent first

    return (
        <Tabs defaultValue={activeTab || (upcoming.length > 0 ? "upcoming" : "preparation")} className="w-full relative">
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md mobile-heavy-surface pb-4 pt-2 -mx-4 px-4 md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:m-0 md:mb-8">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl h-12 w-full justify-between items-center shadow-2xl mobile-heavy-surface">
                    {isAdmin && (
                        <TabsTrigger
                            value="preparation"
                            className="flex-1 rounded-xl px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-black text-[10px] uppercase tracking-tighter flex flex-col items-center justify-center gap-0.5"
                        >
                            <Sparkles className="w-3.5 h-3.5 mb-0.5 md:hidden" />
                            <span className="truncate w-full text-center">Préparer</span>
                        </TabsTrigger>
                    )}
                    <TabsTrigger
                        value="upcoming"
                        className="flex-1 rounded-xl px-2 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all font-black text-[10px] uppercase tracking-tighter flex flex-col items-center justify-center gap-0.5"
                    >
                        <Calendar className="w-3.5 h-3.5 mb-0.5 md:hidden" />
                        <span className="truncate w-full text-center">À Venir</span>
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger
                            value="processing"
                            className="flex-1 rounded-xl px-2 py-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all font-black text-[10px] uppercase tracking-tighter flex flex-col items-center justify-center gap-0.5"
                        >
                            <Loader2 className="w-3.5 h-3.5 mb-0.5 md:hidden" />
                            <span className="truncate w-full text-center">Traiter</span>
                        </TabsTrigger>
                    )}
                    <TabsTrigger
                        value="validated"
                        className="flex-1 rounded-xl px-2 py-2 data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all font-black text-[10px] uppercase tracking-tighter flex flex-col items-center justify-center gap-0.5"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 mb-0.5 md:hidden" />
                        <span className="truncate w-full text-center">Validées</span>
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* 1. PREPARATION */}
            {isAdmin && (
                <TabsContent value="preparation" className="space-y-4 focus-visible:outline-none animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                    <EmptyState
                        list={preparation}
                        message="Aucune séance en préparation."
                        icon={Sparkles}
                    />
                    {preparation.map(session => (
                        <SessionCard key={session.id} session={session} troupeId={troupeId} status="preparation" isAdmin={isAdmin} />
                    ))}
                </TabsContent>
            )}

            {/* 2. UPCOMING */}
            <TabsContent value="upcoming" className="space-y-4 focus-visible:outline-none animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                <EmptyState
                    list={upcoming}
                    message="Aucune séance planifiée prochainement."
                    icon={Calendar}
                />
                {upcoming.map(session => (
                    <SessionCard key={session.id} session={session} troupeId={troupeId} status="upcoming" isAdmin={isAdmin} />
                ))}
            </TabsContent>

            {/* 3. PROCESSING */}
            {isAdmin && (
                <TabsContent value="processing" className="space-y-4 focus-visible:outline-none animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                    <EmptyState
                        list={processing}
                        message="Aucune séance en attente de traitement."
                        icon={Loader2}
                    />
                    {processing.map(session => (
                        <SessionCard key={session.id} session={session} troupeId={troupeId} status="processing" isAdmin={isAdmin} />
                    ))}
                </TabsContent>
            )}

            {/* 4. VALIDATED */}
            <TabsContent value="validated" className="space-y-4 focus-visible:outline-none animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                <EmptyState
                    list={validated}
                    message="Historique vide."
                    icon={CheckCircle2}
                />
                {validated.map(session => (
                    <SessionCard key={session.id} session={session} troupeId={troupeId} status="validated" isAdmin={isAdmin} />
                ))}
            </TabsContent>
        </Tabs>
    );
}

function EmptyState({ list, message, icon: Icon }: { list: SessionItem[]; message: string; icon: LucideIcon }) {
    if (list.length > 0) return null;
    return (
        <div className="text-center py-20 bg-muted/5 rounded-3xl border border-dashed border-border/50 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground italic text-sm">{message}</p>
        </div>
    );
}

function SessionCard({ session, troupeId, status, isAdmin }: { session: SessionItem; troupeId: string; status: SessionTab; isAdmin: boolean }) {
    const date = new Date(session.start_time);
    const sceneCount = getSessionPlan(session)?.selected_scenes?.length || 0;

    const statusConfig = {
        preparation: { color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20", label: "En préparation" },
        upcoming: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "À venir" },
        processing: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "En traitement" },
        validated: { color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", label: "Validée" },
    };

    const config = statusConfig[status];

    const isUpcoming = status === 'upcoming';

    return (
        <Card className={cn(
            "bg-card border-border/50 backdrop-blur-sm hover:border-primary/20 transition-all group overflow-hidden relative",
            status === 'validated' && "opacity-80 hover:opacity-100"
        )}>
            <div className="flex items-center justify-between p-4 md:p-6">
                <Link href={`/troupes/${troupeId}/sessions/${session.id}`} className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                    {/* Date Block */}
                    <div className={cn(
                        "text-center min-w-[60px] md:min-w-[70px] p-2 md:p-4 rounded-2xl border transition-colors",
                        config.bg, config.border
                    )}>
                        <p className={cn("text-[10px] uppercase font-black leading-none mb-1 opacity-70", config.color)}>
                            {date.toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                        <p className={cn("text-2xl md:text-3xl font-black leading-none", config.color)}>
                            {date.getDate()}
                        </p>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-foreground text-base md:text-lg group-hover:text-primary transition-colors truncate">
                                {session.title || "Répétition"}
                            </h3>
                            <Badge className={cn("text-[9px] px-1.5 py-0 shrink-0 border", config.bg, config.color, config.border)}>
                                {config.label}
                            </Badge>
                        </div>
                        <p className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2 truncate">
                            <Clock className="w-3 h-3 shrink-0" />
                            {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {getPlayTitle(session)}
                        </p>
                    </div>
                </Link>

                <div className="flex items-center gap-4 ml-4">
                    {sceneCount > 0 && !isUpcoming && (
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Programme</p>
                            <p className="text-foreground font-bold text-xs leading-none">{sceneCount} scènes</p>
                        </div>
                    )}

                    {isUpcoming ? (
                        <div className="flex items-center gap-2">
                            <Button asChild variant="secondary" size="sm" className="font-bold h-11 md:h-9 px-4">
                                <Link href={`/troupes/${troupeId}/sessions/${session.id}`}>
                                    Voir
                                </Link>
                            </Button>
                            {isAdmin && (
                                <Button asChild size="sm" className="font-bold bg-green-600 hover:bg-green-700 text-white h-11 md:h-9 px-4">
                                    <Link href={`/troupes/${troupeId}/sessions/${session.id}/live`}>
                                        Lancer
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Link href={`/troupes/${troupeId}/sessions/${session.id}`} className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-muted/20 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all">
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </Link>
                    )}
                </div>
            </div>
        </Card>
    );
}
