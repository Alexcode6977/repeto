import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User, Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { GlobalHeader } from "@/components/global-header";
import { IosInstallPrompt } from "@/components/ios-install-prompt";

const ADMIN_EMAIL = "alex69.sartre@gmail.com";

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
    const isAdmin = user.email === ADMIN_EMAIL;

    return (
        <div className="min-h-screen bg-transparent flex flex-col font-sans">
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


