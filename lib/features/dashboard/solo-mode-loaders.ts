import type { SoloFavoriteLaunchMode } from "@/lib/solo-favorites";

export async function loadRehearsalModeComponent() {
    const mod = await import("@/components/rehearsal-mode");
    return mod.RehearsalMode;
}

export async function loadScriptReaderComponent() {
    const mod = await import("@/components/script-reader");
    return mod.ScriptReader;
}

export async function loadListenModeComponent() {
    const mod = await import("@/components/listen-mode");
    return mod.ListenMode;
}

export function preloadDashboardSoloModes() {
    void loadRehearsalModeComponent();
    void loadScriptReaderComponent();
    void loadListenModeComponent();
}

export function preloadDashboardSoloMode(mode: SoloFavoriteLaunchMode) {
    if (mode === "listen") {
        void loadListenModeComponent();
        return;
    }

    if (mode === "reader") {
        void loadScriptReaderComponent();
        return;
    }

    void loadRehearsalModeComponent();
}
