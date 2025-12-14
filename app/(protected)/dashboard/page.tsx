"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle, Trash2, FileText, LayoutGrid, Settings, LogOut, Plus, PlayCircle } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { parsePdfAction } from "./actions";
import { ParsedScript } from "@/lib/types";
import { ScriptViewer } from "@/components/script-viewer";
import { RehearsalMode } from "@/components/rehearsal-mode";
import { useSavedScript } from "@/lib/hooks/use-saved-script";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [script, setScript] = useState<ParsedScript | null>(null);
  const [rehearsalChar, setRehearsalChar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  const { savedScript, isLoading, saveScript, clearScript } = useSavedScript();
  const router = useRouter();

  useEffect(() => {
    // Fetch user details for personal greeting
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserName(user.email.split('@')[0]); // Simple username extraction
      }
    };
    getUser();
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
        setScript(result);
        saveScript(result); // Save to localStorage
      }
    });
  };

  const handleLoadSaved = () => {
    if (savedScript) {
      setScript(savedScript);
    }
  };

  const handleClearSaved = () => {
    clearScript();
    setScript(null);
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
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center gap-6 p-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Simple Header for Script View */}
        <div className="w-full max-w-7xl flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setScript(null)}
            className="text-muted-foreground hover:text-white gap-2 pl-0"
          >
            <div className="p-1 rounded-full bg-white/10">
              <LayoutGrid className="h-4 w-4" />
            </div>
            Retour au Studio
          </Button>

          <Button
            variant="ghost"
            onClick={handleClearSaved}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer ce script
          </Button>
        </div>

        <ScriptViewer script={script} onConfirm={handleStartRehearsal} />
      </div>
    );
  }

  // --- DASHBOARD MAIN VIEW ---

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex overflow-hidden">

      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl h-screen sticky top-0">
        <div className="p-8">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <PlayCircle className="h-5 w-5 text-primary-foreground fill-current" />
            </div>
            Repeto
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start text-primary bg-primary/10 font-medium">
            <LayoutGrid className="mr-3 h-5 w-5" />
            Studio
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-white/5">
            <Settings className="mr-3 h-5 w-5" />
            Paramètres
          </Button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="mr-3 h-5 w-5" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">

        {/* Ambient Background */}
        <div className="absolute inset-0 z-0 pointer-events-none sticky top-0">
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] opacity-30" />
        </div>

        {/* Header */}
        <header className="relative z-10 p-8 md:p-12 pb-4">
          <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">Studio Personnel</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Bonjour, <span className="capitalize">{userName || "Artiste"}</span>.
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">Prêt à répéter votre prochaine scène ?</p>
        </header>

        {/* Scrollable Content */}
        <div className="relative z-10 flex-1 p-8 md:p-12 pt-4">

          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

            {/* ADD NEW CARD */}
            <div className="group relative aspect-[3/4] rounded-3xl border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {isPending ? (
                <div className="flex flex-col items-center gap-3 z-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">Analyse en cours...</span>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-white/5 rounded-full group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 z-10">
                    <Plus className="h-8 w-8" />
                  </div>
                  <span className="text-lg font-medium text-muted-foreground group-hover:text-white transition-colors z-10">Importer un Script</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    onChange={handleFileChange}
                    title="Importer un fichier PDF"
                  />
                </>
              )}
            </div>

            {/* LOADING SKELETON or SAVED SCRIPT CARD */}
            {isLoading ? (
              <div className="aspect-[3/4] rounded-3xl bg-white/5 animate-pulse" />
            ) : savedScript ? (
              <div
                onClick={handleLoadSaved}
                className="group relative aspect-[3/4] rounded-3xl bg-neutral-900 border border-white/5 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all cursor-pointer overflow-hidden"
              >
                {/* Card Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end z-20 bg-gradient-to-t from-black via-black/50 to-transparent">
                  <div className="mb-4">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary mb-2">
                      Actif
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight mb-1 line-clamp-2">
                      {savedScript.title || "Script Sans Titre"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {savedScript.characters.length} Personnages • {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <Button className="w-full gap-2 bg-white text-black hover:bg-primary hover:text-white border-0">
                    <PlayCircle className="w-4 h-4" />
                    Reprendre
                  </Button>
                </div>

                {/* Decorative Background Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-700 z-0">
                  <FileText className="w-32 h-32" />
                </div>
              </div>
            ) : null}

          </div>
        </div>
      </main>
    </div>
  );
}

