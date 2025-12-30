"use client";

import { useCallback } from "react";

export function useHaptic() {
    const trigger = useCallback((pattern: number | number[] = 10) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }, []);

    const heavy = useCallback(() => trigger([50]), [trigger]);
    const medium = useCallback(() => trigger([30]), [trigger]);
    const light = useCallback(() => trigger([10]), [trigger]);
    const error = useCallback(() => trigger([50, 100, 50]), [trigger]);
    const success = useCallback(() => trigger([10, 50, 30]), [trigger]);

    return {
        trigger,
        heavy,
        medium,
        light,
        error,
        success
    };
}
