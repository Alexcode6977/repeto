"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";
import { Loader2, Clock, Calendar, Hash, TrendingUp, Trophy, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsData {
    totalTimeSeconds: number;
    totalSessions: number;
    streakDays: number;
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
}

export function StatsDashboard({ initialStats }: StatsDashboardProps) {
    const [period, setPeriod] = useState("all");
    const [stats, setStats] = useState(initialStats);
    // Ideally we would fetch new stats when period changes, 
    // but for now we'll stick to 'all' or do client-side filtering if we had all data.
    // The server action 'getUserStats' does support period. 
    // To keep it simple for this step, we just show 'all' data or reload page.
    // Let's just use the initialStats for now.

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

            {/* HEADER & PERIOD SELECTOR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ma Progression</h1>
                    <p className="text-muted-foreground">Suivez vos répétitions et votre évolution.</p>
                </div>
                {/* 
                <Select value={period} onValueChange={setPeriod} disabled>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7days">7 derniers jours</SelectItem>
                        <SelectItem value="30days">30 derniers jours</SelectItem>
                        <SelectItem value="all">Tout</SelectItem>
                    </SelectContent>
                </Select> 
                */}
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-lg">
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
                        <Calendar className="h-4 w-4 text-primary/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalSessions}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            répétitions lancées
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:border-orange-500/50 transition-colors group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest group-hover:text-orange-500 transition-colors">
                            Complétion Moy.
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold group-hover:text-orange-500 transition-colors">
                            {Math.round(stats.recentPlays.reduce((acc, p) => acc + p.avgCompletion, 0) / (stats.recentPlays.length || 1))}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            du texte couvert
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CHART SECTION */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="h-full min-h-[400px]">
                        <CardHeader>
                            <CardTitle>Activité Récente</CardTitle>
                            <p className="text-sm text-muted-foreground">Temps de répétition par jour (minutes)</p>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            {stats.activityData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.activityData}>
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}m`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.2 }}
                                        />
                                        <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40}>
                                            {stats.activityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fillOpacity={0.8 + (index / stats.activityData.length) * 0.2} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    Aucune activité récente.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* RECENT PLAYS LIST */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold">Pièces Travaillées</h2>
                    <div className="space-y-3">
                        {sortedPlays.length > 0 ? sortedPlays.map((play) => (
                            <div key={play.scriptId || play.title} className="bg-card border border-border rounded-xl p-4 hover:bg-accent/50 transition-colors cursor-default group">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{play.title}</h3>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(play.lastPlayed).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(play.totalSeconds)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Hash className="w-3 h-3" />
                                        {play.sessionsCount} sessions
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground mb-1">
                                        <span>Complétion</span>
                                        <span>{play.avgCompletion}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000 ease-out"
                                            style={{ width: `${play.avgCompletion}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl border-border">
                                Pas encore de pièces répétées.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
