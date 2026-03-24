"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { ScriptSettings } from "@/components/script-setup";
import type { ParsedScript, ScriptMetadata } from "@/lib/types";
import type { MobileFlowTransitionState } from "@/lib/mobile-flow-transition";
import type {
    DashboardSelectedScriptMeta,
    DashboardUserTier,
    DashboardViewMode,
} from "@/lib/features/dashboard/types";
import {
    cancelDashboardVocalization,
    deleteDashboardScript,
    fetchDashboardScript,
    getDashboardUserSnapshot,
    launchDashboardFavorite,
    listDashboardScripts,
    renameDashboardScript,
    saveDashboardFavorite,
    toggleDashboardScriptPublicStatus,
} from "@/lib/features/dashboard/dashboard-gateway";
import { useAppVisibility } from "@/lib/hooks/use-app-visibility";
import {
    type SoloFavoriteDraft,
    type SoloListenFavoriteDraft,
    type SoloRehearsalFavoriteDraft,
    getQuickStartStorageValueFromFavorite,
} from "@/lib/solo-favorites";
import {
    beginMobileFlowSession,
    clearMobileFlowSession,
    readMobileFlowSession,
    updateMobileFlowSessionPhase,
} from "@/lib/mobile-flow-transition";

const DEFAULT_SESSION_SETTINGS: ScriptSettings = {
    visibility: "visible",
    mode: "full",
};

function persistFavoriteQuickStart(draft: SoloFavoriteDraft) {
    if (typeof window === "undefined") {
        return;
    }

    const quickStart = getQuickStartStorageValueFromFavorite(draft);
    if (!quickStart) {
        return;
    }

    localStorage.setItem(quickStart.storageKey, JSON.stringify(quickStart.payload));
}

