import { getSessionDetails, getRawNotes, getMyFeedbacks } from "@/lib/actions/session";
import { getTroupeMembers, getTroupeGuests } from "@/lib/actions/troupe";
import { SessionPlannerClient } from "./planner-client";
import { SessionReadOnlyClient } from "./session-readonly-client";
import { SessionProcessingClient } from "./session-processing-client";
import { SessionValidatedClient } from "./session-validated-client";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function SessionDetailsPage({
    params
}: {
    params: Promise<{ troupeId: string; eventId: string }>;
}) {
    const { troupeId, eventId } = await params;

    // Fetch basic data
    const sessionData = await getSessionDetails(eventId);
    if (!sessionData) return <div>Séance introuvable</div>;

    const members = await getTroupeMembers(troupeId);
    const guests = await getTroupeGuests(troupeId);

    // Fetch User
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id || "";

    // Determine Role
    const currentUserMember = members.find((m: any) => m.user_id === currentUserId);
    const isDirector = currentUserMember?.roles?.includes('director') || currentUserMember?.roles?.includes('admin') || false;

    const status = sessionData.session_plans?.status || 'preparation';

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
                return <SessionReadOnlyClient sessionData={sessionData} troupeId={troupeId} isDirector={isDirector} />;
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
                        <h1 className="text-4xl font-black text-foreground tracking-tighter">
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
