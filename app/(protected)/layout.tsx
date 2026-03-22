import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GlobalHeader } from "@/components/global-header";
import { SoloNavbar } from "@/components/solo-navbar";
import { IosInstallPrompt } from "@/components/ios-install-prompt";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { ProtectedThemeScope } from "@/components/protected-theme-scope";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get profile to fetch first_name + avatar_url
    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, avatar_url")
        .eq("id", user.id)
        .single();

    const displayName = profile?.first_name || user.email?.split('@')[0] || "Utilisateur";
    const avatarUrl = profile?.avatar_url || null;
    const isAdmin = isPlatformAdminEmail(user.email);

    // Compute initials from displayName
    const initials = displayName
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="protected-shell min-h-screen bg-transparent flex flex-col font-sans">
            <ProtectedThemeScope />
            {/* Shared Header */}
            <GlobalHeader
                displayName={displayName}
                isAdmin={isAdmin}
                avatarUrl={avatarUrl}
                initials={initials}
            />

            {/* iOS Install Prompt - Handles its own visibility logic */}
            <IosInstallPrompt />

            {/* Mobile Bottom Navigation (Solo Mode) */}
            <SoloNavbar />

            {/* Main Content */}
            <main className="flex-1 w-full relative pb-[env(safe-area-inset-bottom,20px)] md:pb-0 mb-16 md:mb-0">
                {children}
            </main>
        </div>
    );
}
