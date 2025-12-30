import { Skeleton } from "@/components/ui/skeleton";

export function PosterSkeleton() {
    return (
        <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 bg-muted/20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
                <Skeleton className="h-3 w-20 rounded-full bg-white/10" />
                <Skeleton className="h-8 w-3/4 rounded-lg bg-white/10" />
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-3 w-16 rounded-full bg-white/5" />
                    <Skeleton className="h-3 w-16 rounded-full bg-white/5" />
                </div>
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-10 p-6">
            <div className="flex justify-between items-center">
                <div className="space-y-3">
                    <Skeleton className="h-12 w-64 rounded-xl bg-primary/10" />
                    <Skeleton className="h-4 w-40 rounded-full bg-muted" />
                </div>
                <Skeleton className="h-32 w-64 rounded-2xl bg-card border border-border" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-64 w-full rounded-3xl bg-card/50 border border-white/5" />
                ))}
            </div>
        </div>
    );
}
