import { getPlayDetails } from "@/lib/actions/play";
import { getTroupeGuests } from "@/lib/actions/troupe";
import { createClient } from "@/lib/supabase/server";
import { PlayDashboardClient } from "./play-dashboard-client";
import { getVoiceConfig } from "@/lib/actions/voice-cache";

export default async function PlayDashboardPage({
    params
}: {
    params: Promise<{ troupeId: string; playId: string }>;
}) {
    const { troupeId, playId } = await params;
    const play = await getPlayDetails(playId);
    if (!play) return <div>Pièce introuvable</div>;

    // Get admin status
    // Get admin/director status
    const { getTroupeDetails } = await import("@/lib/actions/troupe");
    const { hasRole } = await import("@/lib/utils/roles");
    const troupeDetails = await getTroupeDetails(troupeId);

    // Check if user can manage casting (Admin or Metteur en scène)
    // Note: getTroupeDetails returns 'my_roles' (array)
    const canManage = hasRole(troupeDetails?.my_roles, 'admin') || hasRole(troupeDetails?.my_roles, 'metteur_en_scene');

    // Get troupe members for casting dropdown
    const supabase = await createClient();
    const { data: members } = await supabase
        .from('troupe_members')
        .select('user_id, role, profiles(first_name, email)')
        .eq('troupe_id', troupeId);

    const troupeMembers = members || [];
    const guests = await getTroupeGuests(troupeId);

    // Fetch voice configs
    const initialVoiceConfigs = await getVoiceConfig('troupe_play', playId);

    return (
        <PlayDashboardClient
            play={play}
            troupeId={troupeId}
            troupeMembers={troupeMembers}
            guests={guests}
            isAdmin={canManage}
            initialVoiceConfigs={initialVoiceConfigs}
        />
    );
}
