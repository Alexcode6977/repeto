"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GlobalHeader } from "@/components/global-header";
import { SoloNavbar } from "@/components/solo-navbar";
import { getProtectedSurface } from "@/lib/routes/protected-surface";

interface ProtectedChromeProps {
    children: ReactNode;
    displayName: string;
    isAdmin: boolean;
    avatarUrl?: string | null;
    initials?: string;
}

const SOLO_MAIN_CLASS_NAME = "flex-1 w-full relative pb-[env(safe-area-inset-bottom,20px)] md:pb-0 mb-16 md:mb-0";
const PLAIN_MAIN_CLASS_NAME = "flex-1 w-full relative";

export function ProtectedChrome({
    children,
    displayName,
    isAdmin,
    avatarUrl,
    initials,
}: ProtectedChromeProps) {
    const pathname = usePathname();
    const surface = getProtectedSurface(pathname);

    if (surface === "troupe") {
        return <>{children}</>;
    }

    const mainClassName = surface === "solo" ? SOLO_MAIN_CLASS_NAME : PLAIN_MAIN_CLASS_NAME;

    return (
        <>
            {surface === "solo" ? (
                <GlobalHeader
                    displayName={displayName}
                    isAdmin={isAdmin}
                    avatarUrl={avatarUrl}
                    initials={initials}
                />
            ) : null}

            <main className={mainClassName}>{children}</main>

            {surface === "solo" ? <SoloNavbar /> : null}
        </>
    );
}
