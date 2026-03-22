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
        <header 
            className="fixed top-0 left-0 z-[60] w-full border-b border-border/20 bg-background/60 backdrop-blur-2xl transition-all duration-200"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
           <div className="flex h-20 items-center justify-between px-8 w-full">
            {/* Left: Identity (Adaptive) */}
            <div className="flex items-center gap-4 min-w-0">

                {/* Mobile Identity: Repeto App Style (Mirrors GlobalHeader) */}
                <Link
                    href="/favoris"
                    className="absolute left-1/2 -translate-x-1/2 font-bold tracking-tight text-[#7F77DD] hover:opacity-80 transition-opacity select-none md:hidden"
                    style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 20, fontWeight: 800 }}
                >
                    Repeto
                </Link>

                {/* Desktop Identity: Troupe Style */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/25">
                        <span className="text-lg font-bold">{(troupeName[0] || 'T').toUpperCase()}</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground truncate selection:bg-primary/20">
                        {troupeName}
                    </h2>
                </div>
            </div>

            {/* Right: Navigation (Mirrors Global Header) */}
            <div className="flex items-center gap-3">
                <Link href="/troupes">
                    <div className="flex h-11 w-11 md:h-auto md:w-auto items-center justify-center md:justify-start gap-2 px-0 md:px-4 py-0 md:py-2 rounded-full bg-secondary/20 border border-border hover:bg-muted/70 dark:hover:bg-white/10 transition-colors cursor-pointer">
                        <span className="text-xl">🎭</span>
                        <span className="text-sm font-medium text-foreground hidden md:inline-block">Troupes</span>
                    </div>
                </Link>

                {isAdminUser && (
                    <Link href="/admin">
                        <div className="flex h-11 w-11 md:h-auto md:w-auto items-center justify-center md:justify-start gap-2 px-0 md:px-4 py-0 md:py-2 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer">
                            <Shield className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-bold text-red-400 hidden md:inline-block">
                                Admin
                            </span>
                        </div>
                    </Link>
                )}

                <Link href="/profile">
                    <div className="flex h-11 w-11 md:h-auto md:w-auto items-center justify-center md:justify-start gap-3 px-0 md:px-4 py-0 md:py-2 rounded-full bg-secondary/20 border border-border hover:bg-muted/70 dark:hover:bg-white/10 transition-colors cursor-pointer">
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground hidden md:inline-block">
                            {displayName}
                        </span>
                    </div>
                </Link>
            </div>
          </div>
        </header>
    );
}
