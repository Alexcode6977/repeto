"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface GlobalHeaderAvatarProps {
    initials: string;
    avatarUrl?: string | null;
    displayName: string;
    size: "sm" | "md";
}

export function GlobalHeaderAvatar({
    initials,
    avatarUrl,
    displayName,
    size,
}: GlobalHeaderAvatarProps) {
    const dimension = size === "sm" ? "w-8 h-8" : "w-10 h-10";

    return (
        <div
            className={cn(
                "rounded-full overflow-hidden border-2 flex items-center justify-center font-semibold transition-transform hover:scale-105 active:scale-95",
                dimension
            )}
            style={{
                backgroundColor: avatarUrl ? "transparent" : "#EEEDFE",
                borderColor: "#CECBF6",
                color: "#7F77DD",
                fontFamily: "var(--font-syne, sans-serif)",
                fontSize: size === "sm" ? "12px" : "14px",
            }}
        >
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={size === "sm" ? 32 : 40}
                    height={size === "sm" ? 32 : 40}
                    className="w-full h-full object-cover"
                />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
}
