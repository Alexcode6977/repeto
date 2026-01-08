"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalHeaderProps {
    displayName: string;
    isAdmin: boolean;
}

export function GlobalHeader({ displayName, isAdmin }: GlobalHeaderProps) {
    const pathname = usePathname();

    // Hide global header on specific troupe routes to avoid double header
    // Check if path starts with /troupes/ and has an ID following it
    // e.g. /troupes/123... -> Hide
    // /troupes -> Show (List view)
    const isTroupeSpecificRoute = /^\/troupes\/[^/]+/.test(pathname);

    if (isTroupeSpecificRoute) {
        return null;
    }

    return (
        <header className="w-full p-6 flex items-center justify-between z-50">
            <Link href="/dashboard" className="flex items-center gap-2 group">
                {/* Small Logo */}
                <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-border flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <div className="w-6 h-6 rounded-full bg-primary blur-md absolute opacity-50" />
                    <span className="relative text-xl">🎭</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">Repeto</span>
            </Link>

            <div className="flex items-center gap-3">
                <Link href="/troupes">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 border border-border hover:bg-white/10 transition-colors cursor-pointer mr-2">
                        <span className="text-xl">🎭</span>
                        <span className="text-sm font-medium text-foreground hidden md:inline-block">Troupes</span>
                    </div>
                </Link>

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
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-secondary/20 border border-border hover:bg-white/10 transition-colors cursor-pointer">
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground hidden md:inline-block">
                            {displayName}
                        </span>
                    </div>
                </Link>
            </div>
        </header>
    );
}
