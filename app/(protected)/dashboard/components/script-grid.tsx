import { ScriptMetadata } from "@/lib/types";
import { useEffect, useRef } from "react";
import { ScriptCard } from "./script-card";
import { ScriptRow } from "./script-row";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptGridProps {
    scripts: ScriptMetadata[];
    isLoading: boolean;
    searchQuery: string;
    userEmail: string | null;
    onLoad: (script: ScriptMetadata) => void;
    onRename: (id: string, newTitle: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onTogglePublic: (script: ScriptMetadata) => Promise<void>;
    onSettings: (script: ScriptMetadata) => void;
    onImport: () => void;
    layoutMode: "grid" | "list";
}

export function ScriptGrid({
    scripts,
    isLoading,
    searchQuery,
    userEmail,
    onLoad,
    onRename,
    onDelete,
    onTogglePublic,
    onSettings,
    onImport,
    layoutMode,
    activeIndex = 0,
    onIndexChange
}: ScriptGridProps & { activeIndex?: number; onIndexChange?: (index: number) => void }) {

    // Refs for Scroll Sync
    const containerRef = useRef<HTMLDivElement>(null);
    const isProgrammaticScroll = useRef(false);

    // Filtering Logic
    const normSearch = searchQuery.trim().toLowerCase();
    const filteredScripts = scripts.filter((s) => {
        const matchesSearch =
            !normSearch || s.title.toLowerCase().includes(normSearch);
        return s.is_owner && matchesSearch;
    });

    // Sync: Active Index -> Scroll Position
    useEffect(() => {
        if (layoutMode === "grid" && containerRef.current && filteredScripts.length > 0) {
            const container = containerRef.current;
            // Assuming card width is roughly consistent or using children 
            // Better: get child by index.
            const childToCheck = container.children[activeIndex] as HTMLElement;
            if (childToCheck) {
                // Set flag to ignore scroll event triggered by this
                isProgrammaticScroll.current = true;

                // Center the item
                const containerWidth = container.offsetWidth;
                const itemLeft = childToCheck.offsetLeft;
                const itemWidth = childToCheck.offsetWidth;
                const scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);

                container.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });

                // Reset flag after timeout (approx animation duration)
                setTimeout(() => {
                    isProgrammaticScroll.current = false;
                }, 500);
            }
        }
    }, [activeIndex, layoutMode, filteredScripts.length]);


    // Sync: Scroll Position -> Active Index (User Swipe)
    const handleScroll = () => {
        if (isProgrammaticScroll.current || layoutMode !== 'grid') return;

        if (containerRef.current) {
            const container = containerRef.current;
            const center = container.scrollLeft + (container.offsetWidth / 2);

            // Find child closest to center
            let closestIndex = 0;
            let minDistance = Infinity;

            Array.from(container.children).forEach((child, index) => {
                const el = child as HTMLElement;
                const itemCenter = el.offsetLeft + (el.offsetWidth / 2);
                const distance = Math.abs(center - itemCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });

            if (closestIndex !== activeIndex && onIndexChange) {
                onIndexChange(closestIndex);
            }
        }
    };

    // --- LIST VIEW ---
    if (layoutMode === "list") {
        return (
            <div className="space-y-3 pb-32">
                {isLoading ? (
                    // Skeleton Loading List
                    [1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 w-full bg-card rounded-2xl skeleton-shimmer" />
                    ))
                ) : filteredScripts.length > 0 ? (
                    filteredScripts.map((s) => (
                        <ScriptRow
                            key={s.id}
                            script={s}
                            onLoad={onLoad}
                            onDelete={() => onDelete(s.id)}
                            onRename={onRename}
                            onTogglePublic={onTogglePublic}
                            onSettings={onSettings}
                        />
                    ))
                ) : (
                    // Empty List State
                    <div className="py-12 text-center text-muted-foreground">
                        Aucun script trouvé.
                    </div>
                )}
            </div>
        )
    }

    // --- GRID VIEW (Mobile Carousel + Desktop Grid) ---
    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={cn(
                // Mobile: Horizontal Scroll (Carousel)
                "flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-6 px-6 no-scrollbar",
                // Desktop: Grid
                "md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6 md:pb-0 md:mx-0 md:px-0 md:overflow-visible"
            )}>
            {isLoading ? (
                // Skeleton Loading
                [1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="flex-none w-[85vw] md:w-auto aspect-[3/4] md:aspect-[4/5] bg-card rounded-[2rem] skeleton-shimmer snap-center"
                    />
                ))
            ) : scripts.length > 0 ? (
                filteredScripts.length > 0 ? (
                    filteredScripts.map((s, index) => (
                        <div
                            key={s.id}
                            id={`script-card-${s.id}`}
                            className="flex-none w-[85vw] md:w-auto snap-center first:pl-2 last:pr-6 md:first:pl-0 md:last:pr-0"
                        >
                            <ScriptCard
                                script={s}
                                userEmail={userEmail}
                                index={index}
                                onLoad={onLoad}
                                onRename={onRename}
                                onDelete={onDelete}
                                onTogglePublic={onTogglePublic}
                                onSettings={onSettings}
                            />
                        </div>
                    ))
                ) : (
                    /* No Search Results */
                    <div className="w-full md:col-span-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[2rem] bg-card">
                        <h3 className="text-xl font-bold text-muted-foreground">Aucun document</h3>
                    </div>
                )
            ) : (
                /* Empty State */
                <div
                    onClick={onImport}
                    className="flex-none w-full md:col-span-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[2rem] bg-card cursor-pointer group"
                >
                    <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                        <Plus className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Bibliothèque vide</h3>
                </div>
            )}
        </div>
    );
}

// Helper for empty state icon
function Plus({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
