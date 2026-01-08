"use client";

import Link from "next/link";
import { ClipboardList, Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionsMobileChoicesProps {
    troupeId: string;
}

export function SessionsMobileChoices({ troupeId }: SessionsMobileChoicesProps) {
    return (
        <div className="md:hidden flex flex-col gap-4 mb-8">
            {/* Card 1: Planifier (The classical list) */}
            <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 -mr-2 -mt-2 text-blue-400">
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">Planifier</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Gérer l'agenda et préparer le contenu des séances.
                </p>
                {/* Because the list is on the same page, we might just want to anchor scroll or let it be. 
                    But the user asked for a "choice". 
                    We can make this simply jump to the list section if it's below, 
                    or purely conceptual if the list is always visible. 
                    Given the "hub" request, let's treat the list below as the destination.
                */}
            </div>

            {/* Card 2: Lancer (Live Mode) */}
            <Link href={`/troupes/${troupeId}/sessions/live`} className="block">
                <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6 active:scale-[0.98] transition-all">
                    <div className="absolute top-0 right-0 p-12 bg-green-500/20 blur-[50px] rounded-full pointer-events-none" />

                    <div className="relative flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400">
                            <Play className="w-6 h-6 fill-current" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-green-400" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-1">Mode Live</h3>
                    <p className="text-sm text-muted-foreground mb-0">
                        Lancer une séance et suivre le script en temps réel.
                    </p>
                </div>
            </Link>
        </div>
    );
}
