"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import Image from "next/image";

interface GlobalHeaderProps {
    displayName: string;
    isAdmin: boolean;
    avatarUrl?: string | null;
    initials?: string;
}

export function GlobalHeader({ displayName, isAdmin, avatarUrl, initials }: GlobalHeaderProps) {
    const pathname = usePathname();

    // Hide global header on specific troupe routes (TroupeHeader handles those)
    const isTroupeSpecificRoute = /^\/troupes\/[^/]+/.test(pathname);

    if (isTroupeSpecificRoute) {
        return null;
    }

    const avatarInitials = initials || (displayName ? displayName.slice(0, 2).toUpperCase() : "?");

    return (
        <header
            className="fixed top-0 left-0 right-0 w-full z-[100] bg-white border-b border-black/[0.06] transition-all duration-200"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            <div className="relative flex items-center justify-between h-11 px-4">

                {/* Left — Empty spacer pour centrer le titre */}
                <div className="w-10 flex-shrink-0">
                    {isAdmin && (
                        <Link href="/admin" aria-label="Admin">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                                <Shield className="w-4 h-4 text-red-400" />
                            </div>
                        </Link>
                    )}
                </div>

                {/* Center — Logo Repeto */}
                <Link
                    href="/favoris"
                    className="absolute left-1/2 -translate-x-1/2 font-bold tracking-tight text-[#7F77DD] hover:opacity-80 transition-opacity select-none"
                    style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 20, fontWeight: 800 }}
                >
                    Repeto
                </Link>

                {/* Right — Avatar */}
                <Link href="/profile" className="flex-shrink-0" aria-label="Profil">
                    <div
                        className="w-8 h-8 rounded-full overflow-hidden border-2 flex items-center justify-center text-xs font-semibold transition-transform hover:scale-105 active:scale-95"
                        style={{
                            backgroundColor: avatarUrl ? 'transparent' : '#EEEDFE',
                            borderColor: '#CECBF6',
                            color: '#7F77DD',
                            fontFamily: 'var(--font-syne, sans-serif)',
                        }}
                    >
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt={displayName}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span>{avatarInitials}</span>
                        )}
                    </div>
                </Link>
            </div>
        </header>
    );
}
