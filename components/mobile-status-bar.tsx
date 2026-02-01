'use client';

import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export function MobileStatusBar() {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const configureStatusBar = async () => {
                try {
                    await StatusBar.setStyle({ style: Style.Dark });
                    await StatusBar.setOverlaysWebView({ overlay: true });
                } catch (e) {
                    // fail silently
                }
            };

            configureStatusBar();
        }
    }, []);

    return null;
}
