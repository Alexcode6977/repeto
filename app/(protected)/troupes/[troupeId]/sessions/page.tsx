import { getTroupeSessions } from "@/lib/actions/session";
import { getTroupeDetails } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button";
import { ClipboardList, MessageSquare } from "lucide-react";
import Link from "next/link";
import { SessionsMobileChoices } from "./sessions-mobile-choices";
import { SessionListClient } from "./session-list-client";

export default async function SessionsPage({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);
    const sessions = await getTroupeSessions(troupeId);
    // Check for expanded permissions (Admin, Adjoint, Metteur en scène)
    // We need to import the helper or check roles manually. 
    // troupe.my_role is a string (primary role), but we should check the array if available.
    // However, getTroupeDetails returns `my_role` as string, NOT `my_roles` array (Wait, did I not fix this?)
    // Checking `troupe.ts` again... getTroupeDetails returns `my_roles` (plural).
    // Let's verify what `getTroupeDetails` returns in `page.tsx`.

    // In `lib/actions/troupe.ts`: `return { ...troupe, my_roles: roles };`
    // So distinct property `my_roles`.

    const { hasRole } = await import("@/lib/utils/roles");
    const canManage = hasRole(troupe?.my_roles, 'admin') ||
        hasRole(troupe?.my_roles, 'metteur_en_scene') ||
        hasRole(troupe?.my_roles, 'adjoint');

    // We pass this as 'isAdmin' to the client component to unlock the view
    const isAdmin = canManage;

    return (
        <div className="space-y-6 md:space-y-10">
            {/* Header - Desktop Only */}
            <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground mb-2">
                        Séances
                    </h1>
                    <p className="text-gray-400 font-medium flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Planifiez vos répétitions et consultez vos feedbacks
                    </p>
                </div>

                {!isAdmin && (
                    <Button asChild className="rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary">
                        <Link href={`/troupes/${troupeId}/sessions/my-feedbacks`} className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Mon Journal de Notes
                        </Link>
                    </Button>
                )}
            </div>

            {/* Mobile Nav Hub - Admin Only */}
            {isAdmin && <SessionsMobileChoices troupeId={troupeId} />}

            {/* Session List (The "Planifier" content) */}
            <div id="planning-section" className={isAdmin ? "hidden md:block" : "block"}>
                <SessionListClient
                    sessions={sessions}
                    troupeId={troupeId}
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    );
}
