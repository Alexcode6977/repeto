"use client";

import Link from "next/link";
import { User, Shield } from "lucide-react";

interface TroupeHeaderProps {
    troupeName: string;
    displayName: string;
    isAdminUser: boolean; // System admin, not troupe admin
}

export function TroupeHeader({ troupeName, displayName, isAdminUser }: TroupeHeaderProps) {
    return (
        <header className="fixed top-0 left-0 z-[60] w-full h-20 border-b border-border/20 bg-background/60 backdrop-blur-2xl px-8 flex items-center justify-between transition-all duration-200">
            {/* Left: Troupe Identity */}
            <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/25">
                    <span className="text-lg font-bold">{(troupeName[0] || 'T').toUpperCase()}</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground truncate selection:bg-primary/20">
                    {troupeName}
                </h2>
            </div>

            {/* Right: Navigation (Mirrors Global Header) */}
            <div className="flex items-center gap-3">
                <Link href="/troupes">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 border border-border hover:bg-white/10 transition-colors cursor-pointer">
                        <span className="text-xl">🎭</span>
                        <span className="text-sm font-medium text-foreground hidden md:inline-block">Troupes</span>
                    </div>
                </Link>

                {isAdminUser && (
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
