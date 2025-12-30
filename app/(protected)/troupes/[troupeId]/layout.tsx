import { getTroupeDetails } from "@/lib/actions/troupe";
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
    const troupe = await getTroupeDetails(troupeId);

    if (!troupe) {
        redirect('/troupes');
    }

    // Fetch user for header
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let displayName = "Utilisateur";
    let isAdminUser = false;

    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .single();

        displayName = profile?.first_name || user.email?.split('@')[0] || "Utilisateur";
        isAdminUser = user.email === ADMIN_EMAIL;
    }

    return (
        <div className="min-h-screen bg-background">
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
            <main className="md:ml-64 min-h-screen pb-20 md:pb-0 pt-24 flex flex-col">
                <div className="flex-1 p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
