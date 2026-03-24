import { Skeleton } from "@/components/ui/skeleton";

export default function TroupesLoading() {
    return (
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-10 md:px-12 md:pt-32 md:pb-12 space-y-8">
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
