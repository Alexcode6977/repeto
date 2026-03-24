import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Keyboard } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { KeepAwake } from "@capacitor-community/keep-awake";

export interface PlatformListenerHandle {
    remove: () => Promise<void>;
}

const NOOP_LISTENER_HANDLE: PlatformListenerHandle = {
    remove: async () => undefined,
};

export function isNativePlatform() {
    if (typeof window === "undefined") {
        return false;
    }

    return Capacitor.isNativePlatform();
}

export function getPlatformKind() {
    return isNativePlatform() ? Capacitor.getPlatform() : "web";
}

export function isIOSPlatform() {
    return getPlatformKind() === "ios";
}

export async function getLaunchUrl() {
    if (!isNativePlatform()) {
        return null;
    }

    try {
        const result = await App.getLaunchUrl();
        return result?.url || null;
    } catch {
        return null;
    }
}

export async function addPlatformUrlOpenListener(
    listener: (event: { url: string }) => void | Promise<void>
): Promise<PlatformListenerHandle> {
    if (!isNativePlatform()) {
        return NOOP_LISTENER_HANDLE;
    }

    return await App.addListener("appUrlOpen", listener as never);
}

export async function addPlatformAppStateChangeListener(
    listener: (event: { isActive: boolean }) => void | Promise<void>
): Promise<PlatformListenerHandle> {
    if (!isNativePlatform()) {
        return NOOP_LISTENER_HANDLE;
    }

    return await App.addListener("appStateChange", listener as never);
}

export async function configureMobileStatusBar() {
    if (!isNativePlatform()) {
        return;
    }

    try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: true });
    } catch {
        // Ignore platform-specific failures silently.
    }
}

export async function triggerImpact(style: ImpactStyle = ImpactStyle.Medium) {
    if (!isNativePlatform()) {
        return false;
    }

    try {
        await Haptics.impact({ style });
        return true;
    } catch {
        return false;
    }
}

export async function triggerNotification(type: NotificationType = NotificationType.Success) {
    if (!isNativePlatform()) {
        return false;
    }

    try {
        await Haptics.notification({ type });
        return true;
    } catch {
        return false;
    }
}

export function triggerWebVibration(pattern: number | number[]) {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
        return false;
    }

    return navigator.vibrate(pattern);
}

export async function requestPlatformWakeLock() {
    if (isNativePlatform()) {
        await KeepAwake.keepAwake();
        return null;
    }

    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
        return null;
    }

    const wakeLockApi = (navigator as Navigator & {
        wakeLock?: {
            request: (type: "screen") => Promise<WakeLockSentinel>;
        };
    }).wakeLock;

    if (!wakeLockApi) {
        return null;
    }

    return await wakeLockApi.request("screen");
}

export async function releasePlatformWakeLock(sentinel: WakeLockSentinel | null) {
    if (isNativePlatform()) {
        await KeepAwake.allowSleep();
        return;
    }

    if (sentinel) {
        await sentinel.release();
    }
}

function getViewportKeyboardOffset() {
    if (typeof window === "undefined" || !window.visualViewport) {
        return 0;
    }

    return Math.max(
        0,
        window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop
    );
}

export function setKeyboardOffset(offset: number) {
    if (typeof document === "undefined") {
        return;
    }

    document.documentElement.style.setProperty("--keyboard-offset", `${Math.max(0, Math.round(offset))}px`);
}

export async function observeKeyboardInset(
    onOffsetChange: (offset: number) => void
): Promise<PlatformListenerHandle> {
    if (typeof window === "undefined") {
        return NOOP_LISTENER_HANDLE;
    }

    if (isNativePlatform()) {
        const showHandle = await Keyboard.addListener("keyboardWillShow", (info: { keyboardHeight?: number }) => {
            onOffsetChange(info.keyboardHeight || 0);
        });
        const didShowHandle = await Keyboard.addListener("keyboardDidShow", (info: { keyboardHeight?: number }) => {
            onOffsetChange(info.keyboardHeight || 0);
        });
        const hideHandle = await Keyboard.addListener("keyboardWillHide", () => {
            onOffsetChange(0);
        });
        const didHideHandle = await Keyboard.addListener("keyboardDidHide", () => {
            onOffsetChange(0);
        });

        return {
            remove: async () => {
                await showHandle.remove();
                await didShowHandle.remove();
                await hideHandle.remove();
                await didHideHandle.remove();
                onOffsetChange(0);
            },
        };
    }

    const viewport = window.visualViewport;
    if (!viewport) {
        return NOOP_LISTENER_HANDLE;
    }

    const updateInset = () => {
        onOffsetChange(getViewportKeyboardOffset());
    };

    updateInset();
    viewport.addEventListener("resize", updateInset);
    viewport.addEventListener("scroll", updateInset);

    return {
        remove: async () => {
            viewport.removeEventListener("resize", updateInset);
            viewport.removeEventListener("scroll", updateInset);
            onOffsetChange(0);
        },
    };
}
