import { Metadata } from "next";
import { getUserStats } from "@/app/actions/stats";
import { StatsDashboard } from "@/components/stats-dashboard";
import { DashboardHeader } from "@/app/(protected)/dashboard/components/dashboard-header"; // Reuse header? Or simple layout?
// We might want a dedicated page layout.

export const metadata: Metadata = {
    title: "Statistiques | Souffleur",
    description: "Suivez votre progression de répétition.",
};

export default async function StatsPage() {
    const stats = await getUserStats('all');

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-12 pb-32 animate-in fade-in zoom-in duration-500 relative min-h-screen">
            {/* Simple Back Link or Reuse Header? 
                 Let's stick to a clean layout similar to Dashboard but focused.
             */}

            <div className="mb-8">
                <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 mb-4">
                    ← Retour au tableau de bord
                </a>
            </div>

            <StatsDashboard initialStats={stats} />
        </div>
    );
}