export function useDashboardScreen() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const favoriteIdToLaunch = searchParams.get("favorite");
    const isAppVisible = useAppVisibility();

    const [userName, setUserName] = useState("");
    const [userId, setUserId] = useState("");
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userTier, setUserTier] = useState<DashboardUserTier>("free");

    const [scriptsList, setScriptsList] = useState<ScriptMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [showImportGuide, setShowImportGuide] = useState(false);

    const [viewMode, setViewMode] = useState<DashboardViewMode>("viewer");
    const [script, setScript] = useState<ParsedScript | null>(null);
    const [selectedScriptMeta, setSelectedScriptMeta] = useState<DashboardSelectedScriptMeta | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const [rehearsalChar, setRehearsalChar] = useState<string | null>(null);
    const [sessionSettings, setSessionSettings] = useState<ScriptSettings>(DEFAULT_SESSION_SETTINGS);
    const [ignoredCharacters, setIgnoredCharacters] = useState<string[]>([]);
    const [showStageDirections, setShowStageDirections] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const [listenInitialConfig, setListenInitialConfig] = useState<SoloListenFavoriteDraft["preset"] | null>(null);
    const [rehearsalInitialConfig, setRehearsalInitialConfig] = useState<SoloRehearsalFavoriteDraft["preset"] | null>(null);
    const [shouldAutoStartSession, setShouldAutoStartSession] = useState(false);
    const [isLaunchingFavorite, setIsLaunchingFavorite] = useState(false);
    const [handledFavoriteId, setHandledFavoriteId] = useState<string | null>(null);
    const [mobileFlowTransition, setMobileFlowTransition] = useState<MobileFlowTransitionState>("idle");

    const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const mobileFlowResetTimeoutRef = useRef<number | null>(null);

    const resetFavoriteLaunchState = useCallback(() => {
        setListenInitialConfig(null);
        setRehearsalInitialConfig(null);
        setShouldAutoStartSession(false);
    }, []);

    const syncMobileFlowTransition = useCallback((phase: MobileFlowTransitionState) => {
        setMobileFlowTransition(phase);

        if (phase === "idle") {
            clearMobileFlowSession("solo-favorite-launch");
            return;
        }

        const existingSession = readMobileFlowSession("solo-favorite-launch");
        if (!existingSession) {
            beginMobileFlowSession({
                name: "solo-favorite-launch",
                phase,
                favoriteId: favoriteIdToLaunch || undefined,
            });
            return;
        }

        updateMobileFlowSessionPhase("solo-favorite-launch", phase);
    }, [favoriteIdToLaunch]);

    const completeMobileFlowTransition = useCallback(() => {
        if (mobileFlowResetTimeoutRef.current) {
            window.clearTimeout(mobileFlowResetTimeoutRef.current);
        }

        syncMobileFlowTransition("ready");
        mobileFlowResetTimeoutRef.current = window.setTimeout(() => {
            syncMobileFlowTransition("idle");
            mobileFlowResetTimeoutRef.current = null;
        }, 220);
    }, [syncMobileFlowTransition]);

    const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
    const filteredScriptsList = scriptsList.filter((script) => {
        const matchesSearch = !normalizedSearchQuery || script.title.toLowerCase().includes(normalizedSearchQuery);
        return script.is_owner && matchesSearch;
    });

    useEffect(() => {
        setActiveIndex((currentIndex) => {
            if (filteredScriptsList.length === 0) {
                return 0;
            }

            return Math.min(currentIndex, filteredScriptsList.length - 1);
        });
    }, [filteredScriptsList.length]);

    const refreshScripts = useCallback(async () => {
        try {
            const scripts = await listDashboardScripts();
            setScriptsList(scripts);
        } catch (refreshError) {
            console.error("Failed to fetch dashboard scripts", refreshError);
            setError("Impossible de charger la bibliothèque.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                const [snapshot] = await Promise.all([
                    getDashboardUserSnapshot(),
                    refreshScripts(),
                ]);

                if (cancelled || !snapshot) {
                    return;
                }

                setUserId(snapshot.id);
                setUserEmail(snapshot.email);
                setUserName(snapshot.name);
                setUserTier(snapshot.tier);
            } catch (initError) {
                console.error("Client Init Error:", initError);
                if (!cancelled) {
                    setError("Erreur de connexion. Veuillez rafraîchir.");
                }
            }
        };

        void init();

        return () => {
            cancelled = true;
        };
    }, [refreshScripts]);

    useEffect(() => {
        return () => {
            if (mobileFlowResetTimeoutRef.current) {
                window.clearTimeout(mobileFlowResetTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const hasVocalizingScripts = scriptsList.some(
            (currentScript) =>
                currentScript.vocalization_status === "pending" ||
                currentScript.vocalization_status === "processing"
        );

        if (!hasVocalizingScripts || !isAppVisible) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void refreshScripts();
        }, 2000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isAppVisible, refreshScripts, scriptsList]);

    const handleSaveFavoriteDraft = useCallback(async (draft: SoloFavoriteDraft) => {
        try {
            const result = await saveDashboardFavorite(draft);
            persistFavoriteQuickStart(draft);

            if (result.status === "created") {
                toast.success("Favori ajouté.");
            } else {
                toast("Déjà enregistré.");
            }
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Impossible d'enregistrer ce favori.";
            toast.error(message);
            throw saveError;
        }
    }, []);

    const handleSaveReaderFavorite = useCallback(async (settings: ScriptSettings) => {
        if (!selectedScriptMeta?.id || !rehearsalChar) {
            toast.error("Impossible d'enregistrer ce favori.");
            return;
        }

        await handleSaveFavoriteDraft({
            scriptId: selectedScriptMeta.id,
            characterName: rehearsalChar,
            ignoredCharacters,
            showStageDirections,
            launchMode: "reader",
            preset: {
                visibility: settings.visibility,
                mode: settings.mode,
            },
        });
    }, [
        selectedScriptMeta,
        rehearsalChar,
        ignoredCharacters,
        showStageDirections,
        handleSaveFavoriteDraft,
    ]);

    const openScriptViewer = useCallback(async (scriptId: string, isPublic: boolean) => {
        setIsLoadingDetail(true);
        setError(null);
        resetFavoriteLaunchState();

        try {
            const fullScript = await fetchDashboardScript(scriptId);

            if (!fullScript) {
                setError("Impossible de charger le script.");
                return;
            }

            setScript(fullScript);
            setSelectedScriptMeta({ id: scriptId, isPublic });
            setViewMode("viewer");
        } catch (loadError) {
            console.error("Error while loading dashboard script", loadError);
            setError("Erreur lors du chargement du script.");
        } finally {
            setIsLoadingDetail(false);
        }
    }, [resetFavoriteLaunchState]);

    const handleLoadScript = useCallback(async (nextScript: ScriptMetadata) => {
        await openScriptViewer(nextScript.id, Boolean(nextScript.is_public));
    }, [openScriptViewer]);

    const handleRenameScript = useCallback(async (scriptId: string, newTitle: string) => {
        try {
            await renameDashboardScript(scriptId, newTitle);
            setScriptsList((currentScripts) =>
                currentScripts.map((currentScript) =>
                    currentScript.id === scriptId ? { ...currentScript, title: newTitle } : currentScript
                )
            );
        } catch (renameError) {
            console.error("Error while renaming script", renameError);
            setError("Impossible de renommer le script.");
        }
    }, []);

    const handleDeleteScript = useCallback(async (scriptId: string) => {
        try {
            await deleteDashboardScript(scriptId);
            setScriptsList((currentScripts) =>
                currentScripts.filter((currentScript) => currentScript.id !== scriptId)
            );

            if (selectedScriptMeta?.id === scriptId) {
                setScript(null);
                setSelectedScriptMeta(null);
            }
        } catch (deleteError) {
            console.error("Error while deleting script", deleteError);
            setError("Impossible de supprimer le script.");
        }
    }, [selectedScriptMeta]);

    const handleTogglePublic = useCallback(async (nextScript: ScriptMetadata) => {
        const previousState = [...scriptsList];
        const newStatus = !nextScript.is_public;

        setScriptsList((currentScripts) =>
            currentScripts.map((currentScript) =>
                currentScript.id === nextScript.id ? { ...currentScript, is_public: newStatus } : currentScript
            )
        );

        try {
            await toggleDashboardScriptPublicStatus(nextScript);
            await refreshScripts();
        } catch (toggleError) {
            console.error("Error while toggling public status", toggleError);
            setError("Impossible de modifier le statut public.");
            setScriptsList(previousState);
        }
    }, [refreshScripts, scriptsList]);

    const handleCancelVocalization = useCallback(async (scriptId: string) => {
        try {
            await cancelDashboardVocalization(scriptId);
            await refreshScripts();
        } catch (cancelError) {
            const message = cancelError instanceof Error
                ? cancelError.message
                : "Impossible d'arrêter la génération audio.";
            toast.error(message);
        }
    }, [refreshScripts]);

    const handleConfirmSelection = useCallback((
        character: string,
        mode: "reader" | "rehearsal" | "listen",
        ignored?: string[],
        showDirections?: boolean
    ) => {
        setRehearsalChar(character);
        setIgnoredCharacters(ignored || []);
        setShowStageDirections(showDirections !== undefined ? showDirections : true);
        resetFavoriteLaunchState();

        if (mode === "rehearsal") {
            setViewMode("rehearsal");
            return;
        }

        if (mode === "listen") {
            setViewMode("listen");
            return;
        }

        setViewMode("setup");
    }, [resetFavoriteLaunchState]);

    const handleStartSession = useCallback((settings: ScriptSettings) => {
        setSessionSettings(settings);
        resetFavoriteLaunchState();
        setViewMode("reader");
    }, [resetFavoriteLaunchState]);

    const handleExitView = useCallback(() => {
        setRehearsalChar(null);
        resetFavoriteLaunchState();
        setViewMode("viewer");
    }, [resetFavoriteLaunchState]);

    const handleCloseScriptViewer = useCallback(() => {
        resetFavoriteLaunchState();
        setScript(null);
        setSelectedScriptMeta(null);
    }, [resetFavoriteLaunchState]);

    useEffect(() => {
        const existingSession = readMobileFlowSession("solo-favorite-launch");
        if (existingSession) {
            setMobileFlowTransition(existingSession.phase);
            return;
        }

        if (!favoriteIdToLaunch) {
            setMobileFlowTransition("idle");
            return;
        }

        beginMobileFlowSession({
            name: "solo-favorite-launch",
            phase: "navigating",
            favoriteId: favoriteIdToLaunch,
        });
        setMobileFlowTransition("navigating");
    }, [favoriteIdToLaunch]);

    useEffect(() => {
        if (!favoriteIdToLaunch || favoriteIdToLaunch === handledFavoriteId || isLaunchingFavorite) {
            return;
        }

        let cancelled = false;

        const launchFavoriteSession = async () => {
            setIsLaunchingFavorite(true);
            setError(null);
            syncMobileFlowTransition("mounting");

            try {
                const payload = await launchDashboardFavorite(favoriteIdToLaunch);

                if (cancelled) {
                    return;
                }

                setScript(payload.script as ParsedScript);
                setSelectedScriptMeta({
                    id: payload.script.id,
                    isPublic: Boolean(payload.script.is_public),
                });
                setRehearsalChar(payload.favorite.characterName);
                setIgnoredCharacters(payload.favorite.ignoredCharacters);
                setShowStageDirections(payload.favorite.showStageDirections);
                persistFavoriteQuickStart(payload.favorite);

                if (payload.favorite.launchMode === "reader") {
                    setSessionSettings({
                        visibility: payload.favorite.preset.visibility,
                        mode: payload.favorite.preset.mode,
                    });
                    setListenInitialConfig(null);
                    setRehearsalInitialConfig(null);
                    setShouldAutoStartSession(false);
                    setViewMode("reader");
                } else if (payload.favorite.launchMode === "listen") {
                    setListenInitialConfig(payload.favorite.preset);
                    setRehearsalInitialConfig(null);
                    setShouldAutoStartSession(true);
                    setViewMode("listen");
                } else {
                    setSessionSettings({
                        visibility: payload.favorite.preset.visibility,
                        mode: payload.favorite.preset.mode,
                    });
                    setRehearsalInitialConfig(payload.favorite.preset);
                    setListenInitialConfig(null);
                    setShouldAutoStartSession(true);
                    setViewMode("rehearsal");
                }

                setHandledFavoriteId(favoriteIdToLaunch);
                router.replace("/dashboard");
            } catch (launchError) {
                if (cancelled) {
                    return;
                }

                const message = launchError instanceof Error
                    ? launchError.message
                    : "Impossible de relancer ce favori.";
                toast.error(message);
                setHandledFavoriteId(favoriteIdToLaunch);
                syncMobileFlowTransition("idle");
                router.replace("/favoris");
            } finally {
                if (!cancelled) {
                    setIsLaunchingFavorite(false);
                }
            }
        };

        void launchFavoriteSession();

        return () => {
            cancelled = true;
        };
    }, [favoriteIdToLaunch, handledFavoriteId, isLaunchingFavorite, router, syncMobileFlowTransition]);

    useEffect(() => {
        if (!favoriteIdToLaunch && handledFavoriteId) {
            setHandledFavoriteId(null);
        }
    }, [favoriteIdToLaunch, handledFavoriteId]);

    return {
        state: {
            userName,
            userId,
            userEmail,
            userTier,
            scriptsList,
            filteredScriptsList,
            isLoading,
            error,
            showImportGuide,
            searchQuery,
            isSearchPending: searchQuery !== deferredSearchQuery,
            showMobileSearch,
            viewMode,
            script,
            selectedScriptMeta,
            activeIndex,
            rehearsalChar,
            sessionSettings,
            ignoredCharacters,
            showStageDirections,
            isLoadingDetail,
            favoriteConfig: {
                listen: listenInitialConfig,
                rehearsal: rehearsalInitialConfig,
                autoStart: shouldAutoStartSession,
            },
            isLaunchingFavorite,
            mobileFlowTransition,
        },
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
        handleBackToViewer: () => setViewMode("viewer"),
        completeMobileFlowTransition,
        layoutMode,
    };
}
