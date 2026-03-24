import { isNativePlatform } from "@/lib/platform/device";

export function isNativeShell() {
    return isNativePlatform();
}
