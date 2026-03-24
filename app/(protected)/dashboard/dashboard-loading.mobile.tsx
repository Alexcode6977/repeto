import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoadingMobile() {
    return (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-4 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <Skeleton className="h-11 w-11 rounded-full" />
                </div>
            </div>

            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                        key={index}
                        className="h-[58vh] w-[70vw] max-w-[18rem] shrink-0 rounded-[2rem]"
                    />
                ))}
            </div>
        </div>
    );
}
