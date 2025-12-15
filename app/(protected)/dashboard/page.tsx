"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle, Trash2, FileText, Plus, Play, MoreVertical, LogOut, X, Edit3 } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { parsePdfAction, saveScript, getScripts, deleteScript, getScriptById } from "./actions"; // Imported getScriptById
import { ParsedScript } from "@/lib/types";
import { ScriptViewer } from "@/components/script-viewer";
import { RehearsalMode } from "@/components/rehearsal-mode";
import { ScriptReader } from "@/components/script-reader";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Extend ParsedScript to include DB fields
// type SavedScript = ParsedScript & { id: string; created_at: string };
// NEW TYPE: Lightweight metadata for the list
type ScriptMetadata = {
  id: string;
  title: string;
  created_at: string;
  characterCount: number;
  lineCount: number;
};

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [script, setScript] = useState<ParsedScript | null>(null); // Current active script for viewer
  const [scriptsList, setScriptsList] = useState<ScriptMetadata[]>([]); // List of all scripts (metadata only)
  const [rehearsalChar, setRehearsalChar] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"viewer" | "reader" | "rehearsal">("viewer"); // NEW state
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false); // New loading state for detail fetch

  // Import / Rename State
  const [tempScript, setTempScript] = useState<ParsedScript | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");

  const router = useRouter();

  // Load User & Scripts on Mount
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserName(user.email.split('@')[0]);
        }
      } catch (e) {
        console.error("Client Init Error:", e);
        setError("Erreur de connexion. Veuillez rafraîchir.");
      }

      // Always try to fetch scripts even if auth user fetch failed (middleware should have protected us anyway)
      refreshScripts();
    };
    init();
  }, []);

  const refreshScripts = async () => {
    try {
      const fetchedScripts = await getScripts();
      setScriptsList(fetchedScripts);
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
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await parsePdfAction(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        // Intercept: Don't save yet. Open modal.
        setTempScript(result);
        setCustomTitle(result.title || "Nouveau Script");
        setImportModalOpen(true);
      }
      // Reset input value to allow re-selecting same file if needed
      e.target.value = "";
    });
  };

  const confirmSaveScript = async () => {
    if (!tempScript) return;

    const finalScript = { ...tempScript, title: customTitle };

    // Close modal immediately for UX responsiveness (optimistic UI could be better but this is fine)
    setImportModalOpen(false);

    try {
      await saveScript(finalScript);
      await refreshScripts();
      setTempScript(null);
    } catch (e) {
      setError("Erreur lors de la sauvegarde.");
    }
  };

  const handleLoadScript = async (s: ScriptMetadata) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const fullScript = await getScriptById(s.id);
      if (fullScript) {
        setScript(fullScript as unknown as ParsedScript); // Cast because we added ID/created_at
      } else {
        setError("Impossible de charger le script.");
      }
    } catch (err) {
      setError("Erreur lors du chargement du script.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDeleteScript = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Voulez-vous vraiment supprimer ce script ?")) return;

    try {
      await deleteScript(id);
      const updated = await getScripts();
      setScriptsList(updated);
      // We can't easily check 'script.id' because 'script' type is ParsedScript (no ID officially in type but it's there)
      // Let's just reset if open. crude but effective safely.
      if (script && (script as any).id === id) {
        setScript(null);
      }
    } catch (err) {
      setError("Impossible de supprimer le script.");
    }
  };

  const handleConfirmSelection = (characterName: string, mode: 'reader' | 'rehearsal') => {
    setRehearsalChar(characterName);
    setViewMode(mode);
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

  if (rehearsalChar && script && viewMode === "rehearsal") {
    return (
      <RehearsalMode
        script={script}
        userCharacter={rehearsalChar}
        onExit={handleExitView}
      />
    );
  }

  if (rehearsalChar && script && viewMode === "reader") {
    return (
      <ScriptReader
        script={script}
        userCharacter={rehearsalChar}
        onExit={handleExitView}
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
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </Button>
        </div>
        <ScriptViewer script={script} onConfirm={handleConfirmSelection} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-12 pb-20 relative">
      {/* DEBUG OVERLAY - TO BE REMOVED */}
      <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-xs font-mono z-[9999] p-1 text-center">
        DEBUG: Dashboard Mounted. Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing'}
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Bonjour, <span className="text-primary">{userName || "Artiste"}</span>.
          </h1>
          <p className="text-gray-400">Prêt à entrer en scène ?</p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400 md:hidden"
          >
            <LogOut className="w-5 h-5" />
          </Button>

          <Button
            className="rounded-full px-6 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
            asChild
            disabled={isPending}
          >
            <label className="cursor-pointer flex items-center gap-2">
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              )}
              <span className="relative z-10"><span className="md:hidden">Importer</span><span className="hidden md:inline">Importer un Script</span></span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 animate-in slide-in-from-top-2 mx-auto max-w-2xl">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {isLoading ? (
          // Skeleton Loading
          [1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/5] bg-white/5 rounded-3xl animate-pulse" />
          ))
        ) : scriptsList.length > 0 ? (
          scriptsList.map((s) => (
            <div
              key={s.id}
              onClick={() => handleLoadScript(s)}
              className="group relative aspect-[4/5] bg-white/5 border border-white/10 rounded-3xl overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
            >
              {/* Card Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />

              {/* Icon / Preview */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:scale-110 transition-transform duration-700">
                <FileText className="w-32 h-32 text-white/20" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-20 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white line-clamp-2 leading-tight mb-1">
                    {s.title || "Script Sans Titre"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {s.characterCount} rôles • {s.lineCount} répliques
                  </p>
                </div>

                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <Button className="flex-1 bg-white text-black hover:bg-primary hover:text-white border-0 font-bold rounded-xl" size="sm">
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Répéter
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white rounded-xl"
                    onClick={(e) => handleDeleteScript(e, s.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* Empty State */
          <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
            {/* Mascot in Empty State */}
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <img src="/repeto.png" alt="Repeto Mascot" className="relative w-full h-full object-contain opacity-80" />
            </div>
            <h3 className="text-xl font-bold text-gray-300">Votre bibliothèque est vide</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Importez votre premier script PDF ci-dessus pour commencer.
            </p>
          </div>
        )}

      </div>

      {/* Rename Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 my-auto">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white/50 hover:text-white"
              onClick={() => { setImportModalOpen(false); setTempScript(null); }}
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                <Edit3 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Nommer votre script</h2>
              <p className="text-gray-400 text-sm mt-1">
                Choisissez un titre pour retrouver facilement ce script dans votre bibliothèque.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titre du script</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ex: Roméo et Juliette"
                  autoFocus
                />
              </div>

              <Button
                onClick={confirmSaveScript}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl text-lg"
              >
                Confirmer et Importer
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
