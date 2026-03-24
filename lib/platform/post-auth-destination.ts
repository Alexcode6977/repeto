export const DEFAULT_WEB_POST_AUTH_DESTINATION = "/dashboard";
export const DEFAULT_NATIVE_POST_AUTH_DESTINATION = "/favoris";
export const DEFAULT_LOGIN_DESTINATION = "/login";

export function safePostAuthPath(path: string | null | undefined, fallback: string) {
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
        return fallback;
    }

    return path;
}

export function resolvePostAuthDestination({
    requestedNext,
    isNativeShell = false,
    fallback,
}: {
    requestedNext?: string | null;
    isNativeShell?: boolean;
    fallback?: string;
}) {
    const defaultDestination = fallback || (
        isNativeShell
            ? DEFAULT_NATIVE_POST_AUTH_DESTINATION
            : DEFAULT_WEB_POST_AUTH_DESTINATION
    );

    return safePostAuthPath(requestedNext, defaultDestination);
}

export function buildAuthCallbackUrl(
    origin: string,
    {
        requestedNext,
        isNativeShell = false,
    }: {
        requestedNext?: string | null;
        isNativeShell?: boolean;
    } = {}
) {
    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set(
        "next",
        resolvePostAuthDestination({ requestedNext, isNativeShell })
    );
    return callbackUrl.toString();
}
