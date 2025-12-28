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
        <div className="h-[calc(100vh-120px)] flex flex-col space-y-6">
            <div>
                <h1 className="text-4xl font-black text-foreground tracking-tighter">
                    Séance : {sessionData.title || "En cours"}
                </h1>
                <p className="text-muted-foreground font-medium">
                    {new Date(sessionData.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • {sessionData.session_plans.selected_scenes.length} scènes au programme
                </p>
            </div>

            <LiveSessionClient
                sessionData={sessionData}
                troupeId={troupeId}
            />
        </div>
    );
}
