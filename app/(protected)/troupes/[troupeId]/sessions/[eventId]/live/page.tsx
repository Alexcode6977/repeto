import { getTroupeDetails } from "@/lib/actions/troupe";
import { canManageSessions, canViewSessions } from "@/lib/utils/roles";
import { LiveSessionClient } from "./live-client";
import { redirect } from "next/navigation";
import { buildLiveSessionViewModel } from "@/lib/features/live-session/build-live-session-view-model";
import { getLiveSessionDetails } from "@/lib/features/live-session/live-session-gateway";

export default async function LiveSessionPage({
    params
}: {
    params: Promise<{ troupeId: string; eventId: string }>;
}) {
    const { troupeId, eventId } = await params;
    const sessionData = await getLiveSessionDetails(eventId);
    const troupe = await getTroupeDetails(troupeId);
    if (!troupe || !canViewSessions(troupe.my_roles)) {
        redirect(`/troupes/${troupeId}`);
    }

    // Non-admins/directors are in read-only mode, but allowed to join
    const canControl = canManageSessions(troupe.my_roles);
    const isReadOnly = !canControl;

    if (!sessionData) return <div>Séance introuvable</div>;

    const initialViewModel = buildLiveSessionViewModel({
        sessionData,
        isReadOnly,
    });

    if (initialViewModel.scenes.length === 0) {
        return <div>Veuillez planifier la séance avant de la lancer.</div>;
    }

    return (
        <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] -mx-4 -my-4 md:mx-0 md:my-0 overflow-hidden bg-background">
            <LiveSessionClient
                initialViewModel={initialViewModel}
            />
        </div>
    );
}
