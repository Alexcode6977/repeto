"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle, Trash2, FileText, Plus, Play, MoreVertical, LogOut, X, Edit3 } from "lucide-react";
import { useState, useTransition, useEffect, useMemo, useCallback, useRef } from "react";
import { parsePdfAction, saveScript, getScripts, deleteScript, getScriptById, togglePublicStatus, detectCharactersAction, finalizeParsingAction, renameScriptAction, getUserTierAction, importScriptWithAI } from "./actions";
import { ParsedScript } from "@/lib/types";
import { ScriptViewerSingle } from "@/components/script-viewer-single";
import { ScriptSetup, ScriptSettings } from "@/components/script-setup";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Globe, Lock, Check, UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import { getScriptsWithVoiceConfig } from "@/lib/actions/voice-cache";

// Lazy load heavy components for better initial load
const RehearsalMode = dynamic(() => import("@/components/rehearsal-mode").then(mod => ({ default: mod.RehearsalMode })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
});

const ScriptReader = dynamic(() => import("@/components/script-reader").then(mod => ({ default: mod.ScriptReader })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
});

const ListenMode = dynamic(() => import("@/components/listen-mode").then(mod => ({ default: mod.ListenMode })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
});

// Extend ParsedScript to include DB fields
// type SavedScript = ParsedScript & { id: string; created_at: string };
// NEW TYPE: Lightweight metadata for the list
type ScriptMetadata = {
  id: string;
  title: string;
  created_at: string;
  characterCount: number;
  lineCount: number;
  is_public: boolean;
  is_owner: boolean;
};

