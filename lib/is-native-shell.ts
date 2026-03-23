import { Capacitor } from "@capacitor/core";

export function isNativeShell() {
    if (typeof window === "undefined") {
        return false;
    }

    return Capacitor.isNativePlatform();
}
