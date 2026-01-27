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
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getScriptsWithVoiceConfig } from "@/lib/actions/voice-cache";
import { Loader2, AlertCircle } from "lucide-react"; // Using lucide direct import where possible, Button is usually component
// Fix: Button should be from ui/button (Step 1 correction)
// Actually DashboardHeader handles the UI. I only need Button/AlertCircle for the Error/Back UI in "ScriptView" mode.
// Let's import proper UI components.
import { Button as UIButton } from "@/components/ui/button";

import { DashboardHeader } from "./components/dashboard-header";

import { ScriptGrid } from "./components/script-grid";
import { ImportWizard } from "./components/import-wizard";
import { ScriptSettingsModal } from "./components/script-settings-modal";

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

const ADMIN_EMAIL = "alex69.sartre@gmail.com";

export default function Home() {
  const [userName, setUserName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userTier, setUserTier] = useState<"free" | "solo_pro" | "troupe">("free");

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

  // Session Settings
  const [rehearsalChar, setRehearsalChar] = useState<string | null>(null);
  const [sessionSettings, setSessionSettings] = useState<ScriptSettings>({
    visibility: "visible",
    mode: "full",
  });
  const [ignoredCharacters, setIgnoredCharacters] = useState<string[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Settings Modal State
  const [settingsScript, setSettingsScript] = useState<{ id: string; title: string; characters: string[] } | null>(null);

  const router = useRouter();

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- SCRIPT ACTIONS (Passed to Grid) ---

  const handleLoadScript = async (s: ScriptMetadata) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const fullScript = await getScriptById(s.id);
      if (fullScript) {
        setScript(fullScript as unknown as ParsedScript);
        setSelectedScriptMeta({ id: s.id, isPublic: s.is_public || false });
      } else {
        setError("Impossible de charger le script.");
      }
    } catch (err) {
      setError("Erreur lors du chargement du script.");
    } finally {
      setIsLoadingDetail(false);
      setViewMode("viewer");
    }
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

  const handleConfirmSelection = (character: string, mode: 'reader' | 'rehearsal' | 'listen', ignored?: string[]) => {
    setRehearsalChar(character);
    setIgnoredCharacters(ignored || []);
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

  if (rehearsalChar && script && viewMode === "listen") {
    return (
      <ListenMode
        script={script}
        userCharacters={[rehearsalChar]}
        onExit={handleExitView}
        scriptId={selectedScriptMeta?.id}
        isPublicScript={selectedScriptMeta?.isPublic}
        skipCharacters={ignoredCharacters}
      />
    );
  }

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
      />
    );
  }

  if (rehearsalChar && script && viewMode === "reader") {
    return (
      <ScriptReader
        script={script}
        userCharacters={[rehearsalChar]}
        onExit={handleExitView}
        settings={sessionSettings}
        userId={userId}
        skipCharacters={ignoredCharacters}
      />
    );
  }

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

  if (script) {
    return (
      <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex gap-4 self-start">
          <UIButton
            variant="ghost"
            onClick={() => setScript(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Retour
          </UIButton>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 animate-in slide-in-from-top-2 w-full max-w-2xl">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {isLoadingDetail ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
          <ScriptViewerSingle script={script} onConfirm={handleConfirmSelection} />
        )}
      </div>
    );
  }

  // --- MAIN DASHBOARD ---

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 pb-32 animate-in fade-in zoom-in duration-500 relative min-h-screen">

      {/* 1. HEADER */}
      <DashboardHeader
        userName={userName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showMobileSearch={showMobileSearch}
        setShowMobileSearch={setShowMobileSearch}
        onLogout={handleLogout}
        onImportClick={() => setShowImportGuide(true)}
        isPending={false} // Global pending state if needed
      />



      {/* 3. ERROR (Global) */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 animate-in slide-in-from-top-2 mx-auto max-w-2xl mb-8">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* 4. GRID */}
      <ScriptGrid
        scripts={scriptsList}
        isLoading={isLoading}
        searchQuery={searchQuery}
        userEmail={userEmail}
        onLoad={handleLoadScript}
        onDelete={handleDeleteScript}
        onRename={handleRenameScript}
        onTogglePublic={handleTogglePublic}
        onSettings={async (s) => {
          // Load full script to get characters
          const fullScript = await getScriptById(s.id);
          if (fullScript) {
            setSettingsScript({
              id: s.id,
              title: fullScript.title,
              characters: fullScript.characters || [],
            });
          }
        }}
        onImport={() => setShowImportGuide(true)}
      />

      {/* 5. IMPORT WIZARD (Overlay) */}
      <ImportWizard
        showImportGuide={showImportGuide}
        setShowImportGuide={setShowImportGuide}
        userTier={userTier}
        userEmail={userEmail}
        onImportComplete={refreshScripts}
        onError={setError}
      />

      {/* 6. SCRIPT SETTINGS MODAL */}
      {settingsScript && (
        <ScriptSettingsModal
          scriptId={settingsScript.id}
          scriptTitle={settingsScript.title}
          characters={settingsScript.characters}
          onClose={() => setSettingsScript(null)}
        />
      )}
    </div>
  );
}
