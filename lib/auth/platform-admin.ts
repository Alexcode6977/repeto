const DEFAULT_PLATFORM_ADMINS = ["alex69.sartre@gmail.com"];

function parseEmailList(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
}

export function getPlatformAdminEmails(): Set<string> {
    const configured = parseEmailList(
        process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS
    );
    const emails = configured.length > 0 ? configured : DEFAULT_PLATFORM_ADMINS;
    return new Set(emails);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return getPlatformAdminEmails().has(email.trim().toLowerCase());
}
