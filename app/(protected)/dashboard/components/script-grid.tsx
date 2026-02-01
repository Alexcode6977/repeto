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

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const isProgrammaticScroll = useRef(false);
    const isTeleporting = useRef(false); // To prevent loop triggers during teleport

    // State for "Real" index (Infinite List)
    const [realIndex, setRealIndex] = useState(0);

    // Filtering Logic
    const normSearch = searchQuery.trim().toLowerCase();
    // useMemo for filteredScripts to avoid re-calc on every render
    // However, scripts prop might change often. 
    const filteredScripts = scripts.filter((s) => {
        const matchesSearch =
            !normSearch || s.title.toLowerCase().includes(normSearch);
        return s.is_owner && matchesSearch;
    });

    const originalLength = filteredScripts.length;

    // Mobile: Triple List for Infinite Loop
    const mobileScripts = originalLength > 0
        ? [...filteredScripts, ...filteredScripts, ...filteredScripts]
        : [];

    // Initialize Real Index to Middle Set on Mount/Change of activeIndex
    useEffect(() => {
        if (originalLength > 0 && activeIndex !== undefined) {
            // Target the middle set (index + length)
            const targetIndex = activeIndex + originalLength;
            setRealIndex(targetIndex);
        }
    }, [activeIndex, originalLength]);


    // Sync: Real Index -> Scroll Position (Mobile)
    useEffect(() => {
        if (layoutMode === "grid" && containerRef.current && mobileScripts.length > 0) {
            const container = containerRef.current;
            // Only runs if we are in Grid mode (Mobile Carousel logic handles the scroll)

            // Check if we have children to scroll to
            if (container.children.length === mobileScripts.length) {
                const childToCheck = container.children[realIndex] as HTMLElement;
                if (childToCheck) {
                    isProgrammaticScroll.current = true;

                    const containerWidth = container.offsetWidth;
                    const itemLeft = childToCheck.offsetLeft;
                    const itemWidth = childToCheck.offsetWidth;
                    const scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);

                    // Use 'auto' if teleporting to avoid visual jump, 'smooth' otherwise
                    const behavior = isTeleporting.current ? 'auto' : 'smooth';

                    container.scrollTo({
                        left: scrollLeft,
                        behavior: behavior
                    });

                    // Reset flags
                    setTimeout(() => {
                        isProgrammaticScroll.current = false;
                        isTeleporting.current = false;
                    }, 500);
                }
            }
        }
    }, [realIndex, layoutMode, mobileScripts.length]);


    // Handle Scroll for Index Update & Infinite Loop Teleport
    const handleScroll = () => {
        if (isProgrammaticScroll.current || layoutMode !== 'grid') return;

        if (containerRef.current && originalLength > 0) {
            const container = containerRef.current;

            // Safety check: rendering mobile scripts?
            if (container.children.length !== mobileScripts.length) return;

            const center = container.scrollLeft + (container.offsetWidth / 2);

            let closestIndex = 0;
            let minDistance = Infinity;

            // Iterate children to find closest to center
            Array.from(container.children).forEach((child, index) => {
                const el = child as HTMLElement;
                const itemCenter = el.offsetLeft + (el.offsetWidth / 2);
                const distance = Math.abs(center - itemCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });

            // Update Real Index State (for visuals)
            if (closestIndex !== realIndex) {
                setRealIndex(closestIndex);
            }

            // Report normalized index to parent
            const normalizedIndex = closestIndex % originalLength;
            if (normalizedIndex !== activeIndex && onIndexChange) {
                // Determine if we need to loop (Teleport)
                // Use a debounce or check boundaries?
                // For now, simple reporting. 
                // The infinite loop logic needs to "reset" the scroll position when we reach set 1 or set 3 boundaries.
                // But doing it mid-scroll is jarring. 
                // We rely on the buffer for now, or we can implement "ScrollEnd" teleport.

                onIndexChange(normalizedIndex);
            }

            // Simple Teleport Check: If we are in Set 1 (index < length) or Set 3 (index >= 2*length),
            // we should ideally jump to Set 2.
            // But doing this 'onScroll' will fight the user's touch. 
            // Better to let them scroll, and if they go too far, the 3x buffer handles it for a while.
            // When they stop (activeIndex updates), the useEffect above puts them back in the Middle Set (Set 2).
            // So the recoil logic is actually handled by the parent 'activeIndex' prop update -> useEffect -> scrollTo Middle.
        }
    };

    // --- LIST VIEW ---
    if (layoutMode === "list") {
        return (
            <div className="space-y-3 pb-32">
                {isLoading ? (
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
                    <div className="py-12 text-center text-muted-foreground">
                        Aucun script trouvé.
                    </div>
                )}
            </div>
        )
    }

    // --- DESKTOP GRID & MOBILE CAROUSEL ---
    return (
        <>
            {/* MOBILE CAROUSEL (Visible md:hidden) */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className={cn(
                    "flex md:hidden overflow-x-auto snap-x snap-mandatory pb-8 -mx-6 px-[calc(50%-35vw)] no-scrollbar gap-0",
                    // px-[calc(50%-35vw)] centers the 70vw card
                )}>
                {isLoading ? (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="flex-none w-[70vw] mx-2 aspect-[3/4] bg-card rounded-[2rem] skeleton-shimmer snap-center" />
                    ))
                ) : mobileScripts.length > 0 ? (
                    mobileScripts.map((s, index) => {
                        // Unique key for tripled items
                        const uniqueKey = `${s.id}-${index}`;
                        const isCurrentlyCentered = index === realIndex;

                        return (
                            <div
                                key={uniqueKey}
                                className={cn(
                                    "flex-none w-[70vw] snap-center transition-all duration-300 ease-out mx-2", // Added margin for spacing
                                    // Visual Peeking Effect
                                    isCurrentlyCentered ? "scale-100 opacity-100 z-10" : "scale-90 opacity-40 z-0 grayscale-[0.5]"
                                )}
                            >
                                <ScriptCard
                                    script={s}
                                    userEmail={userEmail}
                                    index={index % originalLength}
                                    onLoad={onLoad}
                                    onRename={onRename}
                                    onDelete={onDelete}
                                    onTogglePublic={onTogglePublic}
                                    onSettings={onSettings}
                                    isAdmin={false}
                                    onRenameSubmit={() => { }}
                                    renamingScriptId={null}
                                    renamingScriptTitle=""
                                    setRenamingScriptTitle={() => { }}
                                />
                            </div>
                        );
                    })
                ) : (
                    <div className="w-full">
                        <EmptyState onImport={onImport} />
                    </div>
                )}
            </div>

            {/* DESKTOP GRID (Visible md:grid, hidden on mobile) */}
            <div className={cn(
                "hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6 md:pb-0 md:mx-0 md:px-0"
            )}>
                {isLoading ? (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="aspect-[4/5] bg-card rounded-[2rem] skeleton-shimmer" />
                    ))
                ) : filteredScripts.length > 0 ? (
                    filteredScripts.map((s, index) => (
                        <div key={s.id}>
                            <ScriptCard
                                script={s}
                                userEmail={userEmail}
                                index={index}
                                onLoad={onLoad}
                                onRename={onRename}
                                onDelete={onDelete}
                                onTogglePublic={onTogglePublic}
                                onSettings={onSettings}
                                isAdmin={false}
                                onRenameSubmit={() => { }}
                                renamingScriptId={null}
                                renamingScriptTitle=""
                                setRenamingScriptTitle={() => { }}
                            />
                        </div>
                    ))
                ) : (
                    <div className="col-span-full">
                        <EmptyState onImport={onImport} />
                    </div>
                )}
            </div>
        </>
    );
}

// Helper component for empty state
function EmptyState({ onImport }: { onImport: () => void }) {
    return (
        <div
            onClick={onImport}
            className="w-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[2rem] bg-card cursor-pointer group"
        >
            <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                <Plus className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Bibliothèque vide</h3>
        </div>
    );
}

// Helper for Plus icon
function Plus({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
