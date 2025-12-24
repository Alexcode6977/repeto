import { useState, useEffect, useCallback, useRef } from 'react';

export function useWakeLock() {
    const wakeLockRef = useRef<any>(null);
    const [isActive, setIsActive] = useState(false);

    const requestWakeLock = useCallback(async () => {
        if (!('wakeLock' in navigator)) {
            console.warn('[WakeLock] Screen Wake Lock API not supported');
            return;
        }

        try {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            setIsActive(true);
            console.log('[WakeLock] Screen Wake Lock is active');

            wakeLockRef.current.addEventListener('release', () => {
                setIsActive(false);
                console.log('[WakeLock] Screen Wake Lock was released');
            });
        } catch (err: any) {
            console.error(`[WakeLock] ${err.name}, ${err.message}`);
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }, []);

    // Re-request wake lock when page becomes visible again
    useEffect(() => {
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
