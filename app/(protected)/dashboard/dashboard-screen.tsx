"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { ImportWizard } from "@/app/(protected)/dashboard/components/import-wizard";
import { ScriptViewerSingle } from "@/components/script-viewer-single";
import { ScriptSetup } from "@/components/script-setup";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import {
    loadListenModeComponent,
    loadRehearsalModeComponent,
    loadScriptReaderComponent,
    preloadDashboardSoloModes,
} from "@/lib/features/dashboard/solo-mode-loaders";
import { useDashboardScreen } from "@/lib/features/dashboard/use-dashboard-screen";
import { DashboardScreenDesktop } from "@/app/(protected)/dashboard/dashboard-screen.desktop";
import { DashboardScreenMobile } from "@/app/(protected)/dashboard/dashboard-screen.mobile";
import {
    markDashboardHomeShellReady,
    markSoloFavoriteDashboardShellReady,
    markSoloFavoriteModeReady,
} from "@/lib/mobile-flow-metrics";
import {
    DashboardMobileFlowOverlay,
    DashboardSoloModeLoadingScreen,
} from "@/app/(protected)/dashboard/components/mobile-flow-overlay";
import type { MobileFlowTransitionState } from "@/lib/mobile-flow-transition";

type IdleBrowserWindow = Window & typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
};

const RehearsalMode = dynamic(
    () => loadRehearsalModeComponent().then((Component) => ({ default: Component })),
    {
        loading: () => <DashboardSoloModeLoadingScreen />,
    }
);

const ScriptReader = dynamic(
    () => loadScriptReaderComponent().then((Component) => ({ default: Component })),
    {
        loading: () => <DashboardSoloModeLoadingScreen />,
    }
);

const ListenMode = dynamic(
    () => loadListenModeComponent().then((Component) => ({ default: Component })),
    {
        loading: () => <DashboardSoloModeLoadingScreen />,
    }
);

function SoloModeReadyBoundary({
    children,
    onReady,
}: {
    children: ReactNode;
    onReady: () => void;
}) {
    useEffect(() => {
        markSoloFavoriteModeReady();
        onReady();
    }, [onReady]);

    return <>{children}</>;
}

