import { getTroupeSessions } from "@/lib/actions/session";
import { getTroupeDetails } from "@/lib/actions/troupe";
import { canManageSessions, canViewSessions } from "@/lib/utils/roles";
import { SessionListClient } from "../session-list-client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MobileSessionListPage({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);
    if (!troupe || !canViewSessions(troupe.my_roles)) {
        redirect(`/troupes/${troupeId}`);
    }

    const sessions = await getTroupeSessions(troupeId);
    const isAdmin = canManageSessions(troupe.my_roles);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2 mb-6">
                <Link href={`/troupes/${troupeId}/sessions`} className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </Link>
                <h1 className="text-2xl font-black tracking-tighter">Planning</h1>
            </div>

            <SessionListClient
                sessions={sessions}
                troupeId={troupeId}
                isAdmin={isAdmin}
            />
        </div>
    );
}
