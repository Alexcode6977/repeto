"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { parsePdfAction } from "./actions";
import { ParsedScript } from "@/lib/types";
import { ScriptViewer } from "@/components/script-viewer";
import { RehearsalMode } from "@/components/rehearsal-mode";

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [script, setScript] = useState<ParsedScript | null>(null);
  const [rehearsalChar, setRehearsalChar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      }
    });
  };

  const handleStartRehearsal = (characterName: string) => {
    setRehearsalChar(characterName);
  };

  const handleExitRehearsal = () => {
    setRehearsalChar(null);
  };

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
        <Button
          variant="ghost"
          onClick={() => setScript(null)}
          className="self-start text-gray-400 hover:text-white"
        >
          ← Retour
        </Button>
        <ScriptViewer script={script} onConfirm={handleStartRehearsal} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-4 flex flex-col items-center">
        <div className="relative w-32 h-32 mb-2">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          <img src="/repeto.png" alt="Repeto Mascot" className="relative w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Repeto
        </h1>
        <p className="text-lg text-gray-300 font-light">
          Votre nouveau partenaire de scène.
        </p>
      </div>

      <Card className="border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center">Commencer</CardTitle>
          <CardDescription className="text-center">
            Importez le script de votre pièce (PDF)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-4">
              <Button
                variant="glass"
                className="h-40 border-dashed border-2 hover:bg-white/10 hover:border-primary/50 transition-all group relative overflow-hidden"
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
                      Cliquez pour choisir un PDF
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
