import { Metadata } from "next";
import { getUserStats } from "@/app/actions/stats";
import { StatsDashboard } from "@/components/stats-dashboard";

export const metadata: Metadata = {
    title: "Statistiques | Souffleur",
    description: "Suivez votre progression de répétition.",
};

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StatsPage({ searchParams }: PageProps) {
    const stats = await getUserStats('all');
    const params = await searchParams;
    const playId = typeof params.playId === 'string' ? params.playId : undefined;

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-12 pb-10 pt-24 md:pt-32 animate-in fade-in zoom-in duration-500 relative">
            <StatsDashboard initialStats={stats} initialSelectedPlayId={playId} />
        </div>
    );
}
