import { Skeleton } from "@/components/ui/skeleton";

export default function ProtectedLoading() {
    return (
        <div className="animate-in fade-in duration-200 space-y-6 md:space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-8 w-44 md:h-10 md:w-56" />
                <Skeleton className="h-4 w-64 md:w-80" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="rounded-3xl border border-border/60 bg-card/80 p-5 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-9 w-9 rounded-full" />
                        </div>

                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Skeleton className="h-10 flex-1 rounded-2xl" />
                            <Skeleton className="h-10 w-20 rounded-2xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
