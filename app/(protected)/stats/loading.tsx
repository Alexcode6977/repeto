import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
    return (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-10 md:px-12 md:pt-32 md:pb-12 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-4 w-72" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="rounded-3xl border border-border/60 bg-card/80 p-5 space-y-4 shadow-sm">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-24 w-full rounded-2xl" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
