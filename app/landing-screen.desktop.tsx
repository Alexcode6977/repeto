"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LandingScreenProps } from "@/app/landing-screen.types";
import {
    LandingBackground,
    LandingDesktopNav,
    LandingFooter,
    LandingSections,
} from "@/app/landing-screen.shared";

export function LandingScreenDesktop(props: LandingScreenProps) {
    return (
        <div className="dark bg-[#050508] text-foreground min-h-screen flex flex-col font-sans selection:bg-primary/30 overflow-x-hidden">
            <LandingBackground />

            <header className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
                props.scrolled
                    ? "bg-black/50 backdrop-blur-xl border-white/5 py-4"
                    : "bg-transparent border-transparent py-6"
            )}>
                <div className="w-full max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-purple-600/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sparkles className="w-5 h-5 text-white relative z-10" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Repeto</span>
                    </div>

                    <LandingDesktopNav onNavigateSection={props.onNavigateSection} />

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Connexion
                        </Link>
                    </div>
                </div>
            </header>

            <LandingSections {...props} />
            <LandingFooter />
        </div>
    );
}
