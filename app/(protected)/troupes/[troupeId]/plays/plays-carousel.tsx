"use client";

import { useRef } from "react";
import { PlayPosterCard } from "./play-poster-card";
import { useHaptic } from "@/lib/hooks/use-haptic";
import { Plus } from "lucide-react";
import Link from "next/link";

interface PlaysCarouselProps {
    plays: any[];
    troupeId: string;
    isAdmin: boolean;
}

export function PlaysCarousel({ plays, troupeId, isAdmin }: PlaysCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { trigger } = useHaptic();

    const handleScroll = () => {
        // Optional: Trigger light haptic on scroll snap interaction if desired, 
        // but scroll events fire too frequently. Better to stick to clicks.
    };

    return (
        <div className="grid grid-cols-2 gap-3">
            {plays.map((play, index) => (
                <div key={play.id} className="aspect-square">
                    <PlayPosterCard play={play} troupeId={troupeId} index={index} isCompact />
                </div>
            ))}

            {isAdmin && (
                <div className="aspect-square">
                    <Link
                        href={`/troupes/${troupeId}/plays/new`}
                        onClick={() => trigger('medium')}
                        className="block w-full h-full"
                    >
                        <div className="w-full h-full rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all duration-300 text-muted-foreground hover:text-primary">
                            <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Ajouter</span>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    );
}
