import { getSessionDetails } from "@/lib/actions/session";
import { getTroupeMembers, getTroupeGuests } from "@/lib/actions/troupe";
import { SessionPlannerClient } from "./planner-client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function SessionDetailsPage({
    params
}: {
    params: Promise<{ troupeId: string; eventId: string }>;
}) {
    const { troupeId, eventId } = await params;

    // Fetch all data needed for the planner
    const sessionData = await getSessionDetails(eventId);
    if (!sessionData) return <div>Séance introuvable</div>;

    const members = await getTroupeMembers(troupeId);
    const guests = await getTroupeGuests(troupeId);

    return (
        <div className="space-y-8 pb-20">
            {/* Nav / Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href={`/troupes/${troupeId}/sessions`}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors group w-fit"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Retour aux séances
                </Link>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">
                            {sessionData.title || "Planification de Séance"}
                        </h1>
                        <p className="text-gray-400 font-medium">
                            {new Date(sessionData.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • {sessionData.plays?.title}
                        </p>
                    </div>
                </div>
            </div>

            <SessionPlannerClient
                sessionData={sessionData}
                troupeId={troupeId}
                members={members}
                guests={guests}
            />
        </div>
    );
}
