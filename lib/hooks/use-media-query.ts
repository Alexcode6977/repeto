"use client";

import { useSyncExternalStore } from "react";

function createServerSnapshot(defaultValue: boolean) {
    return () => defaultValue;
}

export function useMediaQuery(query: string, defaultValue = false) {
    const subscribe = (callback: () => void) => {
        if (typeof window === "undefined") {
            return () => undefined;
        }

        const mediaQueryList = window.matchMedia(query);
        mediaQueryList.addEventListener("change", callback);

        return () => {
            mediaQueryList.removeEventListener("change", callback);
        };
    };

    const getSnapshot = () => {
        if (typeof window === "undefined") {
            return defaultValue;
        }

        return window.matchMedia(query).matches;
    };

    return useSyncExternalStore(subscribe, getSnapshot, createServerSnapshot(defaultValue));
}
