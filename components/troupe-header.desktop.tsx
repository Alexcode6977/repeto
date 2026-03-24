"use client";

import Link from "next/link";
import { Shield, User } from "lucide-react";
import type { TroupeHeaderRendererProps } from "@/components/header-renderer.types";

export function TroupeHeaderDesktop({
    troupeName,
    displayName,
    isAdminUser,
}: TroupeHeaderRendererProps) {
    return (
        <div className="hidden md:flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/25">
                    <span className="text-lg font-bold">{(troupeName[0] || "T").toUpperCase()}</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground truncate selection:bg-primary/20">
                    {troupeName}
                </h2>
            </div>

            <div className="flex items-center gap-3">
                <Link href="/troupes">
                    <div className="flex h-auto items-center justify-start gap-2 px-4 py-2 rounded-full bg-secondary/20 border border-border hover:bg-muted/70 dark:hover:bg-white/10 transition-colors cursor-pointer">
                        <span className="text-xl">🎭</span>
                        <span className="text-sm font-medium text-foreground">Troupes</span>
                    </div>
                </Link>

                {isAdminUser ? (
                    <Link href="/admin">
                        <div className="flex h-auto items-center justify-start gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer">
                            <Shield className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-bold text-red-400">
                                Admin
                            </span>
                        </div>
                    </Link>
                ) : null}

                <Link href="/profile">
                    <div className="flex h-auto items-center justify-start gap-3 px-4 py-2 rounded-full bg-secondary/20 border border-border hover:bg-muted/70 dark:hover:bg-white/10 transition-colors cursor-pointer">
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                            {displayName}
                        </span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
