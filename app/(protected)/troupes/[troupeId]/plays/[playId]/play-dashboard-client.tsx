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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, BookOpen, Calendar, ChevronRight, Mic2, Play, Settings, Users, Video, Wand2, Headphones, NotebookPen, Info, PenTool } from 'lucide-react';
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/lib/hooks/use-haptic";

import { VoiceConfig } from "@/lib/actions/voice-cache";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { DownloadButton } from "@/components/offline/download-button";
import { useRouter, useSearchParams } from "next/navigation";

interface PlayDashboardProps {
    play: any;
    troupeId: string;
    troupeMembers: any[];
    guests: any[];
    isAdmin: boolean;
    isDirector: boolean;
    isMember?: boolean;
    initialVoiceConfigs: VoiceConfig[] | null;
    privateNotes: any[];
}

export function PlayDashboardClient({
    play,
    troupeId,
    troupeMembers,
    guests,
    isAdmin,
    isDirector,
    isMember = false,
    initialVoiceConfigs,
    privateNotes
}: PlayDashboardProps) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<"dashboard" | "viewer" | "rehearsal" | "listen" | "setup" | "reader">("dashboard");
    const [myCharacters, setMyCharacters] = useState<string[]>([]);
    const [rehearsalChars, setRehearsalChars] = useState<string[] | null>([]);
    const [sessionSettings, setSessionSettings] = useState<ScriptSettings>({
        visibility: "visible",
        mode: "full"
    });
    const [ignoredChars, setIgnoredChars] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [userId, setUserId] = useState<string>("");
    const [intendedMode, setIntendedMode] = useState<"reader" | "rehearsal" | "listen">("reader");

    // Video State
    const [videoEnabled, setVideoEnabled] = useState(false);
    const [videoToken, setVideoToken] = useState<string | null>(null);
    const [videoRoom, setVideoRoom] = useState<string>(`troupe_${troupeId}_play_${play.id}`);
    const [isDraggable, setIsDraggable] = useState(true);

    // Custom hooks must be called unconditionally
    const { trigger } = useHaptic();

    // Effects
    useEffect(() => {
        setIsMounted(true);
        const getUserId = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUserId();
    }, []);

    // Early return AFTER all hooks
    if (!isMounted) return null;

    // Filter characters - moved after early return since it's computed data
    const technicalKeywords = ["didascalie", "narrateur", "régie", "note", "décor", "voix off", "poursuite", "lumière", "son", "indication"];
    const isTechnical = (name: string) => name && technicalKeywords.some(k => name.toLowerCase().includes(k));

    // Get list of all technical role names to pass to sub-components
    const technicalRoleNames = play.play_characters
        ?.filter((c: any) => isTechnical(c.character_name) || isTechnical(c.name))
        .map((c: any) => c.character_name || c.name)
        .filter(Boolean) || [];

    // Video Controls
    const startVideo = async () => {
        if (!userId) return;
        try {
            // Use user name for identity
            const name = troupeMembers.find(m => m.user_id === userId)?.profiles?.first_name || "Utilisateur"; // Fallback

            const resp = await fetch(
                `/api/livekit/token?room=${videoRoom}&username=${encodeURIComponent(name)}`
            );
            const data = await resp.json();
            if (data.token) {
                setVideoToken(data.token);
                setVideoEnabled(true);
            }
        } catch (e) {
            console.error("Failed to start video", e);
            alert("Erreur lors de l'initialisation de la vidéo");
        }
    };

    // Sanitize script content to handle legacy or imported scripts missing arrays
    const rawScript = (play?.script_content || {}) as Partial<ParsedScript>;
    const safeScript: ParsedScript = {
        title: rawScript.title || play?.title,
        characters: rawScript.characters || [],
        scenes: rawScript.scenes || [],
        lines: rawScript.lines || [],
        mappings: rawScript.mappings || { canonical_characters: [], aliases: {}, collectives: { global: [], by_scene: [] } },
        original_script_id: rawScript.original_script_id
    };

    // View Switching Logic
    if (rehearsalChars && viewMode === "listen") {
        return (
            <ListenModeTroupe
                script={safeScript}
                userCharacters={rehearsalChars}
                onExit={() => setViewMode("dashboard")}
                playId={play.id}
                troupeId={troupeId}
                skipCharacters={ignoredChars.length > 0 ? ignoredChars : technicalRoleNames}
                privateNotes={privateNotes}
            />
        );
    }

    if (rehearsalChars && viewMode === "rehearsal") {
        // Compute partner characters: all assigned non-technical characters except user's
        const partnerChars = play.play_characters
            ?.filter((c: any) =>
                c.actor_id && // Assigned to someone
                !isTechnical(c.character_name) && // Not technical
                !rehearsalChars.includes(c.character_name) // Not the user's character
            )
            .map((c: any) => c.character_name) || [];

        return (
            <RehearsalMode
                script={safeScript}
                userCharacters={rehearsalChars}
                onExit={() => setViewMode("dashboard")}
                initialSettings={sessionSettings}
                playId={play.id}
                troupeId={troupeId}
                initialIgnoredCharacters={ignoredChars.length > 0 ? ignoredChars : technicalRoleNames}
                partnerCharacters={partnerChars}
                privateNotes={privateNotes}
            />
        );
    }

    if (rehearsalChars && viewMode === "reader") {
        return (
            <ScriptReader
                script={safeScript}
                userCharacters={rehearsalChars}
                onExit={() => setViewMode("dashboard")}
                settings={sessionSettings}
                playId={play.id}
                userId={userId}
                skipCharacters={ignoredChars.length > 0 ? ignoredChars : technicalRoleNames}
                privateNotes={privateNotes}
            />
        );
    }

    if (rehearsalChars && viewMode === "setup") {
        return (
            <ScriptSetup
                script={safeScript}
                character={rehearsalChars[0]}
                onStart={(settings) => {
                    setSessionSettings(settings); // Settings are now correct
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
                    script={safeScript}
                    onConfirm={(chars, mode, ignored) => {
                        setRehearsalChars(chars);
                        if (ignored) setIgnoredChars(ignored);
                        if (mode === 'rehearsal') {
                            setViewMode("rehearsal");
                        } else if (mode === 'listen') {
                            setViewMode("listen");
                        } else {
                            setViewMode("setup");
                        }
                    }}
                    forcedMode={intendedMode}
                    privateNotes={privateNotes}
                />
            </div>
        );
    }

    // --- DASHBOARD DATA ---
    const script = safeScript;
    const characterCount = play.play_characters?.length || 0;
    const sceneCount = play.play_scenes?.length || 0;
    const lineCount = script?.lines?.filter((l: any) => l.type === 'dialogue').length || 0;
    const estimatedDuration = Math.round(lineCount * 0.5);

    // Derived lists for display
    const myCharacterObjs = play.play_characters?.filter((c: any) => c.actor_id === userId) || [];
    const myCharacterNames = myCharacterObjs.map((c: any) => c.character_name || c.name);
    // Exclude technical roles from the "Available/Other" list
    const otherCharacters = play.play_characters?.filter((c: any) => c.actor_id !== userId && !isTechnical(c.character_name)) || [];
    const allCharacters = [...myCharacterObjs, ...otherCharacters];
    const hasSelectedCharacter = Boolean(rehearsalChars && rehearsalChars.length > 0);

    // Helper to start standard modes
    const startMode = (mode: "reader" | "rehearsal" | "listen") => {
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
                    {/* Download Button */}
                    <DownloadButton scriptId={play.id} troupeId={troupeId} />

                    {/* Stats Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-secondary/20 border-0">
                                <Info className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[90%] max-w-sm rounded-3xl bg-card border-border/60 dark:border-white/10">
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

                    {/* Casting/Settings Dialog - Admin Feature */}
                    {isDirector && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-secondary/20 border-0">
                                    <Settings className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95%] max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-card dark:bg-black/95 border-border/60 dark:border-white/10">
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
                                        isAdmin={isDirector}
                                        initialVoiceConfigs={initialVoiceConfigs}
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* 2. Mon Personnage (for ANYONE with assigned character) */}
            {myCharacterNames.length > 0 && (
                <Link href={`/troupes/${troupeId}/plays/${play.id}/my-character`} className="block shrink-0">
                    <Card className="p-4 bg-primary/10 hover:bg-primary/20 border-primary/20 rounded-3xl cursor-pointer transition-all active:scale-98">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-primary/30">
                                {(myCharacterNames[0] || "").substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] text-primary/60 uppercase font-bold tracking-wider">Mon Personnage</p>
                                <h3 className="text-lg font-bold text-primary">{myCharacterNames[0]}</h3>
                                <p className="text-xs text-muted-foreground">Feedbacks, stats, enregistrement...</p>
                            </div>
                            <div className="text-primary/40">→</div>
                        </div>
                    </Card>
                </Link>
            )}

            {/* 3. Autres Personnages Carousel */}
            <div className="shrink-0 space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {isAdmin ? "Personnages" : "Autres personnages"}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                        {isAdmin ? allCharacters.length : otherCharacters.length} rôles
                    </span>
                </div>

                {/* Scrollable Container */}
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x scrollbar-hide">
                    {(isAdmin ? allCharacters : otherCharacters).map((char: any) => {
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
                                            ? "bg-foreground text-background border-foreground dark:bg-white dark:text-black dark:border-white"
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

            {/* 4. Action Buttons Grid - 2x2 Layout */}
            <div className="grid grid-cols-2 gap-3 pb-8">

                {/* LIRE - Common */}
                <Card
                    className="border-0 bg-green-500/10 hover:bg-green-500/20 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-6 text-center rounded-3xl"
                    onClick={() => {
                        startMode("reader");
                        trigger('medium');
                    }}
                >
                    <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <BookOpen className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-green-400 text-lg">Lire</h3>
                        <p className="text-[10px] text-green-400/60 uppercase font-bold tracking-wider">Le texte</p>
                    </div>
                </Card>

                {/* ÉCOUTER - Common */}
                <Card
                    className={cn(
                        "border-0 transition-all flex flex-col items-center justify-center gap-3 p-6 text-center rounded-3xl",
                        hasSelectedCharacter
                            ? "cursor-pointer active:scale-95 bg-teal-500/10 hover:bg-teal-500/20"
                            : "opacity-45 cursor-not-allowed bg-muted/40"
                    )}
                    onClick={() => {
                        if (!hasSelectedCharacter) {
                            return;
                        }
                        setViewMode("listen");
                        trigger('medium');
                    }}
                >
                    <div className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center",
                        hasSelectedCharacter ? "bg-teal-500/20 text-teal-400" : "bg-muted text-muted-foreground"
                    )}>
                        <Headphones className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className={cn("font-bold text-lg", hasSelectedCharacter ? "text-teal-400" : "text-muted-foreground")}>Écouter</h3>
                        <p className={cn("text-[10px] uppercase font-bold tracking-wider", hasSelectedCharacter ? "text-teal-400/60" : "text-muted-foreground/70")}>
                            {hasSelectedCharacter ? "Le script" : "Personnage requis"}
                        </p>
                    </div>
                </Card>

                {/* Director Tools (Annoter) */}
                {isDirector && (
                    <Card
                        className="border-0 bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-6 text-center rounded-3xl"
                        onClick={() => {
                            trigger('medium');
                            router.push(`/troupes/${troupeId}/plays/${play.id}/annotate`);
                        }}
                    >
                        <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <PenTool className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-400 text-lg">Annoter</h3>
                            <p className="text-[10px] text-purple-400/60 uppercase font-bold tracking-wider">Mise en scène</p>
                        </div>
                    </Card>
                )}

                {/* Member Tools (Répéter, Visio, Notes) */}
                {isMember && (
                    <>
                        {/* RÉPÉTER */}
                        <Card
                            className={cn(
                                "border-0 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-6 text-center rounded-3xl",
                                "bg-primary/20 hover:bg-primary/30"
                            )}
                            onClick={() => {
                                if (rehearsalChars && rehearsalChars.length > 0) {
                                    setViewMode("rehearsal");
                                } else {
                                    startMode("rehearsal");
                                }
                                trigger('medium');
                            }}
                        >
                            <div className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center",
                                "bg-primary/30 text-primary"
                            )}>
                                <Play className="w-7 h-7 fill-current" />
                            </div>
                            <div>
                                <h3 className={cn("font-bold text-lg", "text-primary")}>Répéter</h3>
                                <p className={cn("text-[10px] uppercase font-bold tracking-wider", "text-primary/60")}>Mon rôle</p>
                            </div>
                        </Card>

                        {/* À DISTANCE (VISIO) */}
                        <Card
                            className="border-0 bg-violet-500/10 hover:bg-violet-500/20 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-6 text-center rounded-3xl"
                            onClick={() => {
                                trigger('medium');
                                router.push(`/troupes/${troupeId}/plays/${play.id}/visio`);
                            }}
                        >
                            <div className="w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                                <Video className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="font-bold text-violet-400 text-lg">À distance</h3>
                                <p className="text-[10px] text-violet-400/60 uppercase font-bold tracking-wider">Visio</p>
                            </div>
                        </Card>

                        {/* MES NOTES */}
                        <Card
                            className="border-0 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 p-6 text-center rounded-3xl"
                            onClick={() => {
                                trigger('medium');
                                router.push(`/troupes/${troupeId}/plays/${play.id}/private-annotate`);
                            }}
                        >
                            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <NotebookPen className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="font-bold text-blue-400 text-lg">Mes Notes</h3>
                                <p className="text-[10px] text-blue-400/60 uppercase font-bold tracking-wider">Privé</p>
                            </div>
                        </Card>
                    </>
                )}

            </div>

            {/* VIDEO OVERLAY - PERSISTENT */}
            {
                videoEnabled && videoToken && (
                    <div className={cn(
                        "fixed z-[100] transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border-2 border-violet-500/50 bg-black",
                        // Simplified styling: Fixed bottom-right corner for now, could be draggable later
                        "bottom-4 right-4 w-[320px] h-[240px] md:w-[400px] md:h-[300px]"
                    )}>
                        <div className="absolute top-2 right-2 z-20 flex gap-2">
                            {/* Collapse/Expand could go here */}
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-6 w-6 rounded-full bg-[rgba(0,0,0,0.5)] hover:bg-[rgba(0,0,0,0.8)] text-white"
                                onClick={() => setVideoEnabled(false)}
                            >
                                <span className="sr-only">Fermer</span>
                                ×
                            </Button>
                        </div>

                        <LiveKitRoom
                            video={true}
                            audio={true}
                            token={videoToken}
                            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                            data-lk-theme="default"
                            style={{ height: '100%', width: '100%' }}
                            onDisconnected={() => setVideoEnabled(false)}
                        >
                            <VideoConference />
                            <RoomAudioRenderer />
                        </LiveKitRoom>

                        {/* Invite Link Helper */}
                        <div className="absolute bottom-2 left-2 z-20 bg-[rgba(0,0,0,0.6)] px-2 py-1 rounded-md text-[10px] text-white backdrop-blur-md flex gap-2 items-center cursor-pointer hover:bg-[rgba(0,0,0,0.8)]"
                            onClick={() => {
                                const url = `${window.location.origin}/invite/${videoRoom}`;
                                // We probably need a better invite link that redirects to this page and opens video
                                // For now, let's just copy the current URL + param
                                navigator.clipboard.writeText(window.location.href);
                                alert("Lien de la page copié ! Partagez-le à votre partenaire.");
                            }}
                        >
                            <Users className="w-3 h-3" />
                            <span>Inviter</span>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
