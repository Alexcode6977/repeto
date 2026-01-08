"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Play, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TroupeComingSoon() {
    // Target Date: January 20, 2026
    const targetDate = new Date("2026-01-20T10:00:00").getTime();

    interface TimeLeft {
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    }

    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setTimeLeft({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((distance % (1000 * 60)) / 1000)
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return (
        <div className="min-h-[80vh] w-full flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-40 mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/20 blur-[120px] rounded-full opacity-40 mix-blend-screen" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-7xl w-full z-10 flex flex-col items-center gap-16 my-auto"
            >
                {/* Header Section - Centered Top */}
                <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary uppercase text-xs font-bold tracking-widest mb-2">
                        <Sparkles className="w-3 h-3" />
                        Bientôt Disponible
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground leading-[0.9]">
                        Le Mode <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Troupe</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl">
                        Collaborez, répétez ensemble et gérez vos productions comme jamais auparavant.
                        La révolution du théâtre amateur arrive.
                    </p>
                </div>

                {/* Content Section - Split View aligned */}
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    {/* LEFT: Countdown (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col justify-center gap-4">
                        {[
                            { label: "Jours", value: timeLeft.days },
                            { label: "Heures", value: timeLeft.hours },
                            { label: "Minutes", value: timeLeft.minutes },
                            { label: "Secondes", value: timeLeft.seconds }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-8 py-5 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm relative group overflow-hidden transition-all hover:bg-card/60 hover:border-primary/20">
                                <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest relative z-10">
                                    {item.label}
                                </span>
                                <span className="text-4xl font-black text-foreground tabular-nums relative z-10">
                                    {String(item.value).padStart(2, '0')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT: Video (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col h-full">
                        <div className="w-full h-full min-h-[300px] lg:min-h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-border/50 bg-black/50 relative group cursor-pointer hover:shadow-[0_0_60px_rgba(var(--primary-rgb),0.25)] transition-all duration-500">
                            {/* Placeholder Content */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503095392237-fc550ccc9281?q=80&w=2966&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:opacity-30 transition-opacity duration-700 scale-105 group-hover:scale-100" />

                                <div className="relative z-10 flex flex-col items-center gap-6 p-8 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/10">
                                    <div className="w-24 h-24 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.6)] group-hover:scale-110 transition-transform duration-300">
                                        <Play className="w-10 h-10 fill-current ml-1" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-white mb-2">Voir la bande annonce</h3>
                                        <p className="text-white/60 text-sm">Découvrez ce qui vous attend</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
