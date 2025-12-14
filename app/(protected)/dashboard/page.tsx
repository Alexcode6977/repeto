"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle, Trash2, FileText, LogOut } from "lucide-react";
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
      <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex gap-4 self-start">
          <Button
            variant="ghost"
            onClick={() => setScript(null)}
            className="text-gray-400 hover:text-white"
          >
            ← Retour
          </Button>
          <Button
            variant="ghost"
            onClick={handleClearSaved}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
        <ScriptViewer script={script} onConfirm={handleStartRehearsal} />
      </div>
    );
  }

  // --- DASHBOARD CLASSIC VIEW ---

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="absolute -top-12 right-0 text-muted-foreground hover:text-red-400 hover:bg-white/5"
        title="Déconnexion"
      >
        <LogOut className="h-5 w-5" />
      </Button>

      <div className="text-center space-y-4 flex flex-col items-center">
        {/* Robot Mascot Area */}
        <div className="relative w-32 h-32 mb-2">
          {/* Using a glowing div behind the image as before */}
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          {/* Note: User image provided shows a robot. Assuming /repeto.png or checking if I need to use the image provided in Step 2098 */}
          <img src="/repeto.png" alt="Repeto Mascot" className="relative w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Repeto
        </h1>
        <p className="text-lg text-gray-300 font-light">
          Votre nouveau partenaire de scène.
        </p>
      </div>

      <Card className="glass border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center">Commencer</CardTitle>
          <CardDescription className="text-center">
            Importez le script de votre pièce (PDF)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            {/* Saved Script Button */}
            {!isLoading && savedScript && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-primary/10 border border-primary/30">
                <button
                  onClick={handleLoadSaved}
                  className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
                >
                  <div className="p-3 bg-primary/20 rounded-full">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{savedScript.title || "Script sauvegardé"}</p>
                    <p className="text-xs text-gray-400">{savedScript.characters.length} personnages • {savedScript.lines.length} répliques</p>
                  </div>
                  <span className="text-xs text-primary uppercase tracking-widest font-bold">Reprendre</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleClearSaved(); }}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="flex flex-col space-y-4">
              <Button
                variant="ghost" // Using ghost but styled manually to match the glass effect
                className="h-40 border-dashed border-2 border-white/20 hover:bg-white/10 hover:border-primary/50 transition-all group relative overflow-hidden w-full"
                disabled={isPending}
                asChild={!isPending}
              >
                {isPending ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-gray-400">Analyse du script...</span>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-3 z-10 w-full h-full">
                    <div className="p-3 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-300">
                      <Upload className="h-8 w-8 text-white/70 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm text-gray-300 font-medium">
                      {savedScript ? "Importer un nouveau PDF" : "Cliquez pour choisir un PDF"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-md animate-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center flex-wrap gap-3 text-[10px] text-gray-500 uppercase tracking-widest">
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">100% Gratuit</span>
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">Local</span>
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">Hors ligne</span>
      </div>
    </div>
  );
}
