'use client';

import { useEffect } from 'react';
import { configureMobileStatusBar } from "@/lib/platform/device";

export function MobileStatusBar() {
    useEffect(() => {
        void configureMobileStatusBar();
    }, []);

    return null;
}
