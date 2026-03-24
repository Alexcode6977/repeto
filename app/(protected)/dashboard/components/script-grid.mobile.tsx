import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ScriptMetadata } from "@/lib/types";
import { ScriptCard } from "./script-card";
import { ScriptGridEmptyState } from "./script-grid-empty-state";

interface ScriptGridMobileProps {
    scripts: ScriptMetadata[];
    isLoading: boolean;
    userEmail: string | null;
    onLoad: (script: ScriptMetadata) => void;
    onRename: (id: string, newTitle: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onTogglePublic: (script: ScriptMetadata) => Promise<void>;
    onCancelVocalization: (scriptId: string) => Promise<void>;
    onImport: () => void;
    activeIndex?: number;
    onIndexChange?: (index: number) => void;
    onShowStats: (script: ScriptMetadata) => void;
}

export function ScriptGridMobile({
    scripts,
    isLoading,
    userEmail,
    onLoad,
    onRename,
    onDelete,
    onTogglePublic,
    onCancelVocalization,
    onImport,
    activeIndex = 0,
    onIndexChange,
    onShowStats,
}: ScriptGridMobileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isProgrammaticScroll = useRef(false);
    const isTeleporting = useRef(false);
    const [realIndex, setRealIndex] = useState(0);

    const originalLength = scripts.length;
    const shouldLoopCarousel = originalLength > 1;
    const mobileScripts = shouldLoopCarousel
        ? [...scripts, ...scripts, ...scripts]
        : scripts;

    useEffect(() => {
        if (originalLength > 0) {
            setRealIndex(shouldLoopCarousel ? activeIndex + originalLength : activeIndex);
            return;
        }

        setRealIndex(0);
    }, [activeIndex, originalLength, shouldLoopCarousel]);

    useEffect(() => {
        if (!containerRef.current || mobileScripts.length === 0) {
            return;
        }

        const container = containerRef.current;
        if (container.children.length !== mobileScripts.length) {
            return;
        }

        const targetChild = container.children[realIndex] as HTMLElement | undefined;
        if (!targetChild) {
            return;
        }

        isProgrammaticScroll.current = true;

        const containerWidth = container.offsetWidth;
        const itemLeft = targetChild.offsetLeft;
        const itemWidth = targetChild.offsetWidth;
        const scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);
        const behavior = shouldLoopCarousel && isTeleporting.current ? "auto" : "smooth";

        container.scrollTo({
            left: scrollLeft,
            behavior,
        });

        window.setTimeout(() => {
            isProgrammaticScroll.current = false;
            isTeleporting.current = false;
        }, 500);
    }, [mobileScripts.length, realIndex, shouldLoopCarousel]);

    const handleScroll = () => {
        if (
            isProgrammaticScroll.current ||
            !containerRef.current ||
            originalLength === 0 ||
            !shouldLoopCarousel
        ) {
            return;
        }

        const container = containerRef.current;
        if (container.children.length !== mobileScripts.length) {
            return;
        }

        const center = container.scrollLeft + (container.offsetWidth / 2);
        let closestIndex = 0;
        let minDistance = Number.POSITIVE_INFINITY;

        Array.from(container.children).forEach((child, index) => {
            const element = child as HTMLElement;
            const itemCenter = element.offsetLeft + (element.offsetWidth / 2);
            const distance = Math.abs(center - itemCenter);

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== realIndex) {
            setRealIndex(closestIndex);
        }

        const normalizedIndex = closestIndex % originalLength;
        if (normalizedIndex !== activeIndex && onIndexChange) {
            onIndexChange(normalizedIndex);
        }
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-[calc(50%-35vw)] no-scrollbar gap-0 touch-pan-x"
        >
            {isLoading ? (
                [1, 2, 3].map((index) => (
                    <div
                        key={index}
                        className="flex-none w-[70vw] mx-2 aspect-[3/4] bg-card rounded-[2rem] skeleton-shimmer snap-center"
                    />
                ))
            ) : mobileScripts.length > 0 ? (
                mobileScripts.map((script, index) => {
                    const uniqueKey = `${script.id}-${index}`;
                    const isCurrentlyCentered = index === realIndex;

                    return (
                        <div
                            key={uniqueKey}
                            className={cn(
                                "flex-none w-[70vw] snap-center transition-all duration-300 ease-out mx-2",
                                !shouldLoopCarousel || isCurrentlyCentered
                                    ? "scale-100 opacity-100 z-10"
                                    : "scale-90 opacity-40 z-0 grayscale-[0.5]"
                            )}
                        >
                            <ScriptCard
                                script={script}
                                userEmail={userEmail}
                                index={index % originalLength}
                                onLoad={onLoad}
                                onRename={onRename}
                                onDelete={onDelete}
                                onTogglePublic={onTogglePublic}
                                onCancelVocalization={onCancelVocalization}
                                onShowStats={onShowStats}
                            />
                        </div>
                    );
                })
            ) : (
                <div className="w-full">
                    <ScriptGridEmptyState onImport={onImport} />
                </div>
            )}
        </div>
    );
}
