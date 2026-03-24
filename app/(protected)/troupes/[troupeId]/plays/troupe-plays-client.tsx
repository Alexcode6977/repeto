"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { TroupePlaysScreenDesktop } from "@/app/(protected)/troupes/[troupeId]/plays/troupe-plays-screen.desktop";
import { TroupePlaysScreenMobile } from "@/app/(protected)/troupes/[troupeId]/plays/troupe-plays-screen.mobile";
import { useTroupePlaysScreen } from "@/app/(protected)/troupes/[troupeId]/plays/use-troupe-plays-screen";

export function TroupePlaysClient({
    plays,
    troupeId,
    canManage,
    isAdmin,
    userTier,
    userEmail
}: {
    plays: any[];
    troupeId: string;
    canManage: boolean;
    isAdmin: boolean;
    userTier: any;
    userEmail: string | null;
}) {
    const screen = useTroupePlaysScreen({
        plays,
        troupeId,
        canManage,
        isAdmin,
        userTier,
        userEmail,
    });
    const isDesktop = useMediaQuery("(min-width: 768px)");

    return isDesktop ? (
        <TroupePlaysScreenDesktop {...screen} />
    ) : (
        <TroupePlaysScreenMobile {...screen} />
    );
}
