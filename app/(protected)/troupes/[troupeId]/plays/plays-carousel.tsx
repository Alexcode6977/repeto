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
        <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 scrollbar-hide" onScroll={handleScroll}>
            {plays.map((play, index) => (
                <div key={play.id} className="snap-center shrink-0 w-[70vw] sm:w-[50vw]">
                    <PlayPosterCard play={play} troupeId={troupeId} index={index} />
                </div>
            ))}

            {isAdmin && (
                <div className="snap-center shrink-0 w-[70vw] sm:w-[50vw]">
                    <Link
                        href={`/troupes/${troupeId}/plays/new`}
                        onClick={() => trigger('medium')}
                        className="block group relative w-full aspect-[2/3]"
                    >
                        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/5 flex flex-col items-center justify-center gap-4 transition-all duration-300 text-muted-foreground hover:text-primary">
                            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="font-bold uppercase tracking-widest text-xs">Ajouter une pièce</span>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    );
}
