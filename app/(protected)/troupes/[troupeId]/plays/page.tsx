import { getTroupePlays } from "@/lib/actions/play";
import { getTroupeDetails } from "@/lib/actions/troupe";
import { canManageContent, canManageTroupe } from "@/lib/utils/roles";
import { TroupePlaysClient } from "./troupe-plays-client";
import { createClient } from "@/lib/supabase/server";

export default async function TroupePlaysPage({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);
    const plays = await getTroupePlays(troupeId);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!troupe) return <div>Troupe not found</div>;

    const canManage = canManageContent(troupe.my_roles);
    const isAdmin = canManageTroupe(troupe.my_roles);

    // TODO: if you have user tier logic (free/troupe/etc), parse it or fetch it.
    // Assuming you have a getUserTierAction or similar, or just mock it to 'troupe' for now.
    const userTier = "troupe"; 

    return (
        <TroupePlaysClient 
            plays={plays}
            troupeId={troupeId}
            canManage={canManage}
            isAdmin={isAdmin}
            userTier={userTier}
            userEmail={user?.email || null}
        />
    );
}
