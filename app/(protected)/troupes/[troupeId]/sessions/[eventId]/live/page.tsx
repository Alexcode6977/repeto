import { getSessionDetails } from "@/lib/actions/session";
import { getTroupeDetails } from "@/lib/actions/troupe";
import { isAdminRole } from "@/lib/utils/roles";
import { LiveSessionClient } from "./live-client";
import { createClient } from "@/lib/supabase/server";

export default async function LiveSessionPage({
    params
}: {
    params: Promise<{ troupeId: string; eventId: string }>;
}) {
    const { troupeId, eventId } = await params;
    const sessionData = await getSessionDetails(eventId);
    const troupe = await getTroupeDetails(troupeId);

    // Non-admins are in read-only mode
    const isReadOnly = !isAdminRole(troupe?.my_role);

    if (!sessionData) return <div>Séance introuvable</div>;
    if (!sessionData.session_plans || sessionData.session_plans.selected_scenes.length === 0) {
        return <div>Veuillez planifier la séance avant de la lancer.</div>;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch profile for name
    let username = "Utilisateur";
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', user.id)
            .single();
        username = profile?.first_name || profile?.email || "Utilisateur";
    }

    return (
        <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] -mx-4 -my-4 md:mx-0 md:my-0 overflow-hidden bg-background">
            <LiveSessionClient
                sessionData={sessionData}
                troupeId={troupeId}
                isReadOnly={isReadOnly}
                currentUser={{
                    id: user?.id || "guest",
                    name: username
                }}
            />
        </div>
    );
}
