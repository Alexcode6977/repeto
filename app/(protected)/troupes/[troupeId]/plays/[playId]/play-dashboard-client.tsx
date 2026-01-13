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
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Calendar, Play, BookOpen, Mic, Headphones, Info, Users, Settings } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/lib/hooks/use-haptic";

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
    const { trigger } = useHaptic();

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

    // View Switching Logic
    if (rehearsalChars && viewMode === "listen") {
        return (
            <ListenModeTroupe
                script={play.script_content as ParsedScript}
                userCharacters={rehearsalChars}
                onExit={() => setViewMode("dashboard")}
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
                onExit={() => setViewMode("dashboard")}
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
                onExit={() => setViewMode("dashboard")}
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
                character={rehearsalChars[0]}
                onStart={(settings) => {
                    setSessionSettings(settings);
                    setViewMode("reader");
                }}
                onBack={() => setViewMode("viewer")}
            />
        );
    }

    if (viewMode === "viewer") {
        return (
            <div className="w-full flex flex-col items-center gap-6 animate-in fade-in h-[100dvh]">
                <div className="flex gap-4 self-start p-4">
                    <Button
                        variant="ghost"
                        onClick={() => setViewMode("dashboard")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        ← Retour
                    </Button>
                </div>
                <ScriptViewer
                    script={play.script_content as ParsedScript}
                    onConfirm={(chars, mode) => {
                        setRehearsalChars(chars);
                        if (mode === 'rehearsal') {
                            setViewMode("rehearsal");
                        } else {
                            setViewMode("setup");
                        }
                    }}
                    forcedMode={intendedMode}
                />
            </div>
        );
    }

    // --- DASHBOARD DATA ---
    const script = play.script_content as ParsedScript;
    const characterCount = play.play_characters?.length || 0;
    const sceneCount = play.play_scenes?.length || 0;
    const lineCount = script?.lines?.filter((l: any) => l.type === 'dialogue').length || 0;
    const estimatedDuration = Math.round(lineCount * 0.5);

    // Filter characters
    const myCharacters = play.play_characters?.filter((c: any) => c.actor_id === userId) || [];
    const otherCharacters = play.play_characters?.filter((c: any) => c.actor_id !== userId) || [];
    const allCharacters = [...myCharacters, ...otherCharacters];

    // Helper to start standard modes
    const startMode = (mode: "reader" | "rehearsal") => {
        setIntendedMode(mode);
        setViewMode("viewer");
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-auto gap-4 p-4 md:p-0 overflow-y-auto md:overflow-visible">

            {/* 1. Header & Stats Overlay */}
            <div className="flex items-center justify-between shrink-0 mb-2">
                <div>
                    <Link href={`/troupes/${troupeId}/plays`} className="text-xs text-muted-foreground mb-1 block">
                        ← Retour
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight leading-tight line-clamp-2">
                        {play.title}
                    </h1>
                </div>

                <div className="flex gap-2">
                    {/* Stats Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-secondary/20 border-0">
                                <Info className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[90%] max-w-sm rounded-3xl bg-card border-white/10">
                            <DialogHeader>
                                <DialogTitle>Statistiques de la pièce</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-4">
                                <div className="p-4 rounded-2xl bg-muted/50 text-center">
                                    <p className="text-3xl font-bold mb-1">{characterCount}</p>
                                    <p className="text-xs uppercase text-muted-foreground font-bold">Personnages</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/50 text-center">
                                    <p className="text-3xl font-bold mb-1">{sceneCount}</p>
                                    <p className="text-xs uppercase text-muted-foreground font-bold">Scènes</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/50 text-center">
                                    <p className="text-3xl font-bold mb-1">{lineCount}</p>
                                    <p className="text-xs uppercase text-muted-foreground font-bold">Répliques</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/50 text-center">
                                    <p className="text-3xl font-bold mb-1">{estimatedDuration}m</p>
                                    <p className="text-xs uppercase text-muted-foreground font-bold">Durée est.</p>
                                </div>
                            </div>
                            {play.summary && (
                                <p className="text-sm text-muted-foreground text-center px-2">{play.summary}</p>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Casting/Settings Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-secondary/20 border-0">
                                <Settings className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95%] max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-black/95 border-white/10">
                            <DialogHeader>
                                <DialogTitle>Distribution</DialogTitle>
                            </DialogHeader>
                            <div className="py-2">
                                <CastingManager
                                    playId={play.id}
                                    troupeId={troupeId}
                                    characters={play.play_characters}
                                    troupeMembers={troupeMembers}
                                    guests={guests}
                                    isAdmin={isAdmin}
                                    initialVoiceConfigs={initialVoiceConfigs}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* 2. Character Carousel */}
            <div className="shrink-0 space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Personnages</h3>
                    <span className="text-xs text-muted-foreground">{allCharacters.length} rôles</span>
                </div>

                {/* Scrollable Container */}
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x scrollbar-hide">
                    {allCharacters.map((char: any) => {
                        const isMe = char.actor_id === userId;
                        const assignedTo = troupeMembers.find(m => m.user_id === char.actor_id)?.profiles?.first_name
                            || guests.find(g => g.id === char.guest_id)?.name
                            || "Libre";

                        return (
                            <div
                                key={char.id}
                                className={cn(
                                    "flex flex-col items-center gap-2 min-w-[85px] snap-center group cursor-pointer",
                                    rehearsalChars?.includes(char.character_name) ? "opacity-100" : "opacity-80 hover:opacity-100"
                                )}
                                onClick={() => {
                                    // Quick select logic could go here if we wanted direct selection
                                    // For now just visual or simple toggle
                                    if (rehearsalChars?.includes(char.character_name)) {
                                        setRehearsalChars(null);
                                    } else {
                                        setRehearsalChars([char.character_name]);
                                    }
                                    trigger('selection');
                                }}
                            >
                                <div className={cn(
                                    "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-2 transition-all",
                                    isMe
                                        ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(124,58,237,0.5)] scale-105"
                                        : rehearsalChars?.includes(char.character_name)
                                            ? "bg-white text-black border-white"
                                            : "bg-muted text-muted-foreground border-transparent"
                                )}>
                                    {char.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="text-center">
                                    <p className={cn("text-xs font-bold truncate max-w-[85px]", isMe && "text-primary")}>
                                        {char.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[85px]">
                                        {isMe ? "Moi" : assignedTo}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. Action Grid (2x2) */}
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">

                {/* Lire */}
                <Card
                    className="border-0 bg-green-500/10 hover:bg-green-500/20 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-4 text-center rounded-3xl"
                    onClick={() => {
                        startMode("reader");
                        trigger('medium');
                    }}
                >
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-green-400 text-lg">Lire</h3>
                        <p className="text-[10px] text-green-400/60 uppercase font-bold tracking-wider">Script complet</p>
                    </div>
                </Card>

                {/* Répéter */}
                <Card
                    className="border-0 bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-4 text-center rounded-3xl"
                    onClick={() => {
                        startMode("rehearsal");
                        trigger('medium');
                    }}
                >
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Play className="w-6 h-6 ml-1 fill-current" />
                    </div>
                    <div>
                        <h3 className="font-bold text-primary text-lg">Répéter</h3>
                        <p className="text-[10px] text-primary/60 uppercase font-bold tracking-wider">Mode Interactif</p>
                    </div>
                </Card>

                {/* Écouter */}
                <Card
                    className="border-0 bg-teal-500/10 hover:bg-teal-500/20 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-4 text-center rounded-3xl"
                    onClick={() => {
                        const userChars = myCharacters.map((c: any) => c.character_name);
                        if (userChars.length > 0) {
                            setRehearsalChars(userChars);
                            setViewMode("listen");
                            trigger('medium');
                        } else {
                            // Fallback if no char assigned: just listen as first char or none
                            // Or show alert
                            alert("Choisissez un personnage pour écouter.");
                        }
                    }}
                >
                    <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">
                        <Headphones className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-teal-400 text-lg">Écouter</h3>
                        <p className="text-[10px] text-teal-400/60 uppercase font-bold tracking-wider">Audio seul</p>
                    </div>
                </Card>

                {/* Enregistrer */}
                {myCharacters.length > 0 ? (
                    <Link href={`/troupes/${troupeId}/plays/${play.id}/record`} className="contents">
                        <Card
                            className="border-0 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-4 text-center rounded-3xl"
                            onClick={() => trigger('medium')}
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                <Mic className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-400 text-lg">Enregistrer</h3>
                                <p className="text-[10px] text-red-400/60 uppercase font-bold tracking-wider">Ma voix</p>
                            </div>
                        </Card>
                    </Link>
                ) : (
                    <Card className="border-0 bg-muted/5 flex flex-col items-center justify-center gap-2 p-4 text-center rounded-3xl opacity-50">
                        <Mic className="w-6 h-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Enregistrement réservé aux acteurs</p>
                    </Card>
                )}
            </div>
        </div>
    );


}
