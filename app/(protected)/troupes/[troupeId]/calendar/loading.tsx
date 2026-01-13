import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between p-4 bg-card rounded-2xl">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>

            {/* Calendar Grid */}
            <div className="bg-card rounded-2xl p-4 space-y-4">
                {/* Days of week */}
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full rounded" />
                    ))}
                </div>

                {/* Calendar dates */}
                {Array.from({ length: 5 }).map((_, week) => (
                    <div key={week} className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 7 }).map((_, day) => (
                            <Skeleton key={day} className="h-12 w-full rounded-xl" />
                        ))}
                    </div>
                ))}
            </div>

            {/* Upcoming Events */}
            <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-2xl">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
