"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle, Trash2, FileText, Plus, Play, MoreVertical, LogOut, X, Edit3 } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { parsePdfAction, saveScript, getScripts, deleteScript, getScriptById, togglePublicStatus, detectCharactersAction, finalizeParsingAction } from "./actions";
import { ParsedScript } from "@/lib/types";
import { ScriptViewer } from "@/components/script-viewer";
import { RehearsalMode } from "@/components/rehearsal-mode";
import { ScriptReader } from "@/components/script-reader";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Globe, Lock, Check, UserPlus } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<"viewer" | "reader" | "rehearsal">("viewer"); // NEW state
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>(""); // Need email for admin check
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

  const router = useRouter();

  // Load User & Scripts on Mount
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);

          // Fetch profile for first name
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .single();

          if (profile?.first_name) {
            setUserName(profile.first_name);
          } else {
            setUserName(user.email.split('@')[0]);
          }
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

  const handleLoadScript = async (s: ScriptMetadata) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const fullScript = await getScriptById(s.id);
      if (fullScript) {
        setScript(fullScript as unknown as ParsedScript);
      } else {
        setError("Impossible de charger le script.");
      }
    } catch (err) {
      setError("Erreur lors du chargement du script.");
    } finally {
      setIsLoadingDetail(false);
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

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 animate-in slide-in-from-top-2 w-full max-w-2xl">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <ScriptViewer script={script} onConfirm={handleConfirmSelection} />
      </div>
    );
  }

  return (
    <div className="w-full pb-32 animate-in fade-in zoom-in duration-500 relative min-h-screen">

      {/* Floating Action Button (Mobile) - Always Visible */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <label className="flex items-center justify-center w-16 h-16 bg-primary rounded-full shadow-[0_0_30px_rgba(124,58,237,0.5)] active:scale-95 transition-transform cursor-pointer">
          {isPending ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : (
            <Plus className="w-8 h-8 text-white" />
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
              Bonjour, <span className="text-primary">{userName || "Artiste"}</span>
            </h1>
            <p className="text-xs md:text-base text-gray-400 font-medium tracking-wide uppercase">Prêt à répéter ?</p>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400 md:hidden"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Desktop Import Button */}
        <div className="hidden md:flex items-center gap-4">
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
              <span className="relative z-10">Importer un Script</span>
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
            <div key={i} className="aspect-[4/5] bg-white/5 rounded-3xl animate-pulse" />
          ))
        ) : scriptsList.length > 0 ? (
          scriptsList.map((s, index) => (
            <div
              key={s.id}
              onClick={() => handleLoadScript(s)}
              style={{ animationDelay: `${index * 100}ms` }}
              className={`
                group relative aspect-[3/4] md:aspect-[4/5] bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden cursor-pointer 
                active:scale-[0.98] md:hover:border-primary/50 md:hover:shadow-2xl md:hover:shadow-primary/10 transition-all duration-300 animate-in-up
                ${s.is_public ? 'border-amber-500/20' : ''}
              `}
            >
              {/* Card Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-10" />

              {/* Public Badge - Floating */}
              {s.is_public && (
                <div className="absolute top-4 right-4 z-20 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg">
                  <Globe className="w-3 h-3" />
                  Shared
                </div>
              )}

              {/* Icon / Preview - Large & Centered */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700">
                <FileText className={`w-32 h-32 md:w-40 md:h-40 ${s.is_public ? 'text-amber-500' : 'text-white'}`} />
              </div>

              {/* Content - Bottom Aligned */}
              <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col justify-end h-full">
                <div className="mb-4">
                  <h3 className="text-2xl md:text-xl font-bold text-white leading-tight mb-2 drop-shadow-md">
                    {s.title || "Script Sans Titre"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-gray-400/80 uppercase tracking-wider">
                    <span>{s.characterCount} rôles</span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full" />
                    <span>{s.lineCount} répliques</span>
                  </div>
                </div>

                {/* Mobile Play Button overlay */}
                <div className="md:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-xl pointer-events-none">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>

                {/* Desktop Hover Actions */}
                <div className="hidden md:flex items-center gap-3 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <Button className="flex-1 bg-white text-black hover:bg-primary hover:text-white border-0 font-bold rounded-xl" size="sm">
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Répéter
                  </Button>

                  {(s.is_owner || userEmail === ADMIN_EMAIL) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white rounded-xl"
                      onClick={(e) => handleDeleteScript(e, s.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {userEmail === ADMIN_EMAIL && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-xl ${s.is_public ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400'}`}
                      onClick={(e) => handleTogglePublic(e, s)}
                    >
                      {s.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          /* Empty State */
          <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-white/5 rounded-[2rem] bg-white/5 mx-4 md:mx-0">
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <img src="/repeto.png" alt="Repeto Mascot" className="relative w-full h-full object-contain opacity-80" />
            </div>
            <h3 className="text-xl font-bold text-gray-300">Votre bibliothèque est vide</h3>
            <p className="text-gray-500 max-w-sm mx-auto px-4">
              Touchez le bouton + pour importer votre premier script PDF.
            </p>
          </div>
        )}

      </div>

      {/* Import / Deep Parsing Progress Modal */}
      {(isImporting || isDeepParsing) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-primary/20 p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(124,58,237,0.3)] animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>

              {/* Title */}
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {isImporting ? "Détection des rôles..." : "Analyse approfondie..."}
                </h3>
                <p className="text-gray-400 text-sm">
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
              className="absolute top-4 right-4 text-white/50 hover:text-white"
              onClick={() => setValidationModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Prêt à importer ?</h2>
              <p className="text-gray-400 text-sm mt-1">
                Vérifiez la liste des personnages détectés. Seuls les sélectionnés seront importés.
              </p>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titre du script</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ex: Roméo et Juliette"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Personnages ({selectedCharacters.length})</label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detectedCharacters.map(char => (
                    <div
                      key={char}
                      onClick={() => toggleCharacter(char)}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                        ${selectedCharacters.includes(char)
                          ? 'bg-primary/20 border-primary/50 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded flex items-center justify-center border
                        ${selectedCharacters.includes(char) ? 'bg-primary border-primary' : 'border-white/20'}
                      `}>
                        {selectedCharacters.includes(char) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-semibold truncate">{char}</span>
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
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
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

      {/* DELETE CONFIRMATION MODAL */}
      {scriptToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div
            className="bg-[#1a1a1a] border border-red-500/20 p-6 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Red Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20 mb-2">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Supprimer le script ?</h3>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Vous êtes sur le point de supprimer <span className="text-white font-semibold">"{scriptToDelete.title}"</span>.
                  Cette action est irréversible.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setScriptToDelete(null)}
                  className="py-6 rounded-xl hover:bg-white/5 text-gray-400 font-medium"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteScript}
                  className="py-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/20"
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
