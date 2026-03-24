"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { HeaderRendererProps } from "@/components/header-renderer.types";
import { GlobalHeaderDesktop } from "@/components/global-header.desktop";
import { GlobalHeaderMobile } from "@/components/global-header.mobile";

type GlobalHeaderProps = Omit<HeaderRendererProps, "pathname">;

export function GlobalHeader({ displayName, isAdmin, avatarUrl, initials }: GlobalHeaderProps) {
    const pathname = usePathname();
    const avatarInitials = initials || (displayName ? displayName.slice(0, 2).toUpperCase() : "?");

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 w-full z-[100] bg-white border-b border-black/[0.06] transition-all duration-200"
            )}
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="relative flex items-center justify-between h-11 md:h-16 px-4 md:px-8 max-w-7xl mx-auto">
                <GlobalHeaderMobile
                    displayName={displayName}
                    isAdmin={isAdmin}
                    avatarUrl={avatarUrl}
                    avatarInitials={avatarInitials}
                />
                <GlobalHeaderDesktop
                    displayName={displayName}
                    isAdmin={isAdmin}
                    avatarUrl={avatarUrl}
                    avatarInitials={avatarInitials}
                    pathname={pathname}
                />
            </div>
        </header>
    );
}
