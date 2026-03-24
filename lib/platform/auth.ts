import { createClient } from "@/lib/supabase/client";
import {
    addPlatformUrlOpenListener,
    getLaunchUrl,
    isNativePlatform,
} from "@/lib/platform/device";
import {
    DEFAULT_LOGIN_DESTINATION,
    resolvePostAuthDestination,
} from "@/lib/platform/post-auth-destination";

function extractUrlParams(url: URL) {
    const params = new URLSearchParams(url.search);
    const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);

    hashParams.forEach((value, key) => {
        if (!params.has(key)) {
            params.set(key, value);
        }
    });

    return params;
}

export function getClientPostAuthDestination(requestedNext?: string | null) {
    return resolvePostAuthDestination({
        requestedNext,
        isNativeShell: isNativePlatform(),
    });
}

export function parseNativeAuthCallback(urlString: string) {
    try {
        const url = new URL(urlString);
        if (url.host !== "auth" || url.pathname !== "/callback") {
            return null;
        }

        const params = extractUrlParams(url);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken || !refreshToken) {
            return null;
        }

        return {
            accessToken,
            refreshToken,
            requestedNext: params.get("next"),
        };
    } catch {
        return null;
    }
}

export async function consumeNativeAuthCallback(urlString: string) {
    const callback = parseNativeAuthCallback(urlString);
    if (!callback) {
        return { handled: false as const, destination: null };
    }

    const supabase = createClient();
    const { error } = await supabase.auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
    });

    if (error) {
        console.error("[Native Auth] Failed to set session from deep link:", error);
        return { handled: true as const, destination: null };
    }

    return {
        handled: true as const,
        destination: getClientPostAuthDestination(callback.requestedNext),
    };
}

export async function resolveNativeStartupDestination() {
    if (!isNativePlatform()) {
        return null;
    }

    const supabase = createClient();

    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session
            ? getClientPostAuthDestination()
            : DEFAULT_LOGIN_DESTINATION;
    } catch (error) {
        console.error("[Native Auth] Failed to resolve startup destination:", error);
        return DEFAULT_LOGIN_DESTINATION;
    }
}

export async function registerNativeAuthListener(onDestination: (destination: string) => void) {
    if (!isNativePlatform()) {
        return { remove: async () => undefined };
    }

    const launchUrl = await getLaunchUrl();
    if (launchUrl) {
        const launchResult = await consumeNativeAuthCallback(launchUrl);
        if (launchResult.destination) {
            onDestination(launchResult.destination);
        }
    }

    return await addPlatformUrlOpenListener(async (event) => {
        const result = await consumeNativeAuthCallback(event.url);
        if (result.destination) {
            onDestination(result.destination);
        }
    });
}
