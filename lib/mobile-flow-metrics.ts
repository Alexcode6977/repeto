export type MobileFlowMetricName =
    | "favorite_tap_to_dashboard_shell"
    | "favorite_tap_to_mode_shell"
    | "mode_shell_to_mode_ready"
    | "native_boot_to_dashboard_shell";

const DEBUG_MOBILE_FLOW = process.env.NODE_ENV !== "production";
const SOLO_FAVORITE_TAP_MARK = "repeto:solo-favorite:tap";
const SOLO_FAVORITE_DASHBOARD_SHELL_MARK = "repeto:solo-favorite:dashboard-shell";
const SOLO_FAVORITE_MODE_SHELL_MARK = "repeto:solo-favorite:mode-shell";
const SOLO_FAVORITE_MODE_READY_MARK = "repeto:solo-favorite:mode-ready";
const DASHBOARD_HOME_SHELL_MARK = "repeto:dashboard:home-shell";

function canUsePerformanceApi() {
    return typeof window !== "undefined" && typeof window.performance !== "undefined";
}

function hasMark(markName: string) {
    if (!canUsePerformanceApi()) {
        return false;
    }

    return window.performance.getEntriesByName(markName, "mark").length > 0;
}

function debugLog(metricName: MobileFlowMetricName, duration: number) {
    if (!DEBUG_MOBILE_FLOW) {
        return;
    }

    console.info(`[mobile-flow] ${metricName}: ${Math.round(duration)}ms`);
}

function createMark(markName: string) {
    if (!canUsePerformanceApi()) {
        return;
    }

    window.performance.mark(markName);
}

function measureBetweenMarks(metricName: MobileFlowMetricName, startMark: string, endMark: string) {
    if (!canUsePerformanceApi() || !hasMark(startMark) || !hasMark(endMark)) {
        return;
    }

    try {
        window.performance.measure(metricName, startMark, endMark);
        const entries = window.performance.getEntriesByName(metricName, "measure");
        const latestEntry = entries.at(-1);
        if (latestEntry) {
            debugLog(metricName, latestEntry.duration);
        }
    } catch {
        // Ignore unsupported performance.measure signatures.
    }
}

export function clearSoloFavoriteLaunchMetrics() {
    if (!canUsePerformanceApi()) {
        return;
    }

    [
        SOLO_FAVORITE_TAP_MARK,
        SOLO_FAVORITE_DASHBOARD_SHELL_MARK,
        SOLO_FAVORITE_MODE_SHELL_MARK,
        SOLO_FAVORITE_MODE_READY_MARK,
    ].forEach((markName) => {
        window.performance.clearMarks(markName);
    });

    [
        "favorite_tap_to_dashboard_shell",
        "favorite_tap_to_mode_shell",
        "mode_shell_to_mode_ready",
    ].forEach((measureName) => {
        window.performance.clearMeasures(measureName);
    });
}

export function startSoloFavoriteLaunchMetrics() {
    clearSoloFavoriteLaunchMetrics();
    createMark(SOLO_FAVORITE_TAP_MARK);
}

export function markSoloFavoriteDashboardShellReady() {
    createMark(SOLO_FAVORITE_DASHBOARD_SHELL_MARK);
    measureBetweenMarks(
        "favorite_tap_to_dashboard_shell",
        SOLO_FAVORITE_TAP_MARK,
        SOLO_FAVORITE_DASHBOARD_SHELL_MARK
    );
}

export function markSoloFavoriteModeShellReady() {
    if (!hasMark(SOLO_FAVORITE_DASHBOARD_SHELL_MARK)) {
        markSoloFavoriteDashboardShellReady();
    }

    createMark(SOLO_FAVORITE_MODE_SHELL_MARK);
    measureBetweenMarks(
        "favorite_tap_to_mode_shell",
        SOLO_FAVORITE_TAP_MARK,
        SOLO_FAVORITE_MODE_SHELL_MARK
    );
}

export function markSoloFavoriteModeReady() {
    if (!hasMark(SOLO_FAVORITE_MODE_SHELL_MARK)) {
        markSoloFavoriteModeShellReady();
    }

    createMark(SOLO_FAVORITE_MODE_READY_MARK);
    measureBetweenMarks(
        "mode_shell_to_mode_ready",
        SOLO_FAVORITE_MODE_SHELL_MARK,
        SOLO_FAVORITE_MODE_READY_MARK
    );
}

export function markDashboardHomeShellReady() {
    if (!canUsePerformanceApi()) {
        return;
    }

    createMark(DASHBOARD_HOME_SHELL_MARK);

    try {
        window.performance.measure("native_boot_to_dashboard_shell", {
            start: 0,
            end: DASHBOARD_HOME_SHELL_MARK,
        });

        const entries = window.performance.getEntriesByName("native_boot_to_dashboard_shell", "measure");
        const latestEntry = entries.at(-1);
        if (latestEntry) {
            debugLog("native_boot_to_dashboard_shell", latestEntry.duration);
        }
    } catch {
        debugLog("native_boot_to_dashboard_shell", window.performance.now());
    }
}
