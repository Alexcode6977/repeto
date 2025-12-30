import { getPlayDetails } from "@/lib/actions/play";
import { getTroupeGuests } from "@/lib/actions/troupe";
import { createClient } from "@/lib/supabase/server";
import { PlayDashboardClient } from "./play-dashboard-client";

export default async function PlayDashboardPage({
    params
}: {
    params: Promise<{ troupeId: string; playId: string }>;
}) {
    const { troupeId, playId } = await params;
    const play = await getPlayDetails(playId);
    if (!play) return <div>Pièce introuvable</div>;

    // Get admin status
    // Optimization: we could just check current user role from updated getTroupeDetails
    const { getTroupeDetails } = await import("@/lib/actions/troupe");
    const troupe = await getTroupeDetails(troupeId);
    const isAdmin = troupe?.my_role === 'admin';

    // Get troupe members for casting dropdown
    const supabase = await createClient();
    const { data: members } = await supabase
        .from('troupe_members')
        .select('user_id, role, profiles(first_name, email)')
        .eq('troupe_id', troupeId);

    const troupeMembers = members || [];
    const guests = await getTroupeGuests(troupeId);

    return (
        <PlayDashboardClient
            play={play}
            troupeId={troupeId}
            troupeMembers={troupeMembers}
            guests={guests}
            isAdmin={isAdmin}
        />
    );
}
