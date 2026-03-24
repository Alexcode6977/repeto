"use client";

import Link from "next/link";
import { Menu, Sparkles, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LandingScreenProps } from "@/app/landing-screen.types";
import {
    LandingBackground,
    LandingFooter,
    LandingSections,
} from "@/app/landing-screen.shared";

const NAV_ITEMS = ["Fonctionnalités", "Démo", "Tarifs", "FAQ"];

function getSectionId(item: string) {
    return item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function LandingScreenMobile(props: LandingScreenProps) {
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
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-purple-600/80 flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sparkles className="w-5 h-5 text-white relative z-10" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Repeto</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors mr-2">
                            Connexion
                        </Link>
                        <button
                            className="p-2 text-white"
                            onClick={props.onToggleMobileMenu}
                            aria-label={props.mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                        >
                            {props.mobileMenuOpen ? <XIcon /> : <Menu />}
                        </button>
                    </div>
                </div>

                {props.mobileMenuOpen ? (
                    <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-2xl border-b border-white/10 p-6 space-y-4 animate-in slide-in-from-top-4">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item}
                                onClick={() => props.onNavigateSection(getSectionId(item))}
                                className="block w-full text-left py-3 text-lg font-medium text-white/80 hover:text-white"
                            >
                                {item}
                            </button>
                        ))}
                        <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                            <Link href="/login">
                                <Button variant="outline" className="w-full rounded-xl border-white/20 text-white hover:bg-white/10 h-12 text-base">
                                    Connexion
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button className="w-full rounded-xl bg-primary text-white hover:bg-primary/90 h-12 text-base font-bold">
                                    Créer un compte
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : null}
            </header>

            <LandingSections {...props} />
            <LandingFooter />
        </div>
    );
}