const ADMIN_EMAIL = "alex69.sartre@gmail.com";

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [script, setScript] = useState<ParsedScript | null>(null); // Current active script for viewer
  const [scriptsList, setScriptsList] = useState<ScriptMetadata[]>([]); // List of all scripts (metadata only)
  const [rehearsalChar, setRehearsalChar] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"viewer" | "setup" | "reader" | "rehearsal" | "listen">("viewer"); // NEW state
  const [sessionSettings, setSessionSettings] = useState<ScriptSettings>({
    visibility: "visible",
    mode: "full"
  });
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>(""); // Need email for admin check
  const [userId, setUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false); // New loading state for detail fetch

  // Import / Rename State
  const [customTitle, setCustomTitle] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  // Deep Parsing States
  const [detectedCharacters, setDetectedCharacters] = useState<string[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [isDeepParsing, setIsDeepParsing] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [editingChar, setEditingChar] = useState<string | null>(null);
  const [tempCharName, setTempCharName] = useState("");
  const [renamingScriptId, setRenamingScriptId] = useState<string | null>(null);
  const [renamingScriptTitle, setRenamingScriptTitle] = useState("");
  const [libraryView, setLibraryView] = useState<"personal" | "shared">("personal");
  const [selectedScriptMeta, setSelectedScriptMeta] = useState<{ id: string; isPublic: boolean } | null>(null);
  const [showImportGuide, setShowImportGuide] = useState(false); // NEW: Import guide modal state
  const [userTier, setUserTier] = useState<"free" | "solo_pro" | "troupe">("free"); // Subscription tier
  const [isAiImporting, setIsAiImporting] = useState(false); // AI import loading state
  const [aiImportStep, setAiImportStep] = useState<0 | 1 | 2 | 3>(0); // 0=idle, 1=extracting, 2=cleaning, 3=parsing
  const [aiImportProgress, setAiImportProgress] = useState(0); // Progress percentage for current step
  const [aiImportSuccess, setAiImportSuccess] = useState(false); // Success state
  const [aiImportCancelled, setAiImportCancelled] = useState(false); // Cancel flag
  const [aiImportCountdown, setAiImportCountdown] = useState(300); // 5 minute countdown in seconds
  const aiImportIntervalsRef = useRef<NodeJS.Timeout[]>([]); // Store intervals for cleanup

  // Cancel AI import
  const cancelAiImport = () => {
    // Clear all running intervals
    aiImportIntervalsRef.current.forEach(id => clearInterval(id));
    aiImportIntervalsRef.current = [];

    setAiImportCancelled(true);
    setIsAiImporting(false);
    setAiImportStep(0);
    setAiImportProgress(0);
    setAiImportCountdown(300); // Reset countdown
    setShowImportGuide(false);
  };

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

          // Fetch profile for first name
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

          // Fetch user tier for UI decisions
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
        getScriptsWithVoiceConfig()
      ]);

      // Merge voice config status into scripts
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
  }


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCurrentFile(file);
    const formData = new FormData();
    formData.append("file", file);

    setIsImporting(true);
    setImportProgress(20);

    startTransition(async () => {
      const result = await detectCharactersAction(formData);
      setIsImporting(false);

      if ("error" in result) {
        setError(result.error);
      } else {
        setDetectedCharacters(result.characters || []);
        setSelectedCharacters(result.characters || []);
        setCustomTitle(result.title || file.name.replace(".pdf", ""));
        setValidationModalOpen(true);
      }
      e.target.value = "";
    });
  };

  // AI-powered import for Solo Pro users
  const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    // Keep modal open, just switch to progress mode
    setIsAiImporting(true);
    setAiImportSuccess(false);
    setAiImportCancelled(false); // Reset cancel flag
    setAiImportStep(1); // Step 1: Extraction
    setAiImportProgress(0);
    aiImportIntervalsRef.current = []; // Clear any old intervals

    // Simulate extraction progress
    const extractionInterval = setInterval(() => {
      setAiImportProgress(prev => Math.min(prev + 15, 90));
    }, 200);
    aiImportIntervalsRef.current.push(extractionInterval);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Step 1 complete, move to Step 2
      clearInterval(extractionInterval);
      setAiImportProgress(100);
      await new Promise(r => setTimeout(r, 300));

      // Check if cancelled
      if (aiImportCancelled) return;

      setAiImportStep(2); // Step 2: AI Cleaning
      setAiImportProgress(0);
      setAiImportCountdown(300); // Start at 5 minutes

      // Start countdown timer
      const countdownInterval = setInterval(() => {
        setAiImportCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      aiImportIntervalsRef.current.push(countdownInterval);

      // AI cleaning takes time, animate progress slowly
      const cleaningStart = Date.now();
      const cleaningInterval = setInterval(() => {
        const elapsed = Date.now() - cleaningStart;
        // Very slow progress curve (takes 5 min to reach 95%)
        const progress = Math.min(95, (elapsed / 3000)); // 3s per 1%
        setAiImportProgress(Math.floor(progress));
      }, 1000);
      aiImportIntervalsRef.current.push(cleaningInterval);

      const result = await importScriptWithAI(formData);

      clearInterval(cleaningInterval);

      // Check if cancelled during API call
      if (aiImportCancelled) return;

      setAiImportProgress(100);
      await new Promise(r => setTimeout(r, 300));

      if ("error" in result) {
        setError(result.error);
        setIsAiImporting(false);
        setAiImportStep(0);
      } else {
        // Step 3: Saving
        setAiImportStep(3);
        setAiImportProgress(0);

        const finalScript = {
          ...result,
          title: result.title || file.name.replace(".pdf", "")
        };

        setAiImportProgress(50);
        await saveScript(finalScript);

        // Check if cancelled
        if (aiImportCancelled) return;

        setAiImportProgress(80);
        await refreshScripts();
        setAiImportProgress(100);

        // Show success
        setAiImportSuccess(true);

        // Close modal after 1.5s
        setTimeout(() => {
          setShowImportGuide(false);
          setIsAiImporting(false);
          setAiImportStep(0);
          setAiImportSuccess(false);
        }, 1500);
      }
    } catch (err: any) {
      if (!aiImportCancelled) {
        setError(err.message || "Erreur lors de l'import IA.");
        setIsAiImporting(false);
        setAiImportStep(0);
      }
    } finally {
      e.target.value = "";
      // Clear intervals on completion
      aiImportIntervalsRef.current.forEach(id => clearInterval(id));
      aiImportIntervalsRef.current = [];
    }
  };

  const startDeepParsing = async () => {
    if (!currentFile || selectedCharacters.length === 0) return;

    setValidationModalOpen(false);
    setIsDeepParsing(true);
    setImportProgress(0);

    // Fake progress for deep parsing which is slow
    const interval = setInterval(() => {
      setImportProgress(prev => (prev < 90 ? prev + 1 : prev));
    }, 1000);

    try {
      const formData = new FormData();
      formData.append("file", currentFile);

      const result = await finalizeParsingAction(formData, selectedCharacters);

      clearInterval(interval);
      setImportProgress(100);

      if ("error" in result) {
        setError(result.error);
      } else {
        await saveScript({ ...result, title: customTitle });
        await refreshScripts();
      }
    } catch (e) {
      setError("Erreur lors de l'analyse approfondie.");
    } finally {
      setIsDeepParsing(false);
      setCurrentFile(null);
    }
  };

  const toggleCharacter = (char: string) => {
    setSelectedCharacters(prev =>
      prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
    );
  };

  const addCharacter = () => {
    if (!newCharName.trim()) return;
    const name = newCharName.trim().toUpperCase();
    if (!detectedCharacters.includes(name)) {
      setDetectedCharacters(prev => [...prev, name]);
      setSelectedCharacters(prev => [...prev, name]);
    }
    setNewCharName("");
  };

  const handleRenameCharacter = (oldName: string) => {
    const finalNewName = tempCharName.trim().toUpperCase();
    if (!finalNewName || finalNewName === oldName) {
      setEditingChar(null);
      return;
    }

    setDetectedCharacters(prev => prev.map(c => c === oldName ? finalNewName : c));
    setSelectedCharacters(prev => prev.map(c => c === oldName ? finalNewName : c));
    setEditingChar(null);
  };

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
      setViewMode("viewer"); // Reset view mode when loading new script
    }
  };

  // --- DELETE MODAL STATE ---
  const [scriptToDelete, setScriptToDelete] = useState<ScriptMetadata | null>(null);

  const handleDeleteScript = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const script = scriptsList.find(s => s.id === id);
    if (script) {
      setScriptToDelete(script);
    }
  };

  const confirmDeleteScript = async () => {
    if (!scriptToDelete) return;
    try {
      await deleteScript(scriptToDelete.id);
      setScriptsList((prev) => prev.filter((s) => s.id !== scriptToDelete.id));
      if (script && (script as any).id === scriptToDelete.id) {
        setScript(null);
      }
      setScriptToDelete(null); // Close modal
    } catch (err) {
      setError("Impossible de supprimer le script (Droits insuffisants ?).");
      setScriptToDelete(null); // Close modal even on error
    }
  };

  const handleTogglePublic = async (e: React.MouseEvent, s: ScriptMetadata) => {
    e.stopPropagation();
    e.preventDefault(); // Add preventDefault to be safe

    // Store previous state for rollback
    const previousState = [...scriptsList];
    const newStatus = !s.is_public;

    // Optimistic Update
    setScriptsList(prev => prev.map(item =>
      item.id === s.id ? { ...item, is_public: newStatus } : item
    ));

    try {
      await togglePublicStatus(s.id, s.is_public); // Pass OLD status as "currentStatus"
      // Wait a bit to ensure DB propagation before potential refresh
      await refreshScripts();
    } catch (err) {
      console.error("Toggle failed", err);
      setError("Erreur : Impossible de modifier le statut publique.");
      setScriptsList(previousState); // Rollback on error
    }
  }


  const [ignoredCharacters, setIgnoredCharacters] = useState<string[]>([]);

  const handleConfirmSelection = (character: string, mode: 'reader' | 'rehearsal' | 'listen', ignored?: string[]) => {
    setRehearsalChar(character);
    setIgnoredCharacters(ignored || []);
    if (mode === 'rehearsal') {
      setViewMode("rehearsal");
    } else if (mode === 'listen') {
      setViewMode("listen");
    } else {
      setViewMode("setup");
    }
  };

  const handleStartSession = (settings: ScriptSettings) => {
    setSessionSettings(settings);
    setViewMode("reader");
  };

  const handleRenameSubmit = async (e: React.FormEvent, scriptId: string) => {
    e.preventDefault();
    if (!renamingScriptTitle.trim()) return;

    try {
      await renameScriptAction(scriptId, renamingScriptTitle.trim());
      setScriptsList(prev => prev.map(s => s.id === scriptId ? { ...s, title: renamingScriptTitle.trim() } : s));
      setRenamingScriptId(null);
    } catch (err) {
      setError("Erreur : Impossible de renommer le script.");
    }
  };

  const handleExitView = () => {
    setRehearsalChar(null);
    setViewMode("viewer");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // --- VIEWS ---

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
          <Button
            variant="ghost"
            onClick={() => setScript(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Retour
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 animate-in slide-in-from-top-2 w-full max-w-2xl">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <ScriptViewerSingle script={script} onConfirm={handleConfirmSelection} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 pb-32 animate-in fade-in zoom-in duration-500 relative min-h-screen">

      {/* Floating Action Button (Mobile) - Always Visible */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <label className="flex items-center justify-center w-16 h-16 bg-primary rounded-full shadow-[0_0_30px_rgba(124,58,237,0.5)] active:scale-95 transition-transform cursor-pointer">
          {isPending ? (
            <Loader2 className="w-8 h-8 text-foreground animate-spin" />
          ) : (
            <Plus className="w-8 h-8 text-foreground" />
          )}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* Header Section - Minimalist */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 mb-8 md:mb-12 pt-4 md:pt-0">
        <div className="w-full flex items-center justify-between md:block">
          <div className="text-left">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-1">
              Bonjour, <span className="text-primary">{userName || "Artiste"}</span>
            </h1>
            <p className="text-xs md:text-base text-muted-foreground font-medium tracking-wide uppercase">Prêt à répéter ?</p>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-red-400 md:hidden"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Desktop Import Button */}
        <div className="hidden md:flex items-center gap-4">
          <Button
            className="rounded-full px-6 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 btn-glow active:scale-95 group relative overflow-hidden"
            onClick={() => setShowImportGuide(true)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            )}
            <span className="relative z-10 ml-2">Importer un Script</span>
          </Button>
        </div>
      </div>

      {/* Library View Tabs - NEW */}
      <div className="flex items-center gap-2 mb-8 p-1 bg-card border border-white/10 rounded-2xl w-fit mx-auto md:mx-0 backdrop-blur-md">
        <button
          onClick={() => setLibraryView("personal")}
          className={`
            px-6 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-[0.15em] transition-all duration-300
            ${libraryView === "personal"
              ? "bg-primary text-foreground shadow-lg shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-card"}
          `}
        >
          Ma Bibliothèque
        </button>
        <button
          onClick={() => setLibraryView("shared")}
          className={`
            px-6 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-[0.15em] transition-all duration-300
            ${libraryView === "shared"
              ? "bg-primary text-foreground shadow-lg shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-card"}
          `}
        >
          Bibliothèque partagée
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 animate-in slide-in-from-top-2 mx-auto max-w-2xl mb-8">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Grid Content - Responsive Stack on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-1 md:px-0">

        {isLoading ? (
          // Skeleton Loading
          [1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/5] bg-card rounded-3xl skeleton-shimmer" />
          ))
        ) : scriptsList.length > 0 ? (
          (() => {
            const filteredScripts = scriptsList.filter(s =>
              libraryView === "personal" ? s.is_owner : (!s.is_owner || s.is_public)
            );

            if (filteredScripts.length === 0) {
              return (
                <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[2rem] bg-card mx-4 md:mx-0">
                  <div className="w-20 h-20 mx-auto mb-4 opacity-20">
                    <FileText className="w-full h-full text-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-muted-foreground">Aucun document ici</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto px-4">
                    {libraryView === "personal"
                      ? "Commencez par importer votre premier script."
                      : "Les scripts partagés avec vous apparaîtront ici."}
                  </p>
                </div>
              );
            }

            return filteredScripts.map((s, index) => (
              <div
                key={s.id}
                onClick={() => handleLoadScript(s)}
                style={{ animationDelay: `${index * 100}ms` }}
                className={`
                  group relative aspect-[3/4] md:aspect-[4/5] bg-card border border-border rounded-[2rem] overflow-hidden cursor-pointer card-3d hover-glow 
                  active:scale-[0.98] md:hover:border-primary/50 md:hover:shadow-2xl md:hover:shadow-primary/10 transition-all duration-300 animate-bounce-in
                  ${s.is_public ? 'border-amber-500/20' : ''}
                `}
              >
                {/* Card Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10" />

                {/* Public Badge - Floating */}
                {s.is_public && (
                  <div className="absolute top-4 right-4 z-20 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg">
                    <Globe className="w-3 h-3" />
                    Shared
                  </div>
                )}

                {/* Icon / Preview - Large & Centered */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700">
                  <FileText className={`w-32 h-32 md:w-40 md:h-40 ${s.is_public ? 'text-amber-500' : 'text-foreground'}`} />
                </div>

                {/* Content - Bottom Aligned */}
                <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col justify-end h-full">
                  <div className="mb-4">
                    {renamingScriptId === s.id ? (
                      <form
                        onSubmit={(e) => handleRenameSubmit(e, s.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mb-2"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={renamingScriptTitle}
                          onChange={(e) => setRenamingScriptTitle(e.target.value)}
                          onBlur={(e) => handleRenameSubmit(e as any, s.id)}
                          className="w-full bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </form>
                    ) : (
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-2xl md:text-xl font-bold text-foreground leading-tight drop-shadow-md truncate flex-1">
                          {s.title || "Script Sans Titre"}
                        </h3>
                        {s.is_owner && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingScriptId(s.id);
                              setRenamingScriptTitle(s.title);
                            }}
                            className="text-foreground/40 hover:text-foreground transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground/80 uppercase tracking-wider">
                      <span>{s.characterCount} rôles</span>
                      <span className="w-1 h-1 bg-gray-500 rounded-full" />
                      <span>{s.lineCount} répliques</span>
                    </div>
                  </div>

                  {/* Mobile Play Button overlay */}
                  <div className="md:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-xl pointer-events-none">
                    <Play className="w-6 h-6 text-foreground fill-white ml-1" />
                  </div>

                  {/* Desktop Hover Actions */}
                  <div className="hidden md:flex items-center gap-3 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    <Button className="flex-1 bg-white text-black hover:bg-primary hover:text-foreground border-0 font-bold rounded-xl" size="sm">
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      Répéter
                    </Button>

                    {(s.is_owner || userEmail === ADMIN_EMAIL) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-foreground rounded-xl"
                        onClick={(e) => handleDeleteScript(e, s.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {userEmail === ADMIN_EMAIL && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`rounded-xl ${s.is_public ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-muted-foreground'}`}
                        onClick={(e) => handleTogglePublic(e, s)}
                      >
                        {s.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ));
          })()
        ) : (
          /* Empty State */
          <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-border rounded-[2rem] bg-card mx-4 md:mx-0">
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full skeleton-shimmer" />
              <img src="/repeto.png" alt="Repeto Mascot" className="relative w-full h-full object-contain opacity-80" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Votre bibliothèque est vide</h3>
            <p className="text-muted-foreground max-w-sm mx-auto px-4">
              Touchez le bouton + pour importer votre premier script PDF.
            </p>
          </div>
        )}

      </div>

      {/* Import / Deep Parsing Progress Modal */}
      {(isImporting || isDeepParsing) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-popover border border-primary/20 p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(124,58,237,0.3)] animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto skeleton-shimmer">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>

              {/* Title */}
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {isImporting ? "Détection des rôles..." : "Analyse approfondie..."}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {isImporting
                    ? "L'IA identifie les personnages du script"
                    : "Repeto relie chaque réplique à son personnage"}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(importProgress, 100)}%` }}
                  />
                </div>
                <p className="text-primary font-bold text-lg">{Math.round(importProgress)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Character Validation Modal */}
      {validationModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-[#121212] border border-white/10 p-6 rounded-3xl w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-foreground/50 hover:text-foreground"
              onClick={() => setValidationModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Prêt à importer ?</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Vérifiez la liste des personnages détectés. Seuls les sélectionnés seront importés.
              </p>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Titre du script</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ex: Roméo et Juliette"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Personnages ({selectedCharacters.length})</label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detectedCharacters.map(char => (
                    <div
                      key={char}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl border transition-all 
                        ${selectedCharacters.includes(char)
                          ? 'bg-primary/20 border-primary/50 text-foreground'
                          : 'bg-card border-white/10 text-muted-foreground hover:bg-white/10'}
                      `}
                    >
                      <div
                        onClick={() => toggleCharacter(char)}
                        className={`
                        w-5 h-5 rounded flex items-center justify-center border shrink-0 cursor-pointer
                        ${selectedCharacters.includes(char) ? 'bg-primary border-primary' : 'border-white/20'}
                      `}>
                        {selectedCharacters.includes(char) && <Check className="w-3 h-3 text-foreground" />}
                      </div>

                      {editingChar === char ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempCharName}
                          onChange={(e) => setTempCharName(e.target.value)}
                          onBlur={() => handleRenameCharacter(char)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameCharacter(char)}
                          className="flex-1 bg-white/10 border-none rounded px-2 py-0.5 text-foreground focus:outline-none"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span
                            className="font-semibold truncate cursor-pointer"
                            onClick={() => toggleCharacter(char)}
                          >
                            {char}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-foreground/30 hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChar(char);
                              setTempCharName(char);
                            }}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new character */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCharacter()}
                    className="flex-1 bg-card border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Ajouter un personnage..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={addCharacter}
                    className="rounded-xl border-white/10 hover:bg-white/10"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              onClick={startDeepParsing}
              disabled={selectedCharacters.length === 0}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl text-lg shadow-lg mt-6"
            >
              Lancer l'analyse finale
            </Button>
          </div>
        </div>
      )}

      {/* IMPORT MODAL - Admin Only (Choice: Basic vs AI) */}
      {showImportGuide && userEmail === ADMIN_EMAIL && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => !isAiImporting && setShowImportGuide(false)}
        >
          <div
            className="bg-card border border-border p-8 rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {!isAiImporting && (
              <button
                onClick={() => setShowImportGuide(false)}
                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Background Decorations */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

            {isAiImporting ? (
              // Progress State (reuse existing AI import progress UI)
              <div className="py-4">
                {aiImportSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Import réussi !</h3>
                    <p className="text-muted-foreground">Votre script a été importé avec succès.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-foreground">Import IA en cours...</h3>
                    </div>
                    {/* Step 2: AI Cleaning */}
                    <div className="p-4 rounded-2xl border bg-muted/30 border-primary/30">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <span className="font-medium text-foreground">Nettoyage IA</span>
                      </div>
                      <div className="ml-11 space-y-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000"
                            style={{ width: `${aiImportProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>L'IA restructure votre script...</span>
                          <span className="font-mono font-bold text-foreground">
                            {Math.floor(aiImportCountdown / 60)}:{(aiImportCountdown % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border mt-4">
                      <Button variant="ghost" onClick={cancelAiImport} className="w-full text-muted-foreground hover:text-foreground">
                        Annuler l'import
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Admin Choice: Basic vs AI
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-extrabold text-foreground">Mode Admin 🔧</h3>
                  <p className="text-muted-foreground mt-2">Choisissez votre méthode d'import</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Option 1: Basic Import */}
                  <div className="bg-muted/30 border border-border rounded-2xl p-5 hover:border-primary/50 transition-all">
                    <div className="text-center mb-4">
                      <div className="w-14 h-14 mx-auto mb-3 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⚡</span>
                      </div>
                      <h4 className="font-bold text-foreground text-lg">Import Basic</h4>
                      <p className="text-muted-foreground text-xs mt-1">Parsing heuristique</p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-2 mb-4">
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-400" /> Rapide, instantané
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-400" /> Pas de coût OpenAI
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-amber-400" /> Nécessite format PERSO/REPLIQUE
                      </li>
                    </ul>
                    <Button
                      className="w-full py-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                      asChild
                    >
                      <label className="cursor-pointer flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Importer Basic
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            setShowImportGuide(false);
                            handleFileChange(e);
                          }}
                        />
                      </label>
                    </Button>
                  </div>

                  {/* Option 2: AI Import */}
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5 hover:border-green-500/50 transition-all">
                    <div className="text-center mb-4">
                      <div className="w-14 h-14 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🤖</span>
                      </div>
                      <h4 className="font-bold text-foreground text-lg">Import IA</h4>
                      <p className="text-muted-foreground text-xs mt-1">Nettoyage GPT-4</p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-2 mb-4">
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-400" /> Tous formats acceptés
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-400" /> Détection auto des rôles
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-amber-400" /> Peut prendre ~2min
                      </li>
                    </ul>
                    <Button
                      className="w-full py-5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90 text-white font-bold"
                      asChild
                    >
                      <label className="cursor-pointer flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Importer avec IA
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={handleAiFileChange}
                        />
                      </label>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMPORT GUIDE MODAL - Conditional based on tier (Free users, non-admin) */}
      {showImportGuide && userTier === "free" && userEmail !== ADMIN_EMAIL && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => setShowImportGuide(false)}
        >
          <div
            className="bg-card border border-border p-8 rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowImportGuide(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Background Decorations */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header - Full Width */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                📝 Préparez votre script
              </h2>
              <p className="text-muted-foreground mt-2">
                Pour que l'import fonctionne, votre PDF doit être formaté selon ces règles
              </p>
            </div>

            {/* 2-Column Layout */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* LEFT COLUMN - Steps */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="bg-muted/30 border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                  <h4 className="font-bold text-foreground flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/30">1</span>
                    Le Grand Nettoyage
                  </h4>
                  <ul className="text-muted-foreground text-sm space-y-2 ml-11">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400">✗</span>
                      Numéros de pages, en-têtes, pieds de page
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400">✗</span>
                      Descriptions inutiles (décors, actions sans dialogue)
                    </li>
                  </ul>
                </div>

                {/* Step 2 */}
                <div className="bg-muted/30 border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                  <h4 className="font-bold text-foreground flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/30">2</span>
                    Les En-têtes de Scène
                  </h4>
                  <div className="text-muted-foreground text-sm ml-11 space-y-1">
                    <p><code className="bg-muted px-2 py-0.5 rounded text-foreground">Acte X, Scène Y</code></p>
                    <p><code className="bg-muted px-2 py-0.5 rounded text-foreground">Personnages : NOM1, NOM2</code></p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-muted/30 border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                  <h4 className="font-bold text-foreground flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/30">3</span>
                    Format des Dialogues
                  </h4>
                  <div className="text-sm ml-11 space-y-2">
                    <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs font-mono text-foreground">
                      {`PERSO NOM_DU_PERSO

REPLIQUE Le texte...`}
                    </pre>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>• Noms en <strong className="text-foreground">MAJUSCULES</strong></li>
                      <li>• Ligne vide entre nom et réplique</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - Example + Button */}
              <div className="flex flex-col gap-4">
                {/* Example Block */}
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 flex-1">
                  <h4 className="font-bold text-amber-400 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Exemple concret
                  </h4>
                  <pre className="text-sm font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {`Acte 1, Scène 1
Personnages : FOLLAVOINE, ROSE

PERSO FOLLAVOINE

REPLIQUE Voyons, qu'est-ce 
que vous voulez ?

PERSO ROSE

REPLIQUE C'est Madame qui 
demande Monsieur.`}
                  </pre>
                </div>

                {/* Action Button */}
                <div className="space-y-3">
                  <Button
                    className="w-full py-7 rounded-2xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    asChild
                  >
                    <label className="cursor-pointer flex items-center justify-center gap-3">
                      <Upload className="w-6 h-6" />
                      J'ai préparé mon PDF, Importer
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          setShowImportGuide(false);
                          handleFileChange(e);
                        }}
                      />
                    </label>
                  </Button>
                  <p className="text-center text-muted-foreground text-xs">
                    Fichier PDF uniquement • Max 100 pages
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL - Solo Pro / Troupe (AI-powered, non-admin) */}
      {showImportGuide && userTier !== "free" && userEmail !== ADMIN_EMAIL && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => !isAiImporting && setShowImportGuide(false)}
        >
          <div
            className="bg-card border border-border p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {!isAiImporting && (
              <button
                onClick={() => setShowImportGuide(false)}
                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Background Decorations */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {isAiImporting ? (
              // Progress State with Steps
              <div className="py-4">
                {aiImportSuccess ? (
                  // Success State
                  <div className="text-center py-8">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Import réussi !</h3>
                    <p className="text-muted-foreground">
                      Votre script a été importé avec succès.
                    </p>
                  </div>
                ) : (
                  // Progress Steps
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-foreground">Import en cours...</h3>
                    </div>

                    {/* Step 1: Extraction */}
                    <div className={`p-4 rounded-2xl border transition-all ${aiImportStep >= 1 ? 'bg-muted/30 border-primary/30' : 'bg-muted/10 border-border opacity-50'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${aiImportStep > 1 ? 'bg-green-500 text-white' :
                          aiImportStep === 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                          {aiImportStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                        </div>
                        <span className="font-medium text-foreground">Extraction du PDF</span>
                        {aiImportStep === 1 && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
                        {aiImportStep > 1 && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                      </div>
                      {aiImportStep === 1 && (
                        <div className="ml-11">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300"
                              style={{ width: `${aiImportProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 2: AI Cleaning */}
                    <div className={`p-4 rounded-2xl border transition-all ${aiImportStep >= 2 ? 'bg-muted/30 border-primary/30' : 'bg-muted/10 border-border opacity-50'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${aiImportStep > 2 ? 'bg-green-500 text-white' :
                          aiImportStep === 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                          {aiImportStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                        </div>
                        <span className="font-medium text-foreground">Nettoyage</span>
                        {aiImportStep === 2 && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
                        {aiImportStep > 2 && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                      </div>
                      {aiImportStep === 2 && (
                        <div className="ml-11 space-y-2">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000"
                              style={{ width: `${aiImportProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>L'IA restructure votre script...</span>
                            <span className="font-mono font-bold text-foreground">
                              {Math.floor(aiImportCountdown / 60)}:{(aiImportCountdown % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 3: Saving */}
                    <div className={`p-4 rounded-2xl border transition-all ${aiImportStep >= 3 ? 'bg-muted/30 border-primary/30' : 'bg-muted/10 border-border opacity-50'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${aiImportStep > 3 ? 'bg-green-500 text-white' :
                          aiImportStep === 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                          {aiImportStep > 3 ? <Check className="w-4 h-4" /> : '3'}
                        </div>
                        <span className="font-medium text-foreground">Sauvegarde</span>
                        {aiImportStep === 3 && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
                      </div>
                      {aiImportStep === 3 && (
                        <div className="ml-11">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                              style={{ width: `${aiImportProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cancel Button */}
                    <div className="pt-4 border-t border-border mt-4">
                      <Button
                        variant="ghost"
                        onClick={cancelAiImport}
                        className="w-full text-muted-foreground hover:text-foreground"
                      >
                        Annuler l'import
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Ready State
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                    <span className="text-4xl">🤖</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-foreground">Import Automatique</h3>
                  <p className="text-muted-foreground mt-2">
                    Importez <strong className="text-foreground">n'importe quel PDF</strong> de pièce de théâtre.
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-foreground text-sm">Nettoyage automatique par IA</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-foreground text-sm">Détection des personnages et scènes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-foreground text-sm">Fonctionne avec tous les formats</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    className="py-7 px-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90 text-white font-bold text-lg shadow-xl shadow-green-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    asChild
                  >
                    <label className="cursor-pointer flex items-center justify-center gap-3">
                      <Upload className="w-6 h-6" />
                      Importer mon PDF
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleAiFileChange}
                      />
                    </label>
                  </Button>
                </div>

                <p className="text-center text-muted-foreground text-xs">
                  PDF uniquement • Powered by GPT-4
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {scriptToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div
            className="bg-popover border border-red-500/20 p-6 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Red Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20 mb-2">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Supprimer le script ?</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Vous êtes sur le point de supprimer <span className="text-foreground font-semibold">"{scriptToDelete.title}"</span>.
                  Cette action est irréversible.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setScriptToDelete(null)}
                  className="py-6 rounded-xl hover:bg-card text-muted-foreground font-medium"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteScript}
                  className="py-6 rounded-xl bg-red-600 hover:bg-red-700 text-foreground font-bold shadow-lg shadow-red-900/20"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
