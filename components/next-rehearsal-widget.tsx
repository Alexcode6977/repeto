"use client";

import { cn } from "@/lib/utils";
import { Calendar, Clock, MapPin, Video, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface NextRehearsalWidgetProps {
    nextSession: any; // Using any for flexibility based on session.ts retrieval
    troupeId: string;
}

export function NextRehearsalWidget({ nextSession, troupeId }: NextRehearsalWidgetProps) {
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

    useEffect(() => {
        if (!nextSession) return;

        const calculateTimeLeft = () => {
            const difference = +new Date(nextSession.start_time) - +new Date();
            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                };
            }
            return null; // Event started or passed
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000);

        return () => clearInterval(timer);
    }, [nextSession]);

    if (!nextSession) {
        return (
            <div className="rounded-3xl border border-dashed border-white/10 bg-card/50 p-8 flex flex-col items-center justify-center text-center gap-4 hover:bg-card/80 transition-colors group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-foreground">Aucune répétition prévue</h3>
                    <p className="text-muted-foreground">Planifiez votre prochaine séance pour voir le compteur.</p>
                </div>
                <Link href={`/troupes/${troupeId}/calendar`}>
                    <Button variant="outline" className="mt-2">Planifier</Button>
                </Link>
            </div>
        );
    }

    const isToday = new Date(nextSession.start_time).toDateString() === new Date().toDateString();
    const dateStr = new Date(nextSession.start_time).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    const timeStr = new Date(nextSession.start_time).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
            <div className="absolute top-0 right-0 p-32 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                {/* Left: Info */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20 animate-pulse">
                            Prochaine Séance
                        </span>
                        {isToday && <span className="text-sm font-bold text-red-400">🔥 Aujourd'hui !</span>}
                    </div>

                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-foreground mb-1">
                            {nextSession.title || "Répétition"}
                        </h2>
                        <div className="flex items-center gap-4 text-muted-foreground font-medium">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span className="capitalize">{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>{timeStr}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        {/* Placeholder for participants avatars can go here */}
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-secondary/50 flex items-center justify-center text-[10px] font-bold">
                                    ?
                                </div>
                            ))}
                        </div>
                        <span className="text-sm text-muted-foreground ml-2">+ acteurs</span>
                    </div>
                </div>

                {/* Right: Countdown / Action */}
                <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                    {timeLeft ? (
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-background/40 backdrop-blur-sm rounded-2xl p-3 min-w-[80px]">
                                <span className="block text-2xl font-black text-foreground">{timeLeft.days}</span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold">Jours</span>
                            </div>
                            <div className="bg-background/40 backdrop-blur-sm rounded-2xl p-3 min-w-[80px]">
                                <span className="block text-2xl font-black text-foreground">{timeLeft.hours}</span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold">Heures</span>
                            </div>
                            <div className="bg-background/40 backdrop-blur-sm rounded-2xl p-3 min-w-[80px]">
                                <span className="block text-2xl font-black text-foreground">{timeLeft.minutes}</span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold">Min</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-500/20 text-green-500 rounded-2xl p-4 font-bold text-center border border-green-500/30 w-full md:w-auto">
                            La séance est en cours !
                        </div>
                    )}

                    <Link href={`/troupes/${troupeId}/calendar`} className="w-full md:w-auto">
                        <Button size="lg" className="w-full md:w-auto rounded-xl gap-2 font-bold shadow-lg shadow-primary/20">
                            Voir le planning <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
