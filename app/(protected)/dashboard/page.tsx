"use client";

import { useState, useEffect } from "react";
import {
  getScripts,
  deleteScript,
  getScriptById,
  togglePublicStatus,
  renameScriptAction,
  getUserTierAction
} from "./actions";
import { ParsedScript, ScriptMetadata } from "@/lib/types";
import { ScriptViewerSingle } from "@/components/script-viewer-single";
import { ScriptSetup, ScriptSettings } from "@/components/script-setup";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import { getScriptsWithVoiceConfig } from "@/lib/actions/voice-cache";
import { Loader2, AlertCircle } from "lucide-react"; // Using lucide direct import where possible, Button is usually component
// Fix: Button should be from ui/button (Step 1 correction)
// Actually DashboardHeader handles the UI. I only need Button/AlertCircle for the Error/Back UI in "ScriptView" mode.
// Let's import proper UI components.

import { DashboardHeader } from "./components/dashboard-header";

import { ScriptGrid } from "./components/script-grid";
import { ImportWizard } from "./components/import-wizard";
import { StoriesFooter } from "./components/stories-footer";

// Lazy load heavy components
const RehearsalMode = dynamic(() => import("@/components/rehearsal-mode").then(mod => ({ default: mod.RehearsalMode })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
});

const ScriptReader = dynamic(() => import("@/components/script-reader").then(mod => ({ default: mod.ScriptReader })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
});

const ListenMode = dynamic(() => import("@/components/listen-mode").then(mod => ({ default: mod.ListenMode })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
});

