import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUserStats } from "@/app/actions/stats";
import { StatsDashboard } from "@/components/stats-dashboard";
import { DashboardHeader } from "@/app/(protected)/dashboard/components/dashboard-header"; // Reuse header? Or simple layout?
// We might want a dedicated page layout.

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
        <div className="max-w-7xl mx-auto p-6 md:p-12 pb-32 animate-in fade-in zoom-in duration-500 relative min-h-screen">
            {/* Simple Back Link or Reuse Header? 
                 Let's stick to a clean layout similar to Dashboard but focused.
             */}

            <div className="mb-8">
                <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Retour à la page d'accueil
                </Link>
            </div>

            <StatsDashboard initialStats={stats} initialSelectedPlayId={playId} />
        </div>
    );
}
