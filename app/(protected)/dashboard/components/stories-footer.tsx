"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ScriptMetadata } from "@/lib/types";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoriesFooterProps {
    scripts: ScriptMetadata[];
    activeIndex: number;
    onIndexChange: (index: number) => void;
}

export const StoriesFooter = memo(function StoriesFooter({
    scripts,
    activeIndex,
    onIndexChange
}: StoriesFooterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

    // Auto-scroll footer & Move Sliding Pill
    useEffect(() => {
        if (containerRef.current && typeof activeIndex === 'number' && itemsRef.current[activeIndex]) {
            const container = containerRef.current;
            const activeItem = itemsRef.current[activeIndex];

            if (activeItem) {
                // 1. Scroll Container to Center Item
                const containerWidth = container.offsetWidth;
                const itemLeft = activeItem.offsetLeft;
                const itemWidth = activeItem.offsetWidth;

                // Update Pill Position
                setPillStyle({
                    left: itemLeft,
                    width: itemWidth,
                    opacity: 1
                });

                const scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);
                container.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    }, [activeIndex, scripts]);

    if (scripts.length === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-background/90 backdrop-blur-2xl border-t border-border/60 dark:border-white/5 pb-8 pt-4 px-0">
            {/* Gradient Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />

            {/* Scrubber Container */}
            <div
                ref={containerRef}
                className="relative flex overflow-x-auto px-[calc(50%-40px)] no-scrollbar pb-2 snap-none items-center"
            >
                {/* SLIDING PILL (The Ghost) */}
                <div
                    className="absolute h-14 bg-gradient-to-br from-primary/20 to-purple-500/20 border border-border/60 dark:border-white/10 rounded-2xl transition-all duration-300 ease-out shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] z-0"
                    style={{
                        left: pillStyle.left,
                        width: pillStyle.width,
                        opacity: pillStyle.opacity
                    }}
                />

                {scripts.map((s, i) => {
                    const isActive = i === activeIndex;
                    return (
                        <div
                            key={s.id}
                            ref={el => { itemsRef.current[i] = el }}
                            onClick={() => onIndexChange(i)}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all duration-300 z-10 px-4 py-2 min-w-[80px]",
                                isActive ? "opacity-100 scale-105" : "opacity-50 scale-100 hover:opacity-80"
                            )}
                        >
                            {/* Icon */}
                            <FileText className={cn(
                                "w-6 h-6 transition-colors duration-300",
                                isActive ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" : "text-muted-foreground"
                            )} />

                            {/* Title (Very short) */}
                            <span className={cn(
                                "text-[10px] font-bold tracking-wide max-w-[80px] truncate text-center transition-colors duration-300",
                                isActive ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {s.title}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
