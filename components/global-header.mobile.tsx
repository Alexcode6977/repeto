"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import type { HeaderRendererProps } from "@/components/header-renderer.types";
import { GlobalHeaderAvatar } from "@/components/global-header-avatar";

interface GlobalHeaderMobileProps extends Omit<HeaderRendererProps, "pathname"> {
    avatarInitials: string;
}

export function GlobalHeaderMobile({
    displayName,
    isAdmin,
    avatarUrl,
    avatarInitials,
}: GlobalHeaderMobileProps) {
    return (
        <div className="flex items-center justify-between w-full h-full md:hidden">
            <div className="w-10">
                {isAdmin ? (
                    <Link href="/admin" aria-label="Admin">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/30">
                            <Shield className="w-4 h-4 text-red-400" />
                        </div>
                    </Link>
                ) : null}
            </div>

            <Link
                href="/favoris"
                className="absolute left-1/2 -translate-x-1/2 font-bold tracking-tight text-[#7F77DD] select-none"
                style={{ fontFamily: "var(--font-syne, sans-serif)", fontSize: 20, fontWeight: 800 }}
            >
                Repeto
            </Link>

            <Link href="/profile" className="flex-shrink-0">
                <GlobalHeaderAvatar
                    initials={avatarInitials}
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    size="sm"
                />
            </Link>
        </div>
    );
}
