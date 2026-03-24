"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Users } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface GlobalHeaderProps {
    displayName: string;
    isAdmin: boolean;
    avatarUrl?: string | null;
    initials?: string;
}

export function GlobalHeader({ displayName, isAdmin, avatarUrl, initials }: GlobalHeaderProps) {
    const pathname = usePathname();

    // Hide global header on troupe-specific routes (TroupeHeader handles those)
    // but NOT on /troupes, /troupes/join or /troupes/create
    const isTroupeSpecificRoute = /^\/troupes\/(?!join|create)[^/]+/.test(pathname);

    if (isTroupeSpecificRoute) {
        return null;
    }

    const avatarInitials = initials || (displayName ? displayName.slice(0, 2).toUpperCase() : "?");

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 w-full z-[100] bg-white border-b border-black/[0.06] transition-all duration-200"
            )}
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="relative flex items-center justify-between h-11 md:h-16 px-4 md:px-8 max-w-7xl mx-auto">

                {/* --- MOBILE LAYOUT (Centré Masterclass) --- */}
                <div className="flex md:hidden items-center justify-between w-full h-full">
                    {/* Left — Admin or Spacer */}
                    <div className="w-10">
                        {isAdmin && (
                            <Link href="/admin" aria-label="Admin">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/30">
                                    <Shield className="w-4 h-4 text-red-400" />
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Center — Logo */}
                    <Link
                        href="/favoris"
                        className="absolute left-1/2 -translate-x-1/2 font-bold tracking-tight text-[#7F77DD] select-none"
                        style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 20, fontWeight: 800 }}
                    >
                        Repeto
                    </Link>

                    {/* Right — Avatar */}
                    <Link href="/profile" className="flex-shrink-0">
                        <Avatar initials={avatarInitials} avatarUrl={avatarUrl} displayName={displayName} size="sm" />
                    </Link>
                </div>

                {/* --- DESKTOP LAYOUT (Navigation Classique) --- */}
                <div className="hidden md:flex items-center justify-between w-full h-full">
                    {/* Left — Logo & Nav */}
                    <div className="flex items-center gap-8">
                        <Link
                            href="/favoris"
                            className="font-bold tracking-tight text-[#7F77DD] hover:opacity-80 transition-opacity"
                            style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 24, fontWeight: 800 }}
                        >
                            Repeto
                        </Link>

                        <nav className="flex items-center gap-1">
                            <Link
                                href="/troupes"
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                    pathname.startsWith('/troupes') 
                                        ? "bg-[#7F77DD]/10 text-[#7F77DD]" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                                )}
                            >
                                <Users className="w-4 h-4" />
                                Troupes
                            </Link>
                            {isAdmin && (
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <Shield className="w-4 h-4" />
                                    Admin
                                </Link>
                            )}
                        </nav>
                    </div>

                    {/* Right — User & Profil */}
                    <div className="flex items-center gap-4">
                         <span className="text-sm font-semibold text-foreground hidden lg:inline-block">
                            {displayName}
                        </span>
                        <Link href="/profile" className="flex-shrink-0">
                            <Avatar initials={avatarInitials} avatarUrl={avatarUrl} displayName={displayName} size="md" />
                        </Link>
                    </div>
                </div>

            </div>
        </header>
    );
}

// Sub-component for Avatar to avoid repetition
function Avatar({ initials, avatarUrl, displayName, size }: { initials: string, avatarUrl?: string | null, displayName: string, size: 'sm' | 'md' }) {
    const dimension = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
    return (
        <div
            className={cn(
                "rounded-full overflow-hidden border-2 flex items-center justify-center font-semibold transition-transform hover:scale-105 active:scale-95",
                dimension
            )}
            style={{
                backgroundColor: avatarUrl ? 'transparent' : '#EEEDFE',
                borderColor: '#CECBF6',
                color: '#7F77DD',
                fontFamily: 'var(--font-syne, sans-serif)',
                fontSize: size === 'sm' ? '12px' : '14px'
            }}
        >
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={size === 'sm' ? 32 : 40}
                    height={size === 'sm' ? 32 : 40}
                    className="w-full h-full object-cover"
                />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
}
