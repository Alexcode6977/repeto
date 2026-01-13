import { Skeleton } from "@/components/ui/skeleton";

export default function PlaysLoading() {
    return (
        <div className="animate-in fade-in duration-300 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2 relative z-10">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-5 w-96 max-w-full" />
            </div>

            {/* Mobile: Horizontal Carousel Skeleton */}
            <div className="md:hidden">
                <div className="flex gap-4 overflow-hidden -mx-4 px-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="shrink-0 w-[200px] aspect-[2/3] bg-card rounded-2xl overflow-hidden"
                        >
                            <div className="h-full flex flex-col justify-end p-4">
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop: Grid Skeleton */}
            <div className="hidden md:grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="aspect-[2/3] bg-card rounded-2xl overflow-hidden border border-white/5"
                    >
                        <div className="h-full flex flex-col justify-end p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                            <Skeleton className="h-5 w-20 mb-3 rounded-full" />
                            <Skeleton className="h-8 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
