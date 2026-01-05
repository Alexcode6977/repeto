"use client";

import { useState, useEffect } from "react";
import { ParsedScript } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { ScriptViewer } from "@/components/script-viewer";
import { RehearsalMode } from "@/components/rehearsal-mode";
import { ScriptReader } from "@/components/script-reader";
import { ListenModeTroupe } from "@/components/listen-mode-troupe";
import { ScriptSetup, ScriptSettings } from "@/components/script-setup";
import { CastingManager } from "@/components/casting-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Play, BookOpen, Mic, Headphones } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { VoiceConfig } from "@/lib/actions/voice-cache";

interface PlayDashboardClientProps {
    play: any;
    troupeId: string;
    troupeMembers: any[];
    guests: any[];
    isAdmin: boolean;
    initialVoiceConfigs: VoiceConfig[] | null;
}

export function PlayDashboardClient({ play, troupeId, troupeMembers, guests, isAdmin, initialVoiceConfigs }: PlayDashboardClientProps) {
    const [viewMode, setViewMode] = useState<"dashboard" | "viewer" | "setup" | "reader" | "rehearsal" | "listen">("dashboard");
    const [rehearsalChars, setRehearsalChars] = useState<string[] | null>(null);
    const [sessionSettings, setSessionSettings] = useState<ScriptSettings>({
        visibility: "visible",
        mode: "full"
    });
    const [isMounted, setIsMounted] = useState(false);
    const [userId, setUserId] = useState<string>("");
    const [intendedMode, setIntendedMode] = useState<"reader" | "rehearsal">("reader");

    useEffect(() => {
        setIsMounted(true);
        const getUserId = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUserId();
    }, []);

    if (!isMounted) return null;

    const handleConfirmSelection = (characterNames: string[], mode: 'reader' | 'rehearsal') => {
        setRehearsalChars(characterNames);
        if (mode === 'rehearsal') {
            setViewMode("rehearsal");
        } else {
            setViewMode("setup");
        }
    };

    const handleStartSession = (settings: ScriptSettings) => {
        setSessionSettings(settings);
        setViewMode("reader");
    };

    const handleExitView = () => {
        setRehearsalChars(null);
        setViewMode("dashboard");
    };

    if (rehearsalChars && viewMode === "listen") {
        return (
            <ListenModeTroupe
                script={play.script_content as ParsedScript}
                userCharacters={rehearsalChars}
                onExit={handleExitView}
                playId={play.id}
                troupeId={troupeId}
            />
        );
    }

    if (rehearsalChars && viewMode === "rehearsal") {
        return (
            <RehearsalMode
                script={play.script_content as ParsedScript}
                userCharacters={rehearsalChars}
                onExit={handleExitView}
                initialSettings={sessionSettings}
                playId={play.id}
                troupeId={troupeId}
            />
        );
    }

    if (rehearsalChars && viewMode === "reader") {
        return (
            <ScriptReader
                script={play.script_content as ParsedScript}
                userCharacters={rehearsalChars}
                onExit={handleExitView}
                settings={sessionSettings}
                playId={play.id}
                userId={userId}
            />
        );
    }

    if (rehearsalChars && viewMode === "setup") {
        return (
            <ScriptSetup
                script={play.script_content as ParsedScript}
                character={rehearsalChars[0]} // Still use the first one for setup title if needed, or update ScriptSetup later
                onStart={handleStartSession}
                onBack={() => setViewMode("viewer")}
            />
        );
    }

    if (viewMode === "viewer") {
        return (
            <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex gap-4 self-start">
                    <Button
                        variant="ghost"
                        onClick={() => setViewMode("dashboard")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        ← Retour au tableau de bord
                    </Button>
                </div>
                <ScriptViewer
                    script={play.script_content as ParsedScript}
                    onConfirm={handleConfirmSelection}
                    forcedMode={intendedMode}
                />
            </div>
        );
    }

    // Calculate stats
    const script = play.script_content as ParsedScript;
    const characterCount = play.play_characters?.length || 0;
    const sceneCount = play.play_scenes?.length || 0;
    const lineCount = script?.lines?.filter((l: any) => l.type === 'dialogue').length || 0;
    const estimatedDuration = Math.round(lineCount * 0.5); // ~30 sec per line = 0.5 min

    const hasUserRole = play.play_characters?.some((c: any) => c.actor_id === userId);

    return (
        <div className="space-y-10 pb-32">
            {/* Header Section with Shared Element Transition */}
            <motion.div
                layoutId={`play-card-${play.id}`}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10"
            >
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <Link href={`/troupes/${troupeId}/plays`} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center gap-1 group">
                            <span className="group-hover:-translate-x-1 transition-transform">←</span> Retour aux pièces
                        </Link>
                    </div>
                    <motion.h1
                        layoutId={`play-title-${play.id}`}
                        className="text-5xl font-extrabold tracking-tighter text-foreground mb-2 leading-none"
                    >
                        {play.title}
                    </motion.h1>
                    <div className="flex items-center gap-4 text-muted-foreground font-medium">
                        <p className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4" />
                            Importé le {isMounted ? new Date(play.created_at).toLocaleDateString() : ""}
                        </p>
                        {play.pdf_url && (
                            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] tracking-widest font-black px-2 py-0.5 rounded-full">
                                PDF Synchronisé
                            </Badge>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

                {/* Left Column - Stats & Distribution */}
                <div className="flex flex-col gap-6 h-full">
                    {/* Stats Card */}
                    <Card className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden">
                        <CardHeader className="p-6 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold text-foreground">Statistiques</CardTitle>
                                    <CardDescription className="text-muted-foreground">Aperçu de la pièce</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Personnages</p>
                                    <p className="text-2xl font-bold text-foreground">{characterCount}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Scènes</p>
                                    <p className="text-2xl font-bold text-foreground">{sceneCount}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Répliques</p>
                                    <p className="text-2xl font-bold text-foreground">{lineCount}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Durée estimée</p>
                                    <p className="text-2xl font-bold text-foreground">~{estimatedDuration}m</p>
                                </div>
                            </div>
                            {play.summary && (
                                <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Résumé</p>
                                    <p className="text-sm text-foreground/80">{play.summary}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Distribution Card - Allow expansion if needed */}
                    <Card className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden flex-1">
                        <CardHeader className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-foreground">Distribution</CardTitle>
                                    <CardDescription className="text-muted-foreground text-xs">Gérer les rôles</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 max-h-[400px] overflow-y-auto">
                            <CastingManager
                                playId={play.id}
                                troupeId={troupeId}
                                characters={play.play_characters}
                                troupeMembers={troupeMembers}
                                guests={guests}
                                isAdmin={isAdmin}
                                initialVoiceConfigs={initialVoiceConfigs}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Actions */}
                <div className="flex flex-col gap-6 h-full">
                    {/* Jouer Card */}
                    <Card
                        className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden cursor-pointer hover:border-green-500/30 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all group flex-1 flex flex-col justify-center relative"
                        onClick={() => {
                            setIntendedMode("reader");
                            setViewMode("viewer");
                        }}
                    >
                        <CardHeader className="p-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-3xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <BookOpen className="w-8 h-8 text-green-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-foreground group-hover:text-green-500 transition-colors mb-1">Lire</CardTitle>
                                        <CardDescription className="text-muted-foreground text-base">Mode lecture du script</CardDescription>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500 transition-all">
                                    <span className="text-green-500 group-hover:text-primary-foreground transition-colors text-xl">→</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Répéter Card */}
                    <Card
                        className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] transition-all group flex-1 flex flex-col justify-center relative"
                        onClick={() => {
                            setIntendedMode("rehearsal");
                            setViewMode("viewer");
                        }}
                    >
                        <CardHeader className="p-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play className="w-8 h-8 text-primary fill-current" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-1">Répéter</CardTitle>
                                        <CardDescription className="text-muted-foreground text-base">Mode répétition interactive</CardDescription>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all">
                                    <span className="text-primary group-hover:text-primary-foreground transition-colors text-xl">→</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Écouter Card */}
                    <Card
                        className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden cursor-pointer hover:border-teal-500/30 hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] transition-all group flex-1 flex flex-col justify-center relative"
                        onClick={() => {
                            // Get user's assigned characters
                            const userChars = play.play_characters
                                ?.filter((c: any) => c.actor_id === userId)
                                ?.map((c: any) => c.character_name) || [];
                            if (userChars.length > 0) {
                                setRehearsalChars(userChars);
                                setViewMode("listen");
                            }
                        }}
                    >
                        <CardHeader className="p-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-3xl bg-teal-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Headphones className="w-8 h-8 text-teal-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-foreground group-hover:text-teal-500 transition-colors mb-1">Écouter</CardTitle>
                                        <CardDescription className="text-muted-foreground text-base">Mode livre audio</CardDescription>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500 transition-all">
                                    <span className="text-teal-500 group-hover:text-primary-foreground transition-colors text-xl">→</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Enregistrer Voix Card - Link-based */}
                    {hasUserRole ? (
                        <Link
                            href={`/troupes/${troupeId}/plays/${play.id}/record`}
                            className="bg-card border border-border backdrop-blur-md rounded-3xl overflow-hidden cursor-pointer hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.1)] transition-all group flex-1 flex flex-col justify-center relative no-underline hover:scale-[1.01]"
                        >
                            <CardHeader className="p-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Mic className="w-8 h-8 text-red-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-bold text-foreground group-hover:text-red-500 transition-colors mb-1">Enregistrer</CardTitle>
                                            <CardDescription className="text-muted-foreground text-base">Enregistrez vos répliques</CardDescription>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 transition-all">
                                        <span className="text-red-500 group-hover:text-primary-foreground transition-colors text-xl">→</span>
                                    </div>
                                </div>
                            </CardHeader>
                        </Link>
                    ) : (
                        <div className="flex-1 rounded-3xl border border-dashed border-white/10 flex items-center justify-center p-8 text-center text-muted-foreground bg-muted/10">
                            <p className="text-sm">Attribuez-vous un rôle pour accéder à l'enregistrement.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


