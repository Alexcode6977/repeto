import { getPlayDetails } from "@/lib/actions/play";
import { getTroupeGuests, getTroupeDetails } from "@/lib/actions/troupe";
import { canManageContent } from "@/lib/utils/roles";
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

    // Get admin/director status
    const troupeDetails = await getTroupeDetails(troupeId);

    // Check if user can manage casting (Admin or Metteur en scène)
    const canManage = canManageContent(troupeDetails?.my_roles);

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
