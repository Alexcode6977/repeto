"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { isNativePlatform } from "@/lib/platform/device";
import {
    primePlatformRoutes,
    scheduleNavigationStateReset,
    warmPlatformRoute,
} from "@/lib/platform/navigation";
import {
    beginMobileTabTransition,
    completeMobileTabTransition,
    type MobileTabHref,
} from "@/lib/mobile-tab-transition";

const SCROLL_STORAGE_PREFIX = "mobile-tab-scroll";

export interface MobileNavItem {
    href: string;
    label: string;
    match: (pathname: string) => boolean;
    restoreKey?: string;
    restoreOn?: (pathname: string) => boolean;
}

function shouldRestoreScroll(item: MobileNavItem, pathname: string) {
    if (item.restoreOn) {
        return item.restoreOn(pathname);
    }

    return pathname === item.href;
}

function getScrollStorageKey(item: MobileNavItem) {
    return `${SCROLL_STORAGE_PREFIX}:${item.restoreKey || item.href}`;
}

export function useMobileTabNavigation(items: MobileNavItem[]) {
    const pathname = usePathname();
    const router = useRouter();
    const nativeShell = isNativePlatform();
    const { selection } = useHaptics();
    const prefetchedHrefs = useRef(new Set<string>());
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const currentItem = items.find((item) => item.match(pathname)) || null;
    const activeHref = pendingHref && isPending ? pendingHref : currentItem?.href || null;

    useEffect(() => {
        if (!nativeShell) {
            return;
        }

        primePlatformRoutes(router, items.map((item) => item.href), prefetchedHrefs.current);
    }, [items, nativeShell, router]);

    useEffect(() => {
        if (!pendingHref || isPending) {
            return;
        }

        const cancelFrame = scheduleNavigationStateReset(() => {
            setPendingHref(null);
        });

        return () => {
            cancelFrame();
        };
    }, [isPending, pendingHref, pathname]);

    useEffect(() => {
        if (!nativeShell || !currentItem) {
            return;
        }

        const cancelFrame = scheduleNavigationStateReset(() => {
            completeMobileTabTransition(currentItem.href);
        });

        return () => {
            cancelFrame();
        };
    }, [currentItem, nativeShell, pathname]);

    useEffect(() => {
        if (typeof window === "undefined" || !currentItem || !shouldRestoreScroll(currentItem, pathname)) {
            return;
        }

        const storageKey = getScrollStorageKey(currentItem);
        const storedPosition = window.sessionStorage.getItem(storageKey);

        const restoreScroll = () => {
            if (storedPosition === null) {
                window.scrollTo({ top: 0, behavior: "auto" });
                return;
            }

            const nextTop = Number.parseInt(storedPosition, 10);

            if (Number.isFinite(nextTop)) {
                window.scrollTo({ top: nextTop, behavior: "auto" });
            }
        };

        let writeFrame = 0;
        const persistScroll = () => {
            if (writeFrame) {
                return;
            }

            writeFrame = window.requestAnimationFrame(() => {
                window.sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
                writeFrame = 0;
            });
        };

        const restoreFrame = window.requestAnimationFrame(() => {
            restoreScroll();
            window.requestAnimationFrame(restoreScroll);
        });

        persistScroll();
        window.addEventListener("scroll", persistScroll, { passive: true });
        window.addEventListener("pagehide", persistScroll);

        return () => {
            persistScroll();
            window.removeEventListener("scroll", persistScroll);
            window.removeEventListener("pagehide", persistScroll);
            window.cancelAnimationFrame(restoreFrame);

            if (writeFrame) {
                window.cancelAnimationFrame(writeFrame);
            }
        };
    }, [currentItem, pathname]);

    function warmRoute(href: string) {
        warmPlatformRoute(router, href, prefetchedHrefs.current);
    }

    function triggerNavigationFeedback() {
        void selection();
    }

    function isCurrentRoot(item: MobileNavItem) {
        return currentItem?.href === item.href && shouldRestoreScroll(item, pathname);
    }

    function shouldLetBrowserHandle(event: MouseEvent<HTMLAnchorElement>) {
        return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    }

    function navigateTo(item: MobileNavItem) {
        setPendingHref(item.href);
        beginMobileTabTransition(item.href as MobileTabHref);

        startTransition(() => {
            router.push(item.href, { scroll: false });
        });
    }

    function getLinkProps(item: MobileNavItem) {
        const handleTouchStart = () => {
            warmRoute(item.href);
        };

        const handleFocus = () => {
            warmRoute(item.href);
        };

        const handleMouseEnter = () => {
            warmRoute(item.href);
        };

        const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
            triggerNavigationFeedback();

            if (shouldLetBrowserHandle(event)) {
                return;
            }

            if (isCurrentRoot(item)) {
                event.preventDefault();
                setPendingHref(null);
                completeMobileTabTransition(item.href);
                return;
            }

            event.preventDefault();
            warmRoute(item.href);
            navigateTo(item);
        };

        return {
            href: item.href,
            onClick: handleClick,
            onTouchStart: handleTouchStart,
            onFocus: handleFocus,
            onMouseEnter: handleMouseEnter,
            prefetch: nativeShell ? false : true,
            scroll: false as const,
            "aria-current": activeHref === item.href ? ("page" as const) : undefined,
        };
    }

    function isItemActive(item: MobileNavItem) {
        return activeHref === item.href;
    }

    return {
        isPending,
        isItemActive,
        getLinkProps,
    };
}
