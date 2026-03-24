import type { ScriptSettings } from "@/components/script-setup";
import type { MobileFlowTransitionState } from "@/lib/mobile-flow-transition";
import type { ScriptMetadata, ParsedScript } from "@/lib/types";
import type {
    SoloFavoriteDraft,
    SoloListenFavoriteDraft,
    SoloRehearsalFavoriteDraft,
} from "@/lib/solo-favorites";

export type DashboardUserTier = "free" | "solo_pro" | "troupe" | "troupe_xl";
export type DashboardViewMode = "viewer" | "reader" | "setup" | "rehearsal" | "listen";
export type DashboardViewportVariant = "mobile" | "desktop";

export interface DashboardCurrentUserSnapshot {
    id: string;
    email: string | null;
    name: string;
    tier: DashboardUserTier;
}

export interface DashboardSelectedScriptMeta {
    id: string;
    isPublic: boolean;
}

export interface DashboardHeaderProps {
    userName: string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSearchPending: boolean;
    showMobileSearch: boolean;
    setShowMobileSearch: (show: boolean) => void;
    onImportClick: () => void;
    isPending: boolean;
    layoutMode: "grid" | "list";
    setLayoutMode: (mode: "grid" | "list") => void;
}

export interface DashboardGridProps {
    scripts: ScriptMetadata[];
    isLoading: boolean;
    userEmail: string | null;
    onLoad: (script: ScriptMetadata) => void;
    onRename: (id: string, newTitle: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onTogglePublic: (script: ScriptMetadata) => Promise<void>;
    onCancelVocalization: (scriptId: string) => Promise<void>;
    onImport: () => void;
    layoutMode: "grid" | "list";
    activeIndex?: number;
    onIndexChange?: (index: number) => void;
}

export interface DashboardHomeRendererProps extends DashboardHeaderProps, DashboardGridProps {
    error: string | null;
}

export interface DashboardFavoriteConfigState {
    listen: SoloListenFavoriteDraft["preset"] | null;
    rehearsal: SoloRehearsalFavoriteDraft["preset"] | null;
    autoStart: boolean;
}

export interface DashboardScreenState {
    userName: string;
    userId: string;
    userEmail: string | null;
    userTier: DashboardUserTier;
    scriptsList: ScriptMetadata[];
    filteredScriptsList: ScriptMetadata[];
    isLoading: boolean;
    error: string | null;
    showImportGuide: boolean;
    searchQuery: string;
    isSearchPending: boolean;
    showMobileSearch: boolean;
    viewMode: DashboardViewMode;
    script: ParsedScript | null;
    selectedScriptMeta: DashboardSelectedScriptMeta | null;
    activeIndex: number;
    rehearsalChar: string | null;
    sessionSettings: ScriptSettings;
    ignoredCharacters: string[];
    showStageDirections: boolean;
    isLoadingDetail: boolean;
    favoriteConfig: DashboardFavoriteConfigState;
    isLaunchingFavorite: boolean;
    mobileFlowTransition: MobileFlowTransitionState;
}

export type SaveFavoriteDraftHandler = (draft: SoloFavoriteDraft) => Promise<void>;
