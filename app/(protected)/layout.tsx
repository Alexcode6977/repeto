import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User, Shield } from "lucide-react";
import { redirect } from "next/navigation";

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

    const isAdmin = user.email === ADMIN_EMAIL;

    return (
        <div className="min-h-screen bg-transparent flex flex-col font-sans">
            {/* Shared Header */}
            <header className="w-full p-6 flex items-center justify-between z-50">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                    {/* Small Logo */}
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <div className="w-6 h-6 rounded-full bg-primary blur-md absolute opacity-50" />
                        <span className="relative text-xl">🎭</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">Repeto</span>
                </Link>

                <div className="flex items-center gap-3">
                    {/* Admin Button - Only visible for admin */}
                    {isAdmin && (
                        <Link href="/admin">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer">
                                <Shield className="w-4 h-4 text-red-400" />
                                <span className="text-sm font-bold text-red-400 hidden md:inline-block">
                                    Admin
                                </span>
                            </div>
                        </Link>
                    )}

                    <Link href="/profile">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-white hidden md:inline-block">
                                {user.email?.split('@')[0]}
                            </span>
                        </div>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-12 relative">
                {children}
            </main>
        </div>
    );
}
