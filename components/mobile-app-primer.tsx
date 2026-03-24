"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isNativePlatform } from "@/lib/platform/device";
import {
    buildLoginPath,
    DEFAULT_NATIVE_POST_AUTH_DESTINATION,
    DEFAULT_WEB_POST_AUTH_DESTINATION,
} from "@/lib/platform/post-auth-destination";

const MOBILE_PRIME_ROUTES = [
    DEFAULT_NATIVE_POST_AUTH_DESTINATION,
    DEFAULT_WEB_POST_AUTH_DESTINATION,
    "/stats",
    "/troupes",
    buildLoginPath({ isNativeShell: true }),
    "/signup",
];

export function MobileAppPrimer() {
    const router = useRouter();
    const hasPrimedRef = useRef(false);

    useEffect(() => {
        if (!isNativePlatform() || hasPrimedRef.current || typeof window === "undefined") {
            return;
        }

        hasPrimedRef.current = true;

        const timeoutId = window.setTimeout(() => {
            MOBILE_PRIME_ROUTES.forEach((href) => {
                void router.prefetch(href);
            });
        }, 180);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [router]);

    return null;
}
