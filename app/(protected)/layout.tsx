import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IosInstallPrompt } from "@/components/ios-install-prompt";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { ProtectedThemeScope } from "@/components/protected-theme-scope";
import { ProtectedChrome } from "@/components/protected-chrome";

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
            <IosInstallPrompt />
            <ProtectedChrome
                displayName={displayName}
                isAdmin={isAdmin}
                avatarUrl={avatarUrl}
                initials={initials}
            >
                {children}
            </ProtectedChrome>
        </div>
    );
}
