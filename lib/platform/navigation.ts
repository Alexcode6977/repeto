import { isNativePlatform } from "@/lib/platform/device";

interface RouterLike {
    prefetch: (href: string) => void | Promise<void>;
    push: (href: string, options?: { scroll?: boolean }) => void;
}

export function shouldAnimateRouteTransitions() {
    return !isNativePlatform();
}

export function warmPlatformRoute(
    router: RouterLike,
    href: string,
    prefetchedHrefs: Set<string>
) {
    if (prefetchedHrefs.has(href)) {
        return;
    }

    prefetchedHrefs.add(href);
    void router.prefetch(href);
}

export function primePlatformRoutes(
    router: RouterLike,
    hrefs: string[],
    prefetchedHrefs: Set<string>
) {
    if (!isNativePlatform()) {
        return;
    }

    hrefs.forEach((href) => {
        warmPlatformRoute(router, href, prefetchedHrefs);
    });
}

export function scheduleNavigationStateReset(callback: () => void) {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    const frameId = window.requestAnimationFrame(callback);

    return () => {
        window.cancelAnimationFrame(frameId);
    };
}
