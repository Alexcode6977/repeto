"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, Hash, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsPlayCardProps {
    play: {
        scriptId: string | null;
        title: string;
        lastPlayed: string;
        totalSeconds: number;
        sessionsCount: number;
        avgCompletion: number;
    };
    onClick: () => void;
}

export function StatsPlayCard({ play, onClick }: StatsPlayCardProps) {
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <Card
            className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-accent/5"
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg leading-none group-hover:text-primary transition-colors">
                            {play.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Dernière session : {new Date(play.lastPlayed).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                    <div className="p-2 rounded-full bg-secondary/50 group-hover:bg-primary/20 transition-colors">
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formatDuration(play.totalSeconds)}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Hash className="w-4 h-4" />
                            {play.sessionsCount} sessions
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs uppercase font-bold text-muted-foreground">
                            <span>Complétion Moyenne</span>
                            <span className="text-foreground">{play.avgCompletion}%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-primary to-purple-500 transition-all duration-1000 ease-out"
                                style={{ width: `${play.avgCompletion}%` }}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
