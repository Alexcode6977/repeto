import { getPlayDetails } from "@/lib/actions/play";
import { getTroupeGuests, getTroupeDetails } from "@/lib/actions/troupe";
import { canManageContent, hasRole } from "@/lib/utils/roles";
import { createClient } from "@/lib/supabase/server";
import { PlayDashboardClient } from "./play-dashboard-client";
import { getVoiceConfig } from "@/lib/actions/voice-cache";
import { getPrivateNotes } from "@/lib/actions/private-notes";

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

    // Check explicit roles
    const isDirector = hasRole(troupeDetails?.my_roles, 'metteur_en_scene');
    const isMember = hasRole(troupeDetails?.my_roles, 'member');
    const isAdmin = hasRole(troupeDetails?.my_roles, 'admin'); // Still passed for edge cases, but not used for display logic

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

    // Fetch private notes (Actor Personal Notes)
    const privateNotes = await getPrivateNotes(playId);

    return (
        <PlayDashboardClient
            play={play}
            troupeId={troupeId}
            troupeMembers={troupeMembers}
            guests={guests}
            isAdmin={isAdmin}
            isDirector={isDirector}
            isMember={isMember}
            initialVoiceConfigs={initialVoiceConfigs}
            privateNotes={privateNotes}
        />
    );
}
