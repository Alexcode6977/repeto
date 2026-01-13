import { Skeleton } from "@/components/ui/skeleton";

export default function TroupeLoading() {
    return (
        <div className="animate-in fade-in duration-300 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-5 w-72" />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-2xl p-6 space-y-4">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
