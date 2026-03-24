'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    addPlatformAppStateChangeListener,
    isNativePlatform,
    releasePlatformWakeLock,
    requestPlatformWakeLock,
} from "@/lib/platform/device";

export function useWakeLock() {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const shouldRestoreRef = useRef(false);
    const [isActive, setIsActive] = useState(false);

    const requestWakeLock = useCallback(async () => {
        try {
            shouldRestoreRef.current = true;
            wakeLockRef.current = await requestPlatformWakeLock();
            setIsActive(true);

            wakeLockRef.current?.addEventListener('release', () => {
                setIsActive(false);
            });
        } catch (error: any) {
            console.error(`[WakeLock] ${error.name}, ${error.message}`);
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        try {
            shouldRestoreRef.current = false;
            await releasePlatformWakeLock(wakeLockRef.current);
            wakeLockRef.current = null;
            setIsActive(false);
        } catch (error) {
            console.error('[WakeLock] Failed to release', error);
        }
    }, []);

    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (!isNativePlatform() && shouldRestoreRef.current && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [requestWakeLock]);

    useEffect(() => {
        let cleanup: (() => Promise<void>) | null = null;

        void addPlatformAppStateChangeListener(async ({ isActive: appIsActive }) => {
            if (!isNativePlatform()) {
                return;
            }

            if (appIsActive && shouldRestoreRef.current) {
                await requestWakeLock();
                return;
            }

            if (!appIsActive) {
                setIsActive(false);
            }
        }).then((listener) => {
            cleanup = listener.remove;
        });

        return () => {
            if (cleanup) {
                void cleanup();
            }
        };
    }, [requestWakeLock]);

    return { requestWakeLock, releaseWakeLock, isActive };
}
