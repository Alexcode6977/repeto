import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoadingDesktop() {
    return (
        <div className="max-w-7xl mx-auto px-12 pt-32 pb-12 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <Skeleton className="h-11 w-32 rounded-full" />
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-[2rem] border border-border/60 bg-card/80 p-5 space-y-4 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-6 w-28" />
                            <Skeleton className="h-9 w-9 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-40 w-full rounded-2xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
