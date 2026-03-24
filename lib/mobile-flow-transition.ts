export type MobileFlowTransitionState = "idle" | "warming" | "navigating" | "mounting" | "ready";
export type MobileFlowName = "solo-favorite-launch";

export interface MobileFlowSession {
    name: MobileFlowName;
    phase: Exclude<MobileFlowTransitionState, "idle">;
    startedAt: number;
    favoriteId?: string;
    launchMode?: string;
}

const MOBILE_FLOW_SESSION_KEY = "__repeto_mobile_flow_session__";

function canUseSessionStorage() {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readStoredSession(): MobileFlowSession | null {
    if (!canUseSessionStorage()) {
        return null;
    }

    try {
        const rawValue = window.sessionStorage.getItem(MOBILE_FLOW_SESSION_KEY);
        if (!rawValue) {
            return null;
        }

        return JSON.parse(rawValue) as MobileFlowSession;
    } catch {
        window.sessionStorage.removeItem(MOBILE_FLOW_SESSION_KEY);
        return null;
    }
}

function writeStoredSession(session: MobileFlowSession) {
    if (!canUseSessionStorage()) {
        return;
    }

    window.sessionStorage.setItem(MOBILE_FLOW_SESSION_KEY, JSON.stringify(session));
}

export function beginMobileFlowSession(session: Omit<MobileFlowSession, "startedAt">) {
    const nextSession: MobileFlowSession = {
        ...session,
        startedAt: Date.now(),
    };

    writeStoredSession(nextSession);
    return nextSession;
}

export function readMobileFlowSession(name?: MobileFlowName) {
    const session = readStoredSession();
    if (!session) {
        return null;
    }

    if (name && session.name !== name) {
        return null;
    }

    return session;
}

export function updateMobileFlowSessionPhase(
    name: MobileFlowName,
    phase: Exclude<MobileFlowTransitionState, "idle">
) {
    const currentSession = readStoredSession();
    if (!currentSession || currentSession.name !== name) {
        return null;
    }

    const nextSession: MobileFlowSession = {
        ...currentSession,
        phase,
    };

    writeStoredSession(nextSession);
    return nextSession;
}

export function clearMobileFlowSession(name?: MobileFlowName) {
    if (!canUseSessionStorage()) {
        return;
    }

    const currentSession = readStoredSession();
    if (!currentSession) {
        return;
    }

    if (name && currentSession.name !== name) {
        return;
    }

    window.sessionStorage.removeItem(MOBILE_FLOW_SESSION_KEY);
}
