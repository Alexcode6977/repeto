"use client";

import { NativeRedirect } from "@/components/native-redirect";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { LandingScreenDesktop } from "@/app/landing-screen.desktop";
import { LandingScreenMobile } from "@/app/landing-screen.mobile";
import { useLandingScreen } from "@/app/use-landing-screen";

export function LandingScreen() {
    const screen = useLandingScreen();
    const isDesktop = useMediaQuery("(min-width: 768px)");

    return (
        <>
            <NativeRedirect />
            {isDesktop ? (
                <LandingScreenDesktop {...screen} />
            ) : (
                <LandingScreenMobile {...screen} />
            )}
        </>
    );
}
