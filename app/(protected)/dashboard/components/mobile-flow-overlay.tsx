"use client";

import { useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { MobileFlowTransitionState } from "@/lib/mobile-flow-transition";
import { cn } from "@/lib/utils";
import { markSoloFavoriteModeShellReady } from "@/lib/mobile-flow-metrics";

const PHASE_COPY: Record<Exclude<MobileFlowTransitionState, "idle" | "ready">, { title: string; description: string }> = {
    warming: {
        title: "Préparation du raccourci",
        description: "Repeto prépare ta session favorite pour un lancement immédiat.",
    },
    navigating: {
        title: "Ouverture de la session",
        description: "Le shell mobile reste en place pendant que la navigation se verrouille.",
    },
    mounting: {
        title: "Montage de la session",
        description: "Les réglages, le script et le mode solo se chargent sans casser la continuité.",
    },
};

export function DashboardMobileFlowOverlay({
    phase,
    className,
}: {
    phase: Exclude<MobileFlowTransitionState, "idle" | "ready">;
    className?: string;
}) {
    const copy = PHASE_COPY[phase];

    return (
        <div className={cn("fixed inset-0 z-[120] pointer-events-none bg-background/45 backdrop-blur-[2px]", className)}>
            <div className="absolute inset-x-4 top-[max(env(safe-area-inset-top),6rem)]">
                <div className="mx-auto max-w-md rounded-[2rem] border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-lg shadow-primary/10">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary/80">Transition mobile</p>
                            <h3 className="mt-1 text-lg font-bold text-foreground">{copy.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{copy.description}</p>
                            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                Optimisation en cours
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DashboardSoloModeLoadingScreen() {
    useEffect(() => {
        markSoloFavoriteModeShellReady();
    }, []);

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#8b5cf61f,transparent_45%)]" />
            <div className="relative min-h-screen flex items-center justify-center px-6">
                <div className="w-full max-w-sm rounded-[2rem] border border-border/60 bg-card/90 shadow-2xl p-6 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary/80">Mode solo</p>
                            <h2 className="text-lg font-bold text-foreground">Session presque prête</h2>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div className="h-full w-2/3 rounded-full bg-primary/70 animate-pulse" />
                        </div>
                        <div className="h-24 rounded-[1.5rem] border border-border/40 bg-muted/50 animate-pulse" />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-12 rounded-2xl bg-muted/60 animate-pulse" />
                            <div className="h-12 rounded-2xl bg-muted/60 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
