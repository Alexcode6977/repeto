"use client";

import { useRef, useState } from "react";
import { PlayPosterCard } from "./play-poster-card";
import { useHaptic } from "@/lib/hooks/use-haptic";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaysCarouselProps {
    plays: {
        id: string;
        title: string;
        play_characters?: { count: number }[];
        play_scenes?: { count: number }[];
    }[];
    troupeId: string;
    isAdmin: boolean;
    onAddPlay?: () => void;
}

export function PlaysCarousel({ plays, troupeId, isAdmin, onAddPlay }: PlaysCarouselProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { trigger } = useHaptic();
    const originalLength = plays.length;
    const [realIndex, setRealIndex] = useState(0);

    const handleScroll = () => {
        if (!containerRef.current || originalLength === 0) return;

        const container = containerRef.current;
        const playSlides = Array.from(
            container.querySelectorAll<HTMLElement>("[data-carousel-index]")
        );
        if (playSlides.length === 0) return;

        const center = container.scrollLeft + (container.offsetWidth / 2);
        let closestIndex = realIndex;
        let minDistance = Infinity;

        playSlides.forEach((slide) => {
            const itemCenter = slide.offsetLeft + (slide.offsetWidth / 2);
            const distance = Math.abs(center - itemCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = Number(slide.dataset.carouselIndex || 0);
            }
        });

        if (closestIndex !== realIndex) {
            setRealIndex(closestIndex);
        }
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory pb-3 -mx-6 px-[calc(50%-35vw)] no-scrollbar gap-0"
        >
            {plays.map((play, index) => {
                const isCentered = index === realIndex;

                return (
                    <div
                        key={play.id}
                        data-carousel-index={index}
                        className={cn(
                            "flex-none w-[70vw] snap-center transition-all duration-300 ease-out mx-2",
                            isCentered ? "scale-100 opacity-100 z-10" : "scale-90 opacity-40 z-0 grayscale-[0.5]"
                        )}
                    >
                        <PlayPosterCard
                            play={play}
                            troupeId={troupeId}
                            index={index}
                            isCompact
                            aspectClass="aspect-[3/4]"
                        />
                    </div>
                );
            })}

            {isAdmin && (
                <div className="flex-none w-[50vw] mx-2 aspect-square snap-center">
                    <button
                        onClick={() => { trigger('medium'); onAddPlay?.(); }}
                        className="block w-full h-full cursor-pointer"
                    >
                        <div className="w-full h-full rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/50 bg-muted/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-3 transition-all duration-300 text-muted-foreground hover:text-primary">
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <Plus className="w-7 h-7" />
                            </div>
                            <span className="font-bold uppercase tracking-widest text-[10px]">Ajouter une pièce</span>
                        </div>
                    </button>
                </div>
            )}

            {plays.length === 0 && !isAdmin && (
                <div className="flex-none w-[70vw] mx-2 aspect-[3/4] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground text-sm">
                    Aucune pièce
                </div>
            )}
        </div>
    );
}
