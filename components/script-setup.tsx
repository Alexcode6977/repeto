"use client";

import { useState } from "react";
import { ParsedScript } from "@/lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
    ArrowLeft,
    Play,
    Eye,
    EyeOff,
    ScanEye,
    Users,
    MessageSquare,
    Zap,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        <div className="w-full max-w-lg mx-auto py-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <Card className="bg-black/40 backdrop-blur-2xl border-white/10 shadow-2xl overflow-hidden relative">
                {/* Background Gradient Blobs */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="p-6 md:p-8 space-y-8 relative z-10">
                    {/* Header */}
                    <div className="space-y-6">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-wider group"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Changer de rôle
                        </button>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-violet-300 via-violet-500 to-purple-500 drop-shadow-sm">
                                Configuration
                            </h2>
                            <p className="text-muted-foreground/80 text-sm font-medium">
                                Rôle : <span className="text-violet-300 font-bold">{character}</span>
                            </p>
                        </div>
                    </div>

                    {/* Settings Sections */}
                    <div className="space-y-8">

                        {/* 1. VISIBILITY */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <ScanEye className="w-3 h-3" />
                                Visibilité
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { id: "visible", label: "Visible", sub: "Texte complet", icon: Eye },
                                    { id: "hint", label: "Partiel", sub: "Premiers mots", icon: ScanEye },
                                    { id: "hidden", label: "Caché", sub: "À l'aveugle", icon: EyeOff },
                                ].map((v) => {
                                    const isActive = settings.visibility === v.id;
                                    const Icon = v.icon;
                                    return (
                                        <button
                                            key={v.id}
                                            onClick={() => setSettings(prev => ({ ...prev, visibility: v.id as any }))}
                                            className={cn(
                                                "relative p-3 rounded-xl text-left transition-all duration-300 border flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-2",
                                                isActive
                                                    ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                                    : "bg-white/5 border-transparent hover:bg-white/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                                isActive ? "bg-violet-500 text-white" : "bg-white/10 text-muted-foreground"
                                            )}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className={cn("text-xs font-bold uppercase tracking-wide", isActive ? "text-white" : "text-muted-foreground")}>
                                                    {v.label}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground/70 leading-tight">
                                                    {v.sub}
                                                </div>
                                            </div>
                                            {isActive && <Check className="w-4 h-4 text-violet-400 absolute top-3 right-3 md:top-auto md:bottom-3 md:right-3" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. MODE */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Play className="w-3 h-3" />
                                Mode de lecture
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { id: "full", label: "Intégrale", sub: "Tout le cast", icon: Users },
                                    { id: "cue", label: "Réplique", sub: "Juste avant", icon: MessageSquare },
                                    { id: "check", label: "Solo", sub: "Mes lignes", icon: Zap },
                                ].map((m) => {
                                    const isActive = settings.mode === m.id;
                                    const Icon = m.icon;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setSettings(prev => ({ ...prev, mode: m.id as any }))}
                                            className={cn(
                                                "relative p-3 rounded-xl text-left transition-all duration-300 border flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-2",
                                                isActive
                                                    ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                                    : "bg-white/5 border-transparent hover:bg-white/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                                isActive ? "bg-violet-500 text-white" : "bg-white/10 text-muted-foreground"
                                            )}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className={cn("text-xs font-bold uppercase tracking-wide", isActive ? "text-white" : "text-muted-foreground")}>
                                                    {m.label}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground/70 leading-tight">
                                                    {m.sub}
                                                </div>
                                            </div>
                                            {isActive && <Check className="w-4 h-4 text-violet-400 absolute top-3 right-3 md:top-auto md:bottom-3 md:right-3" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                        <button
                            onClick={() => onStart(settings)}
                            className="w-full group relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl transition-all duration-300 shadow-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <span className="font-bold text-sm tracking-wider uppercase">C'est parti</span>
                            <Play className="w-5 h-5 fill-current group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
