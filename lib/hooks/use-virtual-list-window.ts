import { type RefObject, useEffect, useMemo, useState } from "react";

type VirtualListStrategy = "active" | "scroll";

interface UseVirtualListWindowOptions {
    itemCount: number;
    estimateSize: number;
    overscan: number;
    strategy: VirtualListStrategy;
    activeIndex?: number;
    containerRef?: RefObject<HTMLElement | null>;
    enabled?: boolean;
    initialViewportItems?: number;
}

interface VirtualListWindow {
    startIndex: number;
    endIndex: number;
    topPadding: number;
    bottomPadding: number;
}

export function useVirtualListWindow({
    itemCount,
    estimateSize,
    overscan,
    strategy,
    activeIndex = 0,
    containerRef,
    enabled = true,
    initialViewportItems = 8,
}: UseVirtualListWindowOptions): VirtualListWindow {
    const [viewportMetrics, setViewportMetrics] = useState({
        scrollTop: 0,
        viewportHeight: 0,
    });

    useEffect(() => {
        if (!enabled || strategy !== "scroll") {
            return;
        }

        const container = containerRef?.current;
        if (!container) {
            return;
        }

        let frameId = 0;

        const updateMetrics = () => {
            frameId = 0;
            setViewportMetrics((previous) => {
                const next = {
                    scrollTop: container.scrollTop,
                    viewportHeight: container.clientHeight,
                };

                if (
                    previous.scrollTop === next.scrollTop &&
                    previous.viewportHeight === next.viewportHeight
                ) {
                    return previous;
                }

                return next;
            });
        };

        const scheduleUpdate = () => {
            if (frameId) {
                cancelAnimationFrame(frameId);
            }

            frameId = requestAnimationFrame(updateMetrics);
        };

        const resizeObserver =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(scheduleUpdate)
                : null;

        resizeObserver?.observe(container);
        container.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);
        scheduleUpdate();

        return () => {
            if (frameId) {
                cancelAnimationFrame(frameId);
            }

            resizeObserver?.disconnect();
            container.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
        };
    }, [containerRef, enabled, strategy]);

    return useMemo(() => {
        if (itemCount <= 0) {
            return {
                startIndex: 0,
                endIndex: 0,
                topPadding: 0,
                bottomPadding: 0,
            };
        }

        if (!enabled) {
            return {
                startIndex: 0,
                endIndex: itemCount,
                topPadding: 0,
                bottomPadding: 0,
            };
        }

        if (strategy === "active") {
            const targetIndex = Math.min(Math.max(activeIndex, 0), itemCount - 1);
            const startIndex = Math.max(0, targetIndex - overscan);
            const endIndex = Math.min(itemCount, targetIndex + overscan + 1);

            return {
                startIndex,
                endIndex,
                topPadding: startIndex * estimateSize,
                bottomPadding: Math.max(0, (itemCount - endIndex) * estimateSize),
            };
        }

        const viewportHeight =
            viewportMetrics.viewportHeight > 0
                ? viewportMetrics.viewportHeight
                : estimateSize * Math.max(initialViewportItems, 1);
        const visibleCount = Math.max(
            initialViewportItems,
            Math.ceil(viewportHeight / estimateSize)
        );
        const startIndex = Math.max(
            0,
            Math.floor(viewportMetrics.scrollTop / estimateSize) - overscan
        );
        const endIndex = Math.min(
            itemCount,
            startIndex + visibleCount + overscan * 2
        );

        return {
            startIndex,
            endIndex,
            topPadding: startIndex * estimateSize,
            bottomPadding: Math.max(0, (itemCount - endIndex) * estimateSize),
        };
    }, [
        activeIndex,
        enabled,
        estimateSize,
        initialViewportItems,
        itemCount,
        overscan,
        strategy,
        viewportMetrics.scrollTop,
        viewportMetrics.viewportHeight,
    ]);
}
