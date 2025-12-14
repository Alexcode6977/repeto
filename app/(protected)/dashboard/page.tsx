"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle, Trash2, FileText, Plus, Play, MoreVertical, LogOut } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { parsePdfAction, saveScript, getScripts, deleteScript } from "./actions"; // Imported new actions
import { ParsedScript } from "@/lib/types";
import { ScriptViewer } from "@/components/script-viewer";
import { RehearsalMode } from "@/components/rehearsal-mode";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Extend ParsedScript to include DB fields
type SavedScript = ParsedScript & { id: string; created_at: string };

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [script, setScript] = useState<ParsedScript | null>(null); // Current active script for viewer
  const [scriptsList, setScriptsList] = useState<SavedScript[]>([]); // List of all scripts
  const [rehearsalChar, setRehearsalChar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  // Load User & Scripts on Mount
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserName(user.email.split('@')[0]);
      }

      // Fetch scripts
      try {
        const fetchedScripts = await getScripts();
        // We need to cast here because the server action returns a mapped object
        setScriptsList(fetchedScripts as unknown as SavedScript[]);
      } catch (err) {
        console.error("Failed to fetch scripts", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);


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
        // 1. Save to DB
        try {
          await saveScript(result);
          // 2. Refresh List
          const updated = await getScripts();
          setScriptsList(updated as unknown as SavedScript[]);
          // 3. Open Viewer immediately
          // setScript(result); // Optional: Auto-open? Maybe user prefers to see it in list first.
          // Let's NOT auto-open for now, just show it added.
        } catch (err) {
          setError("Erreur lors de la sauvegarde du script.");
        }
      }
    });
  };

  const handleLoadScript = (s: SavedScript) => {
    setScript(s);
  };

  const handleDeleteScript = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Voulez-vous vraiment supprimer ce script ?")) return;

    try {
      await deleteScript(id);
      // Refresh List
      const updated = await getScripts();
      setScriptsList(updated as unknown as SavedScript[]);
      if (script && (script as any).id === id) { // If deleting currently open script
        setScript(null);
      }
    } catch (err) {
      setError("Impossible de supprimer le script.");
    }
  };

  const handleStartRehearsal = (characterName: string) => {
    setRehearsalChar(characterName);
  };

  const handleExitRehearsal = () => {
    setRehearsalChar(null);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // --- VIEWS ---

  if (rehearsalChar && script) {
    return (
      <RehearsalMode
        script={script}
        userCharacter={rehearsalChar}
        onExit={handleExitRehearsal}
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
        <ScriptViewer script={script} onConfirm={handleStartRehearsal} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-12 animate-in fade-in zoom-in duration-500 pb-20">

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
              <span className="relative z-10">{isPending ? "Analyse..." : "Importer un Script"}</span>
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
              <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/80 z-10" />

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
                    {s.characters.length} rôles • {s.lines.length} répliques
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
    </div>
  );
}

