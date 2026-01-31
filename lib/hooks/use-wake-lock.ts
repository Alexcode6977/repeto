import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

export function useWakeLock() {
    const wakeLockRef = useRef<any>(null);
    const [isActive, setIsActive] = useState(false);

    const requestWakeLock = useCallback(async () => {
        // Native (Capacitor)
        if (Capacitor.isNativePlatform()) {
            try {
                await KeepAwake.keepAwake();
                setIsActive(true);
                return;
            } catch (err) {
                console.error('[WakeLock Native] Failed', err);
            }
        }

        // Web Fallback
        if (!('wakeLock' in navigator)) {
            console.warn('[WakeLock] Screen Wake Lock API not supported');
            return;
        }

        try {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            setIsActive(true);

            wakeLockRef.current.addEventListener('release', () => {
                setIsActive(false);
            });
        } catch (err: any) {
            console.error(`[WakeLock] ${err.name}, ${err.message}`);
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        // Native (Capacitor)
        if (Capacitor.isNativePlatform()) {
            try {
                await KeepAwake.allowSleep();
                setIsActive(false);
            } catch (err) {
                console.error('[WakeLock Native] Failed to release', err);
            }
            return;
        }

        // Web Fallback
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }, []);

    // Re-request wake lock when page becomes visible again (Web only)
    useEffect(() => {
        if (Capacitor.isNativePlatform()) return;

        const handleVisibilityChange = async () => {
            if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [requestWakeLock]);

    return { requestWakeLock, releaseWakeLock, isActive };
}
