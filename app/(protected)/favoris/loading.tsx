import { Skeleton } from "@/components/ui/skeleton";

export default function FavorisLoading() {
    return (
        <div className="max-w-3xl mx-auto w-full px-4 pt-4 pb-6 md:px-0 space-y-4">
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
