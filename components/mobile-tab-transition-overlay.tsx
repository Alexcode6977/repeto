"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useMobileTabTransition, type MobileTabHref } from "@/lib/mobile-tab-transition";

function DashboardShell() {
    return (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-4 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <Skeleton className="h-11 w-11 rounded-full" />
                </div>
            </div>

            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                        key={index}
                        className="h-[58vh] w-[70vw] max-w-[18rem] shrink-0 rounded-[2rem]"
                    />
                ))}
            </div>
        </div>
    );
}

function FavoritesShell() {
    return (
        <div className="max-w-3xl mx-auto w-full px-4 pt-4 pb-6 space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-56" />
            </div>

            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    key={index}
                    className="rounded-3xl border border-border/60 bg-card/80 p-5 space-y-4 shadow-sm"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-12 w-12 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-28" />
                            </div>
                        </div>
                        <Skeleton className="h-9 w-9 rounded-full" />
                    </div>

                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>

                    <div className="flex gap-3">
                        <Skeleton className="h-11 flex-1 rounded-2xl" />
                        <Skeleton className="h-11 w-11 rounded-2xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatsShell() {
    return (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-10 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-4 w-72" />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-3xl border border-border/60 bg-card/80 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-5 w-5 rounded-full" />
                        </div>
                        <Skeleton className="h-10 w-28" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function TroupesShell() {
    return (
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-10 space-y-8">
            <div className="space-y-3">
                <Skeleton className="h-12 w-56" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                    <Skeleton className="h-10 w-14 rounded-xl" />
                </div>
            </div>

            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-28" />
                            </div>
                            <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function renderPendingShell(href: MobileTabHref) {
    switch (href) {
        case "/dashboard":
            return <DashboardShell />;
        case "/favoris":
            return <FavoritesShell />;
        case "/stats":
            return <StatsShell />;
        case "/troupes":
            return <TroupesShell />;
        default:
            return null;
    }
}

export function MobileTabTransitionOverlay() {
    const { pendingHref } = useMobileTabTransition();

    if (!pendingHref) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[95] bg-background/92 backdrop-blur-sm pointer-events-none md:hidden animate-in fade-in duration-150">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#7f77dd14,transparent_42%)]" />
            <div className="relative h-full overflow-hidden">
                {renderPendingShell(pendingHref)}
            </div>
        </div>
    );
}
