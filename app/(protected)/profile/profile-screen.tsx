"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { ProfileScreenDesktop } from "@/app/(protected)/profile/profile-screen.desktop";
import { ProfileScreenMobile } from "@/app/(protected)/profile/profile-screen.mobile";
import { useProfileScreen } from "@/app/(protected)/profile/use-profile-screen";

export function ProfileScreen() {
    const profile = useProfileScreen();
    const isDesktop = useMediaQuery("(min-width: 768px)");

    return isDesktop ? (
        <ProfileScreenDesktop {...profile} />
    ) : (
        <ProfileScreenMobile {...profile} />
    );
}
