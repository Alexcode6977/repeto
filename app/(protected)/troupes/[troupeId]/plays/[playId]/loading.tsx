import { Skeleton } from "@/components/ui/skeleton";

export default function PlayDashboardLoading() {
    return (
        <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-auto gap-4 p-4 md:p-0 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 mb-2">
                <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>

            {/* Character Carousel */}
            <div className="shrink-0 space-y-3">
                <div className="flex items-center justify-between px-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex gap-4 overflow-hidden pb-4 -mx-4 px-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[85px]">
                            <Skeleton className="w-16 h-16 rounded-full" />
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-2 w-10" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Grid (2x2) */}
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                {/* Lire */}
                <div className="bg-green-500/10 rounded-3xl flex flex-col items-center justify-center gap-3 p-4">
                    <Skeleton className="w-12 h-12 rounded-full bg-green-500/20" />
                    <Skeleton className="h-5 w-12 bg-green-500/20" />
                    <Skeleton className="h-3 w-20 bg-green-500/10" />
                </div>

                {/* Répéter */}
                <div className="bg-primary/10 rounded-3xl flex flex-col items-center justify-center gap-3 p-4">
                    <Skeleton className="w-12 h-12 rounded-full bg-primary/20" />
                    <Skeleton className="h-5 w-16 bg-primary/20" />
                    <Skeleton className="h-3 w-24 bg-primary/10" />
                </div>

                {/* Écouter */}
                <div className="bg-teal-500/10 rounded-3xl flex flex-col items-center justify-center gap-3 p-4">
                    <Skeleton className="w-12 h-12 rounded-full bg-teal-500/20" />
                    <Skeleton className="h-5 w-16 bg-teal-500/20" />
                    <Skeleton className="h-3 w-16 bg-teal-500/10" />
                </div>

                {/* Enregistrer */}
                <div className="bg-red-500/10 rounded-3xl flex flex-col items-center justify-center gap-3 p-4">
                    <Skeleton className="w-12 h-12 rounded-full bg-red-500/20" />
                    <Skeleton className="h-5 w-20 bg-red-500/20" />
                    <Skeleton className="h-3 w-14 bg-red-500/10" />
                </div>
            </div>
        </div>
    );
}
