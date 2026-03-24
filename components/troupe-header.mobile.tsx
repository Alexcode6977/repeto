"use client";

import Link from "next/link";
import { Shield, User } from "lucide-react";
import type { TroupeHeaderRendererProps } from "@/components/header-renderer.types";

export function TroupeHeaderMobile({
    displayName,
    isAdminUser,
}: Omit<TroupeHeaderRendererProps, "troupeName">) {
    return (
        <div className="flex items-center justify-between w-full h-full md:hidden">
            <div className="w-11">
                {isAdminUser ? (
                    <Link href="/admin">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                            <Shield className="w-4 h-4 text-red-400" />
                        </div>
                    </Link>
                ) : null}
            </div>

            <Link
                href="/favoris"
                className="absolute left-1/2 -translate-x-1/2 font-bold tracking-tight text-[#7F77DD] hover:opacity-80 transition-opacity select-none"
                style={{ fontFamily: "var(--font-syne, sans-serif)", fontSize: 20, fontWeight: 800 }}
            >
                Repeto
            </Link>

            <Link href="/profile">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/20 border border-border hover:bg-muted/70 dark:hover:bg-white/10 transition-colors cursor-pointer">
                    <User className="w-4 h-4 text-primary" />
                    <span className="sr-only">{displayName}</span>
                </div>
            </Link>
        </div>
    );
}
