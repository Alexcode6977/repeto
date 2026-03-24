'use client';

import { useCallback } from 'react';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';
import {
    triggerImpact,
    triggerNotification,
    triggerWebVibration,
} from "@/lib/platform/device";

const IMPACT_FALLBACKS: Record<ImpactStyle, number | number[]> = {
    [ImpactStyle.Heavy]: 20,
    [ImpactStyle.Light]: 5,
    [ImpactStyle.Medium]: 10,
};

const NOTIFICATION_FALLBACKS: Record<NotificationType, number | number[]> = {
    [NotificationType.Error]: [50, 100, 50, 100],
    [NotificationType.Success]: [10, 30, 10, 30],
    [NotificationType.Warning]: [30, 50, 10],
};

export function useHaptics() {
    const impact = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
        const didUseNativeImpact = await triggerImpact(style);
        if (!didUseNativeImpact) {
            triggerWebVibration(IMPACT_FALLBACKS[style]);
        }
    }, []);

    const notification = useCallback(async (type: NotificationType = NotificationType.Success) => {
        const didUseNativeNotification = await triggerNotification(type);
        if (!didUseNativeNotification) {
            triggerWebVibration(NOTIFICATION_FALLBACKS[type]);
        }
    }, []);

    const success = useCallback(() => notification(NotificationType.Success), [notification]);
    const error = useCallback(() => notification(NotificationType.Error), [notification]);
    const warning = useCallback(() => notification(NotificationType.Warning), [notification]);
    const light = useCallback(() => impact(ImpactStyle.Light), [impact]);
    const medium = useCallback(() => impact(ImpactStyle.Medium), [impact]);
    const heavy = useCallback(() => impact(ImpactStyle.Heavy), [impact]);
    const selection = useCallback(async () => {
        const didUseNativeImpact = await triggerImpact(ImpactStyle.Light);
        if (!didUseNativeImpact) {
            triggerWebVibration(2);
        }
    }, []);

    return {
        impact,
        notification,
        success,
        error,
        warning,
        light,
        medium,
        heavy,
        selection,
    };
}
