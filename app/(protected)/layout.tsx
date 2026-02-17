import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GlobalHeader } from "@/components/global-header";
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

    // Get profile to fetch first_name
    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

    const displayName = profile?.first_name || user.email?.split('@')[0] || "Utilisateur";
    const isAdmin = isPlatformAdminEmail(user.email);

    return (
        <div className="protected-shell min-h-screen bg-transparent flex flex-col font-sans">
            <ProtectedThemeScope />
            {/* Shared Header - Conditionally rendered via client component */}
            <GlobalHeader displayName={displayName} isAdmin={isAdmin} />

            {/* iOS Install Prompt - Handles its own visibility logic */}
            <IosInstallPrompt />

            {/* Main Content */}
            <main className="flex-1 w-full relative">
                {children}
            </main>
        </div>
    );
}