export default function Home() {
  const [userName, setUserName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userTier, setUserTier] = useState<"free" | "solo_pro" | "troupe" | "troupe_xl">("free");

  const [scriptsList, setScriptsList] = useState<ScriptMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");

  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Import State
  const [showImportGuide, setShowImportGuide] = useState(false);

  // View / Play State
  const [viewMode, setViewMode] = useState<"viewer" | "reader" | "setup" | "rehearsal" | "listen">("viewer");
  const [script, setScript] = useState<ParsedScript | null>(null);
  const [selectedScriptMeta, setSelectedScriptMeta] = useState<{ id: string, isPublic: boolean } | null>(null);

  // Dashboard Active Script Index (Sync between Carousel and Footer)
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Session Settings
  const [rehearsalChar, setRehearsalChar] = useState<string | null>(null);
  const [sessionSettings, setSessionSettings] = useState<ScriptSettings>({
    visibility: "visible",
    mode: "full",
  });
  const [ignoredCharacters, setIgnoredCharacters] = useState<string[]>([]);
  const [showStageDirections, setShowStageDirections] = useState(true); // Stage directions toggle state
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Dashboard Layout Mode (Grid vs List)
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");

  // Load User & Scripts on Mount
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          if (user.email) setUserEmail(user.email);

          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .single();

          if (profile?.first_name) {
            setUserName(profile.first_name);
          } else if (user.email) {
            setUserName(user.email.split('@')[0]);
          }

          const tier = await getUserTierAction();
          setUserTier(tier);
        }
      } catch (e) {
        console.error("Client Init Error:", e);
        setError("Erreur de connexion. Veuillez rafraîchir.");
      }
      refreshScripts();
    };
    init();
  }, []);

  const refreshScripts = async () => {
    try {
      const [fetchedScripts, voiceConfigIds] = await Promise.all([
        getScripts(),
        getScriptsWithVoiceConfig() // Assuming this function is still available and correct
      ]);

      const scriptsWithVoiceStatus = fetchedScripts.map(s => ({
        ...s,
        hasVoiceConfig: voiceConfigIds.includes(s.id)
      }));

      setScriptsList(scriptsWithVoiceStatus);
    } catch (err) {
      console.error("Failed to fetch scripts", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- SCRIPT ACTIONS (Passed to Grid) ---

  const openScriptViewer = async (scriptId: string, isPublic: boolean) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const fullScript = await getScriptById(scriptId);
      if (fullScript) {
        setScript(fullScript as unknown as ParsedScript);
        setSelectedScriptMeta({ id: scriptId, isPublic });
        setViewMode("viewer");
      } else {
        setError("Impossible de charger le script.");
      }
    } catch (err) {
      setError("Erreur lors du chargement du script.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleLoadScript = async (s: ScriptMetadata) => {
    await openScriptViewer(s.id, s.is_public || false);
  };

  const handleRenameScript = async (id: string, newTitle: string) => {
    try {
      await renameScriptAction(id, newTitle);
      setScriptsList(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    } catch (err) {
      setError("Impossible de renommer le script.");
    }
  };

  const handleDeleteScript = async (id: string) => {
    try {
      await deleteScript(id);
      setScriptsList(prev => prev.filter(s => s.id !== id));
      if (script && selectedScriptMeta?.id === id) {
        setScript(null);
      }
    } catch (err) {
      setError("Impossible de supprimer le script (Droits insuffisants ?)");
    }
  };

  const handleTogglePublic = async (s: ScriptMetadata) => {
    const previousState = [...scriptsList];
    const newStatus = !s.is_public;

    // Optimistic
    setScriptsList(prev => prev.map(item => item.id === s.id ? { ...item, is_public: newStatus } : item));

    try {
      await togglePublicStatus(s.id, s.is_public);
      await refreshScripts();
    } catch (err) {
      setError("Impossible de modifier le statut publique.");
      setScriptsList(previousState);
    }
  };

  // --- VIEWER CALLBACKS ---

  const handleConfirmSelection = (character: string, mode: 'reader' | 'rehearsal' | 'listen', ignored?: string[], showDirections?: boolean) => {
    setRehearsalChar(character);
    setIgnoredCharacters(ignored || []);
    setShowStageDirections(showDirections !== undefined ? showDirections : true); // Update stage directions preference
    if (mode === 'rehearsal') setViewMode("rehearsal");
    else if (mode === 'listen') setViewMode("listen");
    else setViewMode("setup");
  };

  const handleStartSession = (settings: ScriptSettings) => {
    setSessionSettings(settings);
    setViewMode("reader");
  };

  const handleExitView = () => {
    setRehearsalChar(null);
    setViewMode("viewer");
  };

  // --- RENDER VIEWS ---
  // Using conditional rendering instead of early returns to avoid React hooks order issues

  // Listen Mode
  if (script && viewMode === "listen") {
    return (
      <ListenMode
        script={script}
        userCharacters={rehearsalChar ? [rehearsalChar] : []}
        onExit={handleExitView}
        scriptId={selectedScriptMeta?.id}
        isPublicScript={selectedScriptMeta?.isPublic}
        skipCharacters={ignoredCharacters}
        showStageDirections={showStageDirections}
      />
    );
  }

  // Rehearsal Mode
  if (rehearsalChar && script && viewMode === "rehearsal") {
    return (
      <RehearsalMode
        script={script}
        userCharacters={[rehearsalChar]}
        onExit={handleExitView}
        initialSettings={sessionSettings}
        scriptId={selectedScriptMeta?.id}
        isPublicScript={selectedScriptMeta?.isPublic}
        initialIgnoredCharacters={ignoredCharacters}
        showStageDirections={showStageDirections}
      />
    );
  }

  // Reader Mode
  if (rehearsalChar && script && viewMode === "reader") {
    return (
      <ScriptReader
        script={script}
        userCharacters={[rehearsalChar]}
        onExit={handleExitView}
        settings={sessionSettings}
        userId={userId}
        skipCharacters={ignoredCharacters}
        showStageDirections={showStageDirections}
      />
    );
  }

  // Setup Mode
  if (rehearsalChar && script && viewMode === "setup") {
    return (
      <ScriptSetup
        script={script}
        character={rehearsalChar}
        onStart={handleStartSession}
        onBack={() => setViewMode("viewer")}
      />
    );
  }

  // Script Viewer (when script is loaded but not in a specific mode)
  if (script && viewMode === "viewer") {
    return (
      <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200 animate-in slide-in-from-top-2 w-full max-w-2xl">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {isLoadingDetail ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
          <ScriptViewerSingle
            script={script}
            onConfirm={handleConfirmSelection}
            onBack={() => setScript(null)}
          />
        )}
      </div>
    );
  }

  // Dashboard Active Script (Scroll Sync)



  return (
    <div className="max-w-7xl mx-auto min-h-screen relative pt-24 pb-40 md:pb-12">

      {/* 1. DASHBOARD HEADER (In flow) */}
      <div className="px-6 md:px-12 mb-6">
        <DashboardHeader
          userName={userName}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showMobileSearch={showMobileSearch}
          setShowMobileSearch={setShowMobileSearch}
          onImportClick={() => setShowImportGuide(true)}
          isPending={false}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
        />
      </div>

      {/* 2. CONTENT */}
      <div className="px-6 md:px-12 animate-in fade-in zoom-in duration-500">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200 mb-6 animate-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Script Grid/Carousel */}
        <ScriptGrid
          scripts={scriptsList}
          isLoading={isLoading}
          searchQuery={searchQuery}
          userEmail={userEmail}
          onLoad={handleLoadScript}
          onDelete={handleDeleteScript}
          onRename={handleRenameScript}
          onTogglePublic={handleTogglePublic}
          onImport={() => setShowImportGuide(true)}
          layoutMode={layoutMode}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
        />

        {/* Import Wizard Overlay */}
        <ImportWizard
          showImportGuide={showImportGuide}
          setShowImportGuide={setShowImportGuide}
          userTier={userTier}
          userEmail={userEmail}
          onImportComplete={refreshScripts}
          onError={setError}
        />
      </div>

      {/* 3. STORIES FOOTER (Fixed, handled in component) */}
      {layoutMode === "grid" && (
        <StoriesFooter
          scripts={scriptsList}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
        />
      )}

      {/* Modals */}
    </div>
  );
}