export function DashboardScreen() {
    const dashboard = useDashboardScreen();
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const hasPreloadedModesRef = useRef(false);
    const {
        state,
        favoriteIdToLaunch,
        setError,
        setShowImportGuide,
        setSearchQuery,
        setShowMobileSearch,
        setLayoutMode,
        setActiveIndex,
        refreshScripts,
        handleLoadScript,
        handleRenameScript,
        handleDeleteScript,
        handleTogglePublic,
        handleCancelVocalization,
        handleConfirmSelection,
        handleStartSession,
        handleExitView,
        handleCloseScriptViewer,
        handleSaveFavoriteDraft,
        handleSaveReaderFavorite,
        handleBackToViewer,
        completeMobileFlowTransition,
        layoutMode,
    } = dashboard;
    const hasMarkedDashboardHomeShellRef = useRef(false);
    const hasMarkedFavoriteDashboardShellRef = useRef(false);
    const shouldLockDashboardHomeScroll = !isDesktop
        && state.viewMode === "viewer"
        && !state.script;

    useBodyScrollLock(shouldLockDashboardHomeScroll);

    useEffect(() => {
        if (hasPreloadedModesRef.current || state.isLoading) {
            return;
        }

        hasPreloadedModesRef.current = true;

        if (typeof window === "undefined") {
            return;
        }

        const browserWindow = window as IdleBrowserWindow;

        if (typeof browserWindow.requestIdleCallback === "function") {
            const idleId = browserWindow.requestIdleCallback(() => {
                preloadDashboardSoloModes();
            }, { timeout: 1200 });

            return () => {
                browserWindow.cancelIdleCallback?.(idleId);
            };
        }

        const timeoutId = globalThis.setTimeout(() => {
            preloadDashboardSoloModes();
        }, 250);

        return () => {
            globalThis.clearTimeout(timeoutId);
        };
    }, [state.isLoading]);

    useEffect(() => {
        if (isDesktop || state.isLoading || state.viewMode !== "viewer" || state.script) {
            return;
        }

        if (!hasMarkedDashboardHomeShellRef.current) {
            markDashboardHomeShellReady();
            hasMarkedDashboardHomeShellRef.current = true;
        }

        if (favoriteIdToLaunch && !hasMarkedFavoriteDashboardShellRef.current) {
            markSoloFavoriteDashboardShellReady();
            hasMarkedFavoriteDashboardShellRef.current = true;
        }
    }, [favoriteIdToLaunch, isDesktop, state.isLoading, state.script, state.viewMode]);

    useEffect(() => {
        if (!favoriteIdToLaunch) {
            hasMarkedFavoriteDashboardShellRef.current = false;
        }
    }, [favoriteIdToLaunch]);

    if (state.script && state.viewMode === "listen") {
        return (
            <SoloModeReadyBoundary onReady={completeMobileFlowTransition}>
                <ListenMode
                    script={state.script}
                    userCharacters={state.rehearsalChar ? [state.rehearsalChar] : []}
                    onExit={handleExitView}
                    scriptId={state.selectedScriptMeta?.id}
                    isPublicScript={state.selectedScriptMeta?.isPublic}
                    skipCharacters={state.ignoredCharacters}
                    showStageDirections={state.showStageDirections}
                    initialConfig={state.favoriteConfig.listen || undefined}
                    autoStart={state.favoriteConfig.autoStart}
                    onSaveFavoriteDraft={handleSaveFavoriteDraft}
                />
            </SoloModeReadyBoundary>
        );
    }

    if (state.rehearsalChar && state.script && state.viewMode === "rehearsal") {
        return (
            <SoloModeReadyBoundary onReady={completeMobileFlowTransition}>
                <RehearsalMode
                    script={state.script}
                    userCharacters={[state.rehearsalChar]}
                    onExit={handleExitView}
                    initialSettings={state.sessionSettings}
                    scriptId={state.selectedScriptMeta?.id}
                    isPublicScript={state.selectedScriptMeta?.isPublic}
                    initialIgnoredCharacters={state.ignoredCharacters}
                    showStageDirections={state.showStageDirections}
                    initialConfig={state.favoriteConfig.rehearsal || undefined}
                    autoStart={state.favoriteConfig.autoStart}
                    onSaveFavoriteDraft={handleSaveFavoriteDraft}
                />
            </SoloModeReadyBoundary>
        );
    }

    if (state.rehearsalChar && state.script && state.viewMode === "reader") {
        return (
            <SoloModeReadyBoundary onReady={completeMobileFlowTransition}>
                <ScriptReader
                    script={state.script}
                    userCharacters={[state.rehearsalChar]}
                    onExit={handleExitView}
                    settings={state.sessionSettings}
                    userId={state.userId}
                    skipCharacters={state.ignoredCharacters}
                    showStageDirections={state.showStageDirections}
                />
            </SoloModeReadyBoundary>
        );
    }

    if (state.rehearsalChar && state.script && state.viewMode === "setup") {
        return (
            <ScriptSetup
                script={state.script}
                character={state.rehearsalChar}
                onStart={handleStartSession}
                onBack={handleBackToViewer}
                onSaveFavorite={handleSaveReaderFavorite}
            />
        );
    }

    if (state.script && state.viewMode === "viewer") {
        return (
            <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                {state.error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200 animate-in slide-in-from-top-2 w-full max-w-2xl">
                        <AlertCircle className="h-5 w-5" />
                        {state.error}
                    </div>
                ) : null}

                {state.isLoadingDetail ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <ScriptViewerSingle
                        script={state.script}
                        onConfirm={handleConfirmSelection}
                        onBack={handleCloseScriptViewer}
                    />
                )}
            </div>
        );
    }

    const homeProps = {
        error: state.error,
        userName: state.userName,
        searchQuery: state.searchQuery,
        setSearchQuery,
        isSearchPending: state.isSearchPending,
        showMobileSearch: state.showMobileSearch,
        setShowMobileSearch,
        onImportClick: () => setShowImportGuide(true),
        isPending: false,
        layoutMode,
        setLayoutMode,
        scripts: state.filteredScriptsList,
        isLoading: state.isLoading,
        userEmail: state.userEmail,
        onLoad: handleLoadScript,
        onRename: handleRenameScript,
        onDelete: handleDeleteScript,
        onTogglePublic: handleTogglePublic,
        onCancelVocalization: handleCancelVocalization,
        onImport: () => setShowImportGuide(true),
        activeIndex: state.activeIndex,
        onIndexChange: setActiveIndex,
    };

    const HomeRenderer = isDesktop ? DashboardScreenDesktop : DashboardScreenMobile;
    const shouldShowMobileFlowOverlay = !isDesktop
        && state.mobileFlowTransition !== "idle"
        && state.mobileFlowTransition !== "ready"
        && (!state.script || state.viewMode === "viewer");

    return (
        <>
            <HomeRenderer {...homeProps} />
            {shouldShowMobileFlowOverlay ? (
                <DashboardMobileFlowOverlay
                    phase={state.mobileFlowTransition as Exclude<MobileFlowTransitionState, "idle" | "ready">}
                />
            ) : null}

            <ImportWizard
                showImportGuide={state.showImportGuide}
                setShowImportGuide={setShowImportGuide}
                userTier={state.userTier}
                userEmail={state.userEmail}
                onImportComplete={refreshScripts}
                onError={setError}
            />
        </>
    );
}
