import { getSessionDetails } from "@/lib/actions/session";
import { LiveSessionClient } from "./live-client";

export default async function LiveSessionPage({
    params
}: {
    params: Promise<{ troupeId: string; eventId: string }>;
}) {
    const { troupeId, eventId } = await params;
    const sessionData = await getSessionDetails(eventId);

    if (!sessionData) return <div>Séance introuvable</div>;
    if (!sessionData.session_plans || sessionData.session_plans.selected_scenes.length === 0) {
        return <div>Veuillez planifier la séance avant de la lancer.</div>;
    }

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            <LiveSessionClient
                sessionData={sessionData}
                troupeId={troupeId}
            />
        </div>
    );
}
