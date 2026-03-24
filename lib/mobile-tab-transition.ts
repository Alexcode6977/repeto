"use client";

import { useSyncExternalStore } from "react";

export type MobileTabHref = "/dashboard" | "/favoris" | "/stats" | "/troupes";

interface MobileTabTransitionSnapshot {
    pendingHref: MobileTabHref | null;
}

let snapshot: MobileTabTransitionSnapshot = {
    pendingHref: null,
};

const listeners = new Set<() => void>();

function emitChange() {
    listeners.forEach((listener) => {
        listener();
    });
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function getSnapshot() {
    return snapshot;
}

function getServerSnapshot(): MobileTabTransitionSnapshot {
    return {
        pendingHref: null,
    };
}

export function beginMobileTabTransition(href: MobileTabHref) {
    if (snapshot.pendingHref === href) {
        return;
    }

    snapshot = {
        pendingHref: href,
    };
    emitChange();
}

export function completeMobileTabTransition(href?: string | null) {
    if (href && snapshot.pendingHref && snapshot.pendingHref !== href) {
        return;
    }

    if (!snapshot.pendingHref) {
        return;
    }

    snapshot = {
        pendingHref: null,
    };
    emitChange();
}

export function useMobileTabTransition() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
