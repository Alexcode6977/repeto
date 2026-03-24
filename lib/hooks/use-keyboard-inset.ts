"use client";

import { useEffect } from "react";
import {
    observeKeyboardInset,
    setKeyboardOffset,
} from "@/lib/platform/device";

export function useKeyboardInset(active = true) {
    useEffect(() => {
        if (!active) return;

        let cleanup: (() => Promise<void>) | null = null;

        void observeKeyboardInset((offset) => {
            setKeyboardOffset(offset);
        }).then((listener) => {
            cleanup = listener.remove;
        });

        return () => {
            if (cleanup) {
                void cleanup();
            } else {
                setKeyboardOffset(0);
            }
        };
    }, [active]);
}
