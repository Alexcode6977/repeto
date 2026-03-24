"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { addPlatformAppStateChangeListener } from "@/lib/platform/device";

export function usePauseOnAppBackground(shouldPause: boolean, onPause: () => void) {
    const handlePause = useEffectEvent(() => {
        if (!shouldPause) {
            return;
        }

        onPause();
    });

    useEffect(() => {
        const wasActiveRef = { current: true };
        let cleanup: (() => Promise<void>) | null = null;

        void addPlatformAppStateChangeListener(({ isActive }) => {
            if (!isActive && wasActiveRef.current) {
                handlePause();
            }

            wasActiveRef.current = isActive;
        }).then((listener) => {
            cleanup = listener.remove;
        });

        return () => {
            if (cleanup) {
                void cleanup();
            }
        };
    }, [handlePause]);
}
