import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useCallback } from 'react';

export function useHaptics() {
    const isNative = Capacitor.isNativePlatform();

    const impact = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
        if (!isNative) return;
        try {
            await Haptics.impact({ style });
        } catch (e) {
            // fail silently
        }
    }, [isNative]);

    const notification = useCallback(async (type: NotificationType = NotificationType.Success) => {
        if (!isNative) return;
        try {
            await Haptics.notification({ type });
        } catch (e) {
            // fail silently
        }
    }, [isNative]);

    const success = useCallback(() => notification(NotificationType.Success), [notification]);
    const error = useCallback(() => notification(NotificationType.Error), [notification]);
    const warning = useCallback(() => notification(NotificationType.Warning), [notification]);
    const light = useCallback(() => impact(ImpactStyle.Light), [impact]);
    const medium = useCallback(() => impact(ImpactStyle.Medium), [impact]);
    const heavy = useCallback(() => impact(ImpactStyle.Heavy), [impact]);

    return {
        impact,
        notification,
        success,
        error,
        warning,
        light,
        medium,
        heavy
    };
}
