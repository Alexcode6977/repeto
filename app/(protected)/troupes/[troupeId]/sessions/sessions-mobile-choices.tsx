"use client";

import Link from "next/link";
import {
    CalendarDays,
    Sparkles,
    Loader2,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionsMobileChoicesProps {
    troupeId: string;
    isAdmin: boolean;
}

export function SessionsMobileChoices({ troupeId, isAdmin }: SessionsMobileChoicesProps) {
    const categories = [
        {
            id: "preparation",
            label: "À Préparer",
            description: "Gérer l'agenda et préparer le contenu",
            icon: Sparkles,
            color: "indigo",
            href: `/troupes/${troupeId}/sessions/all?tab=preparation`,
            bg: "bg-indigo-500/10 dark:bg-[#1a1528]",
            iconBg: "bg-indigo-500/20",
            iconColor: "text-indigo-600 dark:text-indigo-300",
            glow: "bg-indigo-500/10"
        },
        {
            id: "upcoming",
            label: "À Venir",
            description: "Prochaines séances et Mode Live",
            icon: CalendarDays,
            color: "blue",
            href: `/troupes/${troupeId}/sessions/all?tab=upcoming`,
            bg: "bg-blue-500/10 dark:bg-[#0f172a]",
            iconBg: "bg-blue-500/20",
            iconColor: "text-blue-600 dark:text-blue-300",
            glow: "bg-blue-500/10"
        },
        {
            id: "processing",
            label: "À Traiter",
            description: "Sessions terminées à valider",
            icon: Loader2,
            color: "orange",
            href: `/troupes/${troupeId}/sessions/all?tab=processing`,
            bg: "bg-orange-500/10 dark:bg-[#1c1610]",
            iconBg: "bg-orange-500/20",
            iconColor: "text-orange-600 dark:text-orange-300",
            glow: "bg-orange-500/10"
        },
        {
            id: "validated",
            label: "Historique",
            description: "Consulter les séances passées",
            icon: CheckCircle2,
            color: "emerald",
            href: `/troupes/${troupeId}/sessions/all?tab=validated`,
            bg: "bg-emerald-500/10 dark:bg-[#0f1d15]",
            iconBg: "bg-emerald-500/20",
            iconColor: "text-emerald-600 dark:text-emerald-300",
            glow: "bg-emerald-500/10"
        }
    ];
    const visibleCategories = isAdmin
        ? categories
        : categories.filter((cat) => cat.id === "upcoming" || cat.id === "validated");

    return (
        <div className="md:hidden flex flex-col gap-6 py-4">

            {/* Header Mini */}
            <div className="flex items-center gap-3 px-1 mb-2">
                <div className="h-10 w-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground dark:text-white leading-tight">Gestion des Séances</h2>
                    <p className="text-muted-foreground dark:text-white/40 text-xs font-medium">Choisissez l&apos;état à consulter</p>
                </div>
            </div>

            {/* Grid of Choices */}
            <div className="grid grid-cols-1 gap-4">
                {visibleCategories.map((cat) => (
                    <Link key={cat.id} href={cat.href} className="block group">
                        <div className={cn(
                            "relative overflow-hidden rounded-[2rem] border border-border/40 dark:border-white/5 p-6 shadow-2xl mobile-heavy-surface transition-all duration-300 active:scale-[0.98]",
                            cat.bg
                        )}>
                            {/* Background Glow */}
                            <div className={cn(
                                "absolute top-0 right-0 w-48 h-48 blur-[60px] mobile-heavy-glow rounded-full pointer-events-none group-hover:opacity-100 opacity-60 transition-opacity",
                                cat.glow
                            )} />

                            <div className="relative z-10 flex gap-5 items-center">
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center border border-border/40 dark:border-white/5 shadow-inner grow-0 shrink-0",
                                    cat.iconBg, cat.iconColor
                                )}>
                                    <cat.icon className="w-8 h-8" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-black text-foreground dark:text-white mb-1 tracking-tight">
                                        {cat.label}
                                    </h3>
                                    <p className="text-muted-foreground dark:text-white/40 text-xs font-medium leading-tight">
                                        {cat.description}
                                    </p>
                                </div>

                                <div className="w-10 h-10 rounded-full bg-muted/60 dark:bg-white/5 flex items-center justify-center group-hover:bg-muted dark:group-hover:bg-white/10 transition-colors grow-0 shrink-0">
                                    <ArrowRight className="w-5 h-5 text-muted-foreground dark:text-white/60" />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
