"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Clock, BookOpen, TrendingUp } from "lucide-react";
import { StatsPlayCard } from "./stats-play-card";
import { PlayStatsDialog } from "./play-stats-dialog";

interface StatsData {
    totalTimeSeconds: number;
    totalSessions: number;
    streakDays: number;
    uniqueScriptsCount?: number;
    activityData: { date: string; minutes: number }[];
    recentPlays: {
        scriptId: string | null;
        title: string;
        lastPlayed: string;
        totalSeconds: number;
        sessionsCount: number;
        avgCompletion: number;
    }[];
}

interface StatsDashboardProps {
    initialStats: StatsData;
    initialSelectedPlayId?: string;
}

export function StatsDashboard({ initialStats, initialSelectedPlayId }: StatsDashboardProps) {
    const [stats] = useState(initialStats);

    // Find title if ID passed
    const initialTitle = useMemo(() => {
        if (!initialSelectedPlayId) return "";
        const match = initialStats.recentPlays.find(p => p.scriptId === initialSelectedPlayId);
        return match ? match.title : "";
    }, [initialSelectedPlayId, initialStats]);

    const [selectedPlayId, setSelectedPlayId] = useState<string | null>(initialSelectedPlayId || null);
    const [selectedPlayTitle, setSelectedPlayTitle] = useState<string>(initialTitle);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const sortedPlays = useMemo(() => {
        return [...stats.recentPlays].sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime());
    }, [stats]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ma Progression</h1>
                    <p className="text-muted-foreground">Suivez vos répétitions et votre évolution par pièce.</p>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 blur-xl" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                            Temps Total
                        </CardTitle>
                        <Clock className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{formatDuration(stats.totalTimeSeconds)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            passés sur scène
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                            Sessions
                        </CardTitle>
                        <Activity className="h-4 w-4 text-primary/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalSessions}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            répétitions lancées
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:border-purple-500/50 transition-colors group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest group-hover:text-purple-500 transition-colors">
                            Pièces Dashboard
                        </CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold group-hover:text-purple-500 transition-colors">
                            {stats.uniqueScriptsCount || stats.recentPlays.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            textes travaillés
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* PLAYS GRID */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Mes Pièces
                </h2>

                {sortedPlays.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedPlays.map((play) => (
                            <StatsPlayCard
                                key={play.scriptId || play.title}
                                play={play}
                                onClick={() => {
                                    if (play.scriptId) {
                                        setSelectedPlayId(play.scriptId);
                                        setSelectedPlayTitle(play.title);
                                    }
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-12 bg-muted/20 border border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground">Vous n'avez pas encore commencé de répétition.</p>
                    </div>
                )}
            </div>

            {/* DETAILS MODAL */}
            {selectedPlayId && (
                <PlayStatsDialog
                    playId={selectedPlayId}
                    playTitle={selectedPlayTitle}
                    isOpen={!!selectedPlayId}
                    onOpenChange={(open) => !open && setSelectedPlayId(null)}
                />
            )}
        </div>
    );
}
