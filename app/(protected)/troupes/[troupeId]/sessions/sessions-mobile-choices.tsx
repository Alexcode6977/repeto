"use client";

import Link from "next/link";
import { ClipboardList, Play, ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SessionsMobileChoicesProps {
    troupeId: string;
}

export function SessionsMobileChoices({ troupeId }: SessionsMobileChoicesProps) {
    return (
        <div className="md:hidden flex flex-col gap-5 py-4">

            {/* Header Mini */}
            <div className="flex items-center gap-2 px-1 mb-2">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h2 className="text-xl font-black tracking-tight text-white">Que voulez-vous faire ?</h2>
            </div>

            {/* Card 1: Planifier (To List) */}
            <Link href={`/troupes/${troupeId}/sessions/all`} className="block group">
                <div className="relative overflow-hidden rounded-[2rem] bg-[#1a1528] border border-white/5 p-8 shadow-2xl shadow-indigo-500/10 transition-all duration-300 active:scale-[0.98]">

                    {/* Background Vibes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none" />

                    <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                        <div className="flex justify-between items-start">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                <CalendarDays className="w-7 h-7" />
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <ArrowRight className="w-5 h-5 text-indigo-200" />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Planifier</h3>
                            <p className="text-indigo-200/60 font-medium leading-relaxed">
                                Gérer l'agenda et préparer le contenu des futures séances.
                            </p>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Card 2: Mode Live */}
            <Link href={`/troupes/${troupeId}/sessions/live`} className="block group">
                <div className="relative overflow-hidden rounded-[2rem] bg-[#0f1d15] border border-white/5 p-8 shadow-2xl shadow-emerald-500/10 transition-all duration-300 active:scale-[0.98]">

                    {/* Background Vibes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

                    <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                        <div className="flex justify-between items-start">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                <Play className="w-7 h-7 fill-current ml-1" />
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <ArrowRight className="w-5 h-5 text-emerald-200" />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-3xl font-black text-white tracking-tight">Mode Live</h3>
                                <div className="animate-pulse px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black uppercase text-emerald-400 tracking-widest">
                                    Ready
                                </div>
                            </div>
                            <p className="text-emerald-200/60 font-medium leading-relaxed">
                                Lancer une séance, suivre le script et noter en direct.
                            </p>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
