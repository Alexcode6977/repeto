export type ProtectedSurface = "solo" | "troupe" | "none";

const TROUPE_SPECIFIC_ROUTE_PATTERN = /^\/troupes\/(?!join(?:\/|$)|create(?:\/|$)|$)[^/]+(?:\/.*)?$/;

function normalizePathname(pathname?: string | null): string {
    if (!pathname) {
        return "/";
    }

    const trimmed = pathname.trim();
    if (!trimmed) {
        return "/";
    }

    const withoutTrailingSlash = trimmed !== "/" ? trimmed.replace(/\/+$/, "") : trimmed;
    return withoutTrailingSlash || "/";
}

export function getProtectedSurface(pathname?: string | null): ProtectedSurface {
    const normalizedPathname = normalizePathname(pathname);

    if (normalizedPathname.includes("/active")) {
        return "none";
    }

    if (TROUPE_SPECIFIC_ROUTE_PATTERN.test(normalizedPathname)) {
        return "troupe";
    }

    return "solo";
}
