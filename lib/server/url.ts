import type { NextRequest } from "next/server";

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeUrl(rawUrl: string): string {
    return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

function toOrigin(hostOrUrl: string): string {
    if (hostOrUrl.startsWith("http://") || hostOrUrl.startsWith("https://")) {
        return normalizeUrl(hostOrUrl);
    }

    const host = hostOrUrl.trim();
    const hostWithoutPort = host.split(":")[0];
    const protocol = LOCALHOST_HOSTS.has(hostWithoutPort) ? "http" : "https";
    return `${protocol}://${host}`;
}

export function getConfiguredBaseUrl(): string | null {
    const configured =
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    return configured ? normalizeUrl(configured) : null;
}

export function getBaseUrlFromRequest(request: NextRequest): string {
    return getConfiguredBaseUrl() || normalizeUrl(request.nextUrl.origin);
}

export function getBaseUrlFromHost(host: string | null): string {
    return getConfiguredBaseUrl() || toOrigin(host || "localhost:3000");
}
