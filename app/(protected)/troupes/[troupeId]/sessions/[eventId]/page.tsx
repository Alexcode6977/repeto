import { getSessionDetails, getRawNotes, getMyFeedbacks } from "@/lib/actions/session";
import { getTroupeMembers, getTroupeGuests, getTroupeDetails } from "@/lib/actions/troupe";
import { SessionPlannerClient } from "./planner-client";
import { SessionReadOnlyClient } from "./session-readonly-client";
import { SessionProcessingClient } from "./session-processing-client";
import { SessionValidatedClient } from "./session-validated-client";
import { canManageSessions, canViewSessions } from "@/lib/utils/roles";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function SessionDetailsPage({
    params
}: {
    params: Promise<{ troupeId: string; eventId: string }>;
}) {
    const { troupeId, eventId } = await params;
    const troupe = await getTroupeDetails(troupeId);
    if (!troupe || !canViewSessions(troupe.my_roles)) {
        redirect(`/troupes/${troupeId}`);
    }

    // Fetch basic data
    const sessionData = await getSessionDetails(eventId);
    if (!sessionData) return <div>Séance introuvable</div>;

    const plan = Array.isArray(sessionData.session_plans) ? sessionData.session_plans[0] : sessionData.session_plans;
    const status = plan?.status || 'preparation';
    const canManage = canManageSessions(troupe.my_roles);

    // Preparation and processing are restricted to session managers.
    if ((status === 'preparation' || status === 'processing') && !canManage) {
        redirect(`/troupes/${troupeId}/sessions`);
    }

    const members = await getTroupeMembers(troupeId);
    const guests = await getTroupeGuests(troupeId);

    // Conditional Data Fetching
    let rawNotes: any[] = [];
    let feedbacks: any[] = [];

    if (status === 'processing') {
        rawNotes = await getRawNotes(eventId);
    }
    if (status === 'validated') {
        feedbacks = await getMyFeedbacks(eventId);
    }

    const renderContent = () => {
        switch (status) {
            case 'upcoming':
                return <SessionReadOnlyClient sessionData={sessionData} troupeId={troupeId} isDirector={canManage} members={members} guests={guests} />;
            case 'processing':
                return <SessionProcessingClient sessionData={sessionData} troupeId={troupeId} rawNotes={rawNotes || []} />;
            case 'validated':
                return <SessionValidatedClient sessionData={sessionData} feedbacks={feedbacks || []} />;
            case 'preparation':
            default:
                return (
                    <SessionPlannerClient
                        sessionData={sessionData}
                        troupeId={troupeId}
                        members={members}
                        guests={guests}
                    />
                );
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Nav / Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href={`/troupes/${troupeId}/sessions`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Retour aux séances
                </Link>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">
                            {status === 'preparation' ? `Préparation : ${sessionData.title}` :
                                status === 'upcoming' ? `Séance à venir : ${sessionData.title}` :
                                    status === 'processing' ? `Débriefing : ${sessionData.title}` :
                                        `Compte-Rendu : ${sessionData.title}`}
                        </h1>
                        <p className="text-muted-foreground font-medium">
                            {new Date(sessionData.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • {sessionData.plays?.length} pièce{sessionData.plays?.length > 1 ? 's' : ''} disponible{sessionData.plays?.length > 1 ? 's' : ''}
                        </p>

                    </div>
                </div>
            </div>

            {renderContent()}
        </div>
    );
}
