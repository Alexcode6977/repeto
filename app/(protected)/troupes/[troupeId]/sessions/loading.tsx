import { Skeleton } from "@/components/ui/skeleton";

export default function SessionsLoading() {
    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-2xl p-6 space-y-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-full" />
                </div>
                <div className="bg-card rounded-2xl p-6 space-y-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>

            {/* Sessions List */}
            <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-2xl">
                        <Skeleton className="h-14 w-14 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
