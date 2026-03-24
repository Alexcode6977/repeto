export const NATIVE_APP_USER_AGENT_MARKER = "RepetoNative";
export const NATIVE_APP_USER_AGENT = `${NATIVE_APP_USER_AGENT_MARKER}/1`;

export function isNativeAppUserAgent(userAgent: string | null | undefined) {
    return Boolean(userAgent && userAgent.includes(NATIVE_APP_USER_AGENT_MARKER));
}
