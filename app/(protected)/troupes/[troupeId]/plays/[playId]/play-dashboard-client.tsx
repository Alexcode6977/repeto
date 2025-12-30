"use client";

import { useState, useEffect } from "react";
import { ParsedScript } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { ScriptViewer } from "@/components/script-viewer";
import { RehearsalMode } from "@/components/rehearsal-mode";
import { ScriptReader } from "@/components/script-reader";
import { RecordingManager } from "@/components/recording-manager";
import { ScriptSetup, ScriptSettings } from "@/components/script-setup";
import { CastingManager } from "@/components/casting-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Play, BookOpen, Mic } from "lucide-react";
import Link from "next/link";

interface PlayDashboardClientProps {
    play: any;
    troupeId: string;
    troupeMembers: any[];
    guests: any[];
    isAdmin: boolean;
}

export function PlayDashboardClient({ play, troupeId, troupeMembers, guests, isAdmin }: PlayDashboardClientProps) {
    const [viewMode, setViewMode] = useState<"dashboard" | "viewer" | "setup" | "reader" | "rehearsal">("dashboard");
    const [rehearsalChars, setRehearsalChars] = useState<string[] | null>(null);
    const [sessionSettings, setSessionSettings] = useState<ScriptSettings>({
        visibility: "visible",
        mode: "full"
    });
    const [isMounted, setIsMounted] = useState(false);
    const [userId, setUserId] = useState<string>("");

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

    if (rehearsalChars && viewMode === "rehearsal") {
        return (
            <RehearsalMode
                script={play.script_content as ParsedScript}
                userCharacters={rehearsalChars}
                onExit={handleExitView}
                initialSettings={sessionSettings}
                playId={play.id}
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

    return (
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <Link href={`/troupes/${troupeId}/plays`} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center gap-1 group">
                            <span className="group-hover:-translate-x-1 transition-transform">←</span> Retour aux pièces
                        </Link>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tighter text-foreground mb-2 leading-none">
                        {play.title}
                    </h1>
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
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left Column - Stats & Distribution */}
                <div className="space-y-6">
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

                    {/* Distribution Card */}
                    <Card className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden">
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
                        <CardContent className="p-4 pt-0 max-h-[300px] overflow-y-auto">
                            <CastingManager
                                characters={play.play_characters}
                                troupeMembers={troupeMembers}
                                guests={guests}
                                isAdmin={isAdmin}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Actions */}
                <div className="space-y-6">
                    {/* Jouer Card */}
                    <Card
                        className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden cursor-pointer hover:border-green-500/30 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all group"
                        onClick={() => setViewMode("viewer")}
                    >
                        <CardHeader className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <BookOpen className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold text-foreground group-hover:text-green-500 transition-colors">Jouer</CardTitle>
                                        <CardDescription className="text-muted-foreground">Mode lecture du script</CardDescription>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500 transition-all">
                                    <span className="text-green-500 group-hover:text-primary-foreground transition-colors">→</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Répéter Card */}
                    <Card
                        className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] transition-all group"
                        onClick={() => setViewMode("viewer")}
                    >
                        <CardHeader className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play className="w-6 h-6 text-primary fill-current" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">Répéter</CardTitle>
                                        <CardDescription className="text-muted-foreground">Mode répétition interactive</CardDescription>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all">
                                    <span className="text-primary group-hover:text-primary-foreground transition-colors">→</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Enregistrer Voix Card - Only if user has assigned character */}
                    {play.play_characters?.some((c: any) => c.actor_id === userId) && (
                        <Card className="bg-card border-border backdrop-blur-md rounded-3xl border overflow-hidden">
                            <CardHeader className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                        <Mic className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-bold text-foreground">Enregistrer Voix</CardTitle>
                                        <CardDescription className="text-muted-foreground text-xs">Enregistrez vos répliques</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 max-h-[200px] overflow-y-auto">
                                {(() => {
                                    const userChar = play.play_characters?.find((c: any) => c.actor_id === userId);
                                    if (!userChar) return null;

                                    return (
                                        <RecordingManager
                                            script={play.script_content as ParsedScript}
                                            userCharacter={userChar.name}
                                            playId={play.id}
                                            userId={userId}
                                        />
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

