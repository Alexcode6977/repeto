import { getTroupeBasicInfo } from "@/lib/actions/troupe";
import { redirect } from "next/navigation";
import { TroupeSidebar } from "@/components/troupe-sidebar";
import { TroupeMobileNav } from "@/components/troupe-mobile-nav";
import { TroupeHeader } from "@/components/troupe-header";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "alex69.sartre@gmail.com";

export default async function TroupeLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;

    // Parallel fetch: troupe info + user profile
    const supabase = await createClient();
    const [troupe, { data: { user } }] = await Promise.all([
        getTroupeBasicInfo(troupeId),
        supabase.auth.getUser()
    ]);

    if (!troupe) {
        redirect('/troupes');
    }

    let displayName = "Utilisateur";
    let isAdminUser = false;

    if (user) {
        // Get profile in parallel with the initial fetch would be ideal,
        // but since we need user.id, we do it here
        const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .single();

        displayName = profile?.first_name || user.email?.split('@')[0] || "Utilisateur";
        isAdminUser = user.email === ADMIN_EMAIL;
    }

    return (
        <div className="min-h-screen bg-muted/10">
            {/* Header - Fixed & Full Width (Covers Parent Header) */}
            <TroupeHeader
                troupeName={troupe.name}
                displayName={displayName}
                isAdminUser={isAdminUser}
            />

            {/* Sidebar - Visible on Desktop */}
            <div className="hidden md:block">
                <TroupeSidebar troupeId={troupeId} role={troupe.my_role} />
            </div>

            {/* Mobile Navigation - Visible on Mobile */}
            <TroupeMobileNav troupeId={troupeId} role={troupe.my_role} />

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen pb-20 md:pb-0 pt-20 flex flex-col">
                <div className="flex-1 px-4 md:px-8 pb-8 pt-4 md:pt-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
