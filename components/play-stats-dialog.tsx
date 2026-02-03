"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from "recharts";
import { Loader2, TrendingUp, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlayDetailedStats } from "@/app/actions/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayStatsDialogProps {
    playId: string;
    playTitle: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    showFullStatsLink?: boolean;
}

export function PlayStatsDialog({ playId, playTitle, isOpen, onOpenChange, showFullStatsLink = false }: PlayStatsDialogProps) {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && playId) {
            setIsLoading(true);
            const loadStats = async () => {
                const data = await getPlayDetailedStats(playId);
                setStats(data);
                setIsLoading(false);
            };
            loadStats();
        }
    }, [isOpen, playId]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-purple-500">
                            {playTitle}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : stats ? (
                    <div className="space-y-6 py-4">
                        {/* Summary Numbers */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-secondary/20 border border-border flex flex-col items-center justify-center text-center">
                                <span className="text-sm text-muted-foreground uppercase font-bold mb-1">Taux de Succès 1er Essai</span>
                                <span className="text-3xl font-bold text-green-500">{stats.firstTryRate}%</span>
                            </div>
                            <div className="p-4 rounded-xl bg-secondary/20 border border-border flex flex-col items-center justify-center text-center">
                                <span className="text-sm text-muted-foreground uppercase font-bold mb-1">Total Sessions</span>
                                <span className="text-3xl font-bold">{stats.totalSessions}</span>
                            </div>
                            <div className="p-4 rounded-xl bg-secondary/20 border border-border flex flex-col items-center justify-center text-center">
                                <span className="text-sm text-muted-foreground uppercase font-bold mb-1">Complétion Moyenne</span>
                                <span className="text-3xl font-bold text-blue-400">{stats.avgCompletion}%</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Success Distribution Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-medium flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-primary" />
                                        Performance des Répliques
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.successDistribution} layout="vertical" margin={{ left: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} interval={0} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1f2937', color: '#fff' }}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                                {stats.successDistribution.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Progression Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-medium flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        Progression de Complétion
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.progressionData}>
                                            <defs>
                                                <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1f2937', color: '#fff' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="completion"
                                                stroke="hsl(var(--primary))"
                                                fillOpacity={1}
                                                fill="url(#colorCompletion)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {showFullStatsLink && (
                            <div className="flex justify-center mt-4 pt-4 border-t border-border">
                                <a
                                    href={`/stats?playId=${playId}`}
                                    className="text-sm text-primary hover:underline flex items-center gap-2 cursor-pointer"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Voir les statistiques complètes
                                </a>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="py-12 text-center text-muted-foreground">
                        Aucune donnée disponible pour cette pièce.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
