import { getPlayDetails } from "@/lib/actions/play";
import { getTroupeGuests } from "@/lib/actions/troupe";
import { createClient } from "@/lib/supabase/server";
import { AnnotatorClient } from "./annotator-client";

export default async function AnnotatePage({
    params
}: {
    params: Promise<{ troupeId: string; playId: string }>;
}) {
    const { troupeId, playId } = await params;
    const play = await getPlayDetails(playId);

    if (!play) return <div>Pièce introuvable</div>;

    // Verify permissions (Director/Admin only)
    const { getTroupeDetails } = await import("@/lib/actions/troupe");
    const { hasRole } = await import("@/lib/utils/roles");
    const troupeDetails = await getTroupeDetails(troupeId);

    const canManage = hasRole(troupeDetails?.my_roles, 'admin') || hasRole(troupeDetails?.my_roles, 'metteur_en_scene');

    if (!canManage) {
        return <div className="p-8 text-center">Accès non autorisé</div>;
    }

    // Get troupe members for casting/actors list
    const supabase = await createClient();
    const { data: members } = await supabase
        .from('troupe_members')
        .select('user_id, role, profiles(first_name, email, avatar_url)')
        .eq('troupe_id', troupeId);

    const troupeMembers = members || [];
    const guests = await getTroupeGuests(troupeId);

    return (
        <AnnotatorClient
            play={play}
            troupeId={troupeId}
            troupeMembers={troupeMembers}
            guests={guests}
        />
    );
}
