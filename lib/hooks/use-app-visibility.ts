"use client";

import { useEffect, useState } from "react";
import { addPlatformAppStateChangeListener } from "@/lib/platform/device";

function getDocumentVisibility() {
    if (typeof document === "undefined") {
        return true;
    }

    return document.visibilityState !== "hidden";
}

export function useAppVisibility() {
    const [isDocumentVisible, setIsDocumentVisible] = useState(getDocumentVisibility);
    const [isNativeAppActive, setIsNativeAppActive] = useState(true);

    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }

        const handleVisibilityChange = () => {
            setIsDocumentVisible(getDocumentVisibility());
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        let cleanup: (() => Promise<void>) | null = null;

        void addPlatformAppStateChangeListener(({ isActive }) => {
            setIsNativeAppActive(isActive);
        }).then((listener) => {
            cleanup = listener.remove;
        });

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);

            if (cleanup) {
                void cleanup();
            }
        };
    }, []);

    return isDocumentVisible && isNativeAppActive;
}
