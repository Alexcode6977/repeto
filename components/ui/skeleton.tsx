"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "rounded-md skeleton-shimmer",
                className
            )}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="aspect-[3/4] md:aspect-[4/5] bg-card border border-border rounded-[2rem] overflow-hidden">
            <div className="h-full flex flex-col justify-end p-5">
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
