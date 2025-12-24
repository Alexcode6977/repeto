"use client";

import { useState } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { BookOpen, Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScriptSetupProps {
    script: ParsedScript;
    character: string;
    onStart: (settings: ScriptSettings) => void;
    onBack: () => void;
}

export interface ScriptSettings {
    visibility: "visible" | "hint" | "hidden";
    mode: "full" | "cue" | "check";
}

export function ScriptSetup({ script, character, onStart, onBack }: ScriptSetupProps) {
    const [settings, setSettings] = useState<ScriptSettings>({
        visibility: "visible",
        mode: "full",
    });

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header info */}
            <div className="text-center space-y-1">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-gray-500 hover:text-white h-8 px-2"
                >
                    ← Retour
                </Button>
                <h2 className="text-xl font-bold text-white tracking-tight">
                    Configuration de lecture
                </h2>
                <p className="text-[11px] text-gray-500 uppercase font-black tracking-widest">
                    Rôle : <span className="text-primary">{character}</span>
                </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

                {/* Left: Live Preview */}
                <Card className="bg-black/40 border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                    <CardHeader className="p-3 border-b border-white/5 bg-white/5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Aperçu
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 flex-1 text-[11px]">
                        {settings.mode === "full" && (
                            <div className="space-y-1 opacity-30">
                                <p className="font-black text-primary">PERSONNAGE A</p>
                                <p className="italic text-gray-400">"C'est une belle journée..."</p>
                            </div>
                        )}

                        {(settings.mode === "full" || settings.mode === "cue") && (
                            <div className="space-y-1">
                                <p className="font-black text-primary">PERSONNAGE B</p>
                                <p className="italic text-gray-300">"Prêt pour ma réplique."</p>
                            </div>
                        )}

                        <div className="space-y-1 p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="font-black text-primary">VOUS</p>
                            <p className={cn(
                                "font-bold transition-all duration-500",
                                settings.visibility === "hidden" && "blur-sm select-none opacity-20",
                                settings.visibility === "hint" && "opacity-90"
                            )}>
                                {settings.visibility === "hint"
                                    ? "D'accord, je..."
                                    : "D'accord, je commence ici !"}
                            </p>
                        </div>
                    </CardContent>
                    <div className="p-2 bg-white/5 text-center">
                        <p className="text-[8px] text-gray-400 uppercase font-black">
                            {settings.mode} • {settings.visibility}
                        </p>
                    </div>
                </Card>

                {/* Right: Settings Grid */}
                <div className="space-y-6 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col justify-center">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Visibilité</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "visible", label: "Visibles" },
                                    { id: "hint", label: "Indices" },
                                    { id: "hidden", label: "Cachées" },
                                ].map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSettings(prev => ({ ...prev, visibility: v.id as any }))}
                                        className={cn(
                                            "py-2.5 px-3 rounded-xl text-center transition-all border text-[10px] font-bold",
                                            settings.visibility === v.id
                                                ? "bg-white text-black border-white shadow-lg"
                                                : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Mode de lecture</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "full", label: "Tout" },
                                    { id: "cue", label: "Réplique" },
                                    { id: "check", label: "Filage" },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSettings(prev => ({ ...prev, mode: m.id as any }))}
                                        className={cn(
                                            "py-2.5 px-3 rounded-xl text-center transition-all border text-[10px] font-bold",
                                            settings.mode === m.id
                                                ? "bg-primary text-white border-primary shadow-lg"
                                                : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Action Centered */}
            <div className="flex justify-center pt-2">
                <Button
                    size="lg"
                    className="px-10 py-6 rounded-2xl bg-primary text-white font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all"
                    onClick={() => onStart(settings)}
                >
                    <Play className="w-5 h-5 mr-3 fill-current" />
                    Lancer la lecture
                </Button>
            </div>
        </div>
    );
}
