"use client";

import { memo, useEffect, useRef } from "react";
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

    // Auto-scroll footer to keep active item visible/centered
    useEffect(() => {
        if (containerRef.current && typeof activeIndex === 'number') {
            const container = containerRef.current;
            const items = container.children;
            const activeItem = items[activeIndex] as HTMLElement;

            if (activeItem) {
                const containerWidth = container.offsetWidth;
                const itemLeft = activeItem.offsetLeft;
                const itemWidth = activeItem.offsetWidth;

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
        <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-background/80 backdrop-blur-xl border-t border-white/5 pb-6 pt-4 px-4 transition-all duration-300">
            {/* Scrubber Container */}
            <div
                ref={containerRef}
                className="flex gap-4 overflow-x-auto px-2 no-scrollbar pb-2 mask-linear snap-none"
            >
                {scripts.map((s, i) => {
                    const isActive = i === activeIndex;
                    return (
                        <div
                            key={s.id}
                            onClick={() => onIndexChange(i)}
                            className="flex flex-col items-center gap-2 group cursor-pointer shrink-0 transition-opacity duration-300"
                            style={{
                                opacity: isActive ? 1 : 0.5,
                                transform: isActive ? "scale(1.05)" : "scale(1)"
                            }}
                        >
                            {/* Circle Container */}
                            <div className={cn(
                                "w-16 h-16 rounded-full p-[2px] transition-all duration-300",
                                isActive
                                    ? "bg-gradient-to-tr from-primary to-purple-500 shadow-[0_0_15px_rgba(124,58,237,0.5)]"
                                    : "bg-white/10"
                            )}>
                                <div className="w-full h-full rounded-full bg-card border-2 border-background flex items-center justify-center overflow-hidden relative">
                                    <FileText className={cn(
                                        "w-6 h-6 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )} />
                                </div>
                            </div>

                            {/* Title with indicator */}
                            <div className="flex flex-col items-center gap-1">
                                <span className={cn(
                                    "text-[10px] font-medium max-w-[70px] truncate text-center transition-colors",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {s.title}
                                </span>
                                {isActive && (
                                    <div className="w-1 h-1 bg-primary rounded-full animate-in zoom-in" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
