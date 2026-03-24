"use client";

import Link from "next/link";
import { Shield, Users } from "lucide-react";
import type { HeaderRendererProps } from "@/components/header-renderer.types";
import { cn } from "@/lib/utils";
import { GlobalHeaderAvatar } from "@/components/global-header-avatar";

interface GlobalHeaderDesktopProps extends HeaderRendererProps {
    avatarInitials: string;
}

export function GlobalHeaderDesktop({
    displayName,
    isAdmin,
    avatarUrl,
    avatarInitials,
    pathname,
}: GlobalHeaderDesktopProps) {
    return (
        <div className="hidden md:flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-8">
                <Link
                    href="/favoris"
                    className="font-bold tracking-tight text-[#7F77DD] hover:opacity-80 transition-opacity"
                    style={{ fontFamily: "var(--font-syne, sans-serif)", fontSize: 24, fontWeight: 800 }}
                >
                    Repeto
                </Link>

                <nav className="flex items-center gap-1">
                    <Link
                        href="/troupes"
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                            pathname.startsWith("/troupes")
                                ? "bg-[#7F77DD]/10 text-[#7F77DD]"
                                : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                        )}
                    >
                        <Users className="w-4 h-4" />
                        Troupes
                    </Link>
                    {isAdmin ? (
                        <Link
                            href="/admin"
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <Shield className="w-4 h-4" />
                            Admin
                        </Link>
                    ) : null}
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-foreground hidden lg:inline-block">
                    {displayName}
                </span>
                <Link href="/profile" className="flex-shrink-0">
                    <GlobalHeaderAvatar
                        initials={avatarInitials}
                        avatarUrl={avatarUrl}
                        displayName={displayName}
                        size="md"
                    />
                </Link>
            </div>
        </div>
    );
}
