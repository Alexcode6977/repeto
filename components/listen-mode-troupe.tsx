"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ParsedScript } from "@/lib/types";
import { useListen, ListenMode } from "@/lib/hooks/use-listen";
import { type TTSProvider } from "@/lib/hooks/use-ai-tts";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getUserCapabilities } from "@/app/actions/rehearsal";
import { Play, Pause, SkipForward, SkipBack, X, Sparkles, Headphones, RotateCcw, ArrowLeft, MessageSquare, Zap, Users, Check, StickyNote } from "lucide-react";
import { cn, getCollectiveMembersForLine, getSceneCharacters, getSceneStartIndexForLine, isUserLine as checkIsUserLine } from "@/lib/utils";
import { Card } from "./ui/card";
import { PRIVATE_NOTE_CHAR } from "./script-viewer";

interface PrivateNote {
    line_index: number;
    text: string;
}

interface ListenModeTroupeProps {
    script: ParsedScript;
    userCharacters: string[];
    onExit: () => void;
    playId: string;
    troupeId: string;
    skipCharacters?: string[];
    privateNotes?: PrivateNote[];
}

export function ListenModeTroupe({
    script,
    userCharacters = [],
    onExit,
    playId,
    troupeId,
    skipCharacters = [],
    privateNotes = []
}: ListenModeTroupeProps) {
    const hasUserCharacters = userCharacters.length > 0;

    // Configuration state
    const [listenMode, setListenMode] = useState<ListenMode>("full");
    const [ttsProvider, setTtsProvider] = useState<TTSProvider>("browser");
    const [announceCharacter, setAnnounceCharacter] = useState(false);
    const [startLineIndex, setStartLineIndex] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const [hasAiVoiceAccess, setHasAiVoiceAccess] = useState(false);
    const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true);

    // Premium / Feature State
    const effectiveSkippedCharacters = useMemo(
        () => [...new Set(skipCharacters)],
        [skipCharacters]
    );

    // Fetch User Capabilities
    useEffect(() => {
        const fetchCapabilities = async () => {
            try {
                const capabilities = await getUserCapabilities(troupeId);
                const canUseAiVoices = capabilities.features.aiVoices || capabilities.isPremium;
                setHasAiVoiceAccess(canUseAiVoices);
                if (canUseAiVoices) {
                    setTtsProvider("google");
                } else {
                    setTtsProvider("browser");
                }
            } catch (error) {
                console.error("Failed to fetch user capabilities", error);
                setHasAiVoiceAccess(false);
                setTtsProvider("browser");
            } finally {
                setIsLoadingCapabilities(false);
            }
        };
        fetchCapabilities();
    }, [troupeId]);

    const {
        currentLineIndex,
        status,
        progress,
        totalRelevantLines,
        currentRelevantIndex,
        start,
        pause,
        resume,
        stop,
        next,
        previous,
        replay,
        isLoadingAudio
    } = useListen({
        script,
        userCharacters,
        mode: listenMode,
        ttsProvider,
        announceCharacter,
        initialLineIndex: startLineIndex,
        skipCharacters: effectiveSkippedCharacters,
        playId,
        troupeId
    });

    const { requestWakeLock, releaseWakeLock } = useWakeLock();

    // Refs for auto-scroll
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const isFirstScrollRef = useRef(true);
    const [hasInitialScrollCompleted, setHasInitialScrollCompleted] = useState(false);

    // Auto-scroll to active line
    useEffect(() => {
        if (hasStarted && lineRefs.current.has(currentLineIndex)) {
            const activeEl = lineRefs.current.get(currentLineIndex);
            if (activeEl) {
                if (isFirstScrollRef.current) {
                    requestAnimationFrame(() => {
                        activeEl.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
                        setHasInitialScrollCompleted(true);
                    });
                    isFirstScrollRef.current = false;
                } else {
                    activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    setHasInitialScrollCompleted(true);
                }
            }
        }
    }, [currentLineIndex, hasStarted]);

    // Handle exit when finished
    useEffect(() => {
        if (status === "finished" && hasStarted) {
            releaseWakeLock();
            onExit();
        }
    }, [status, hasStarted, onExit, releaseWakeLock]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!hasStarted) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "")) return;

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    if (status === "paused") {
                        resume();
                    } else {
                        pause();
                    }
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    next();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    previous();
                    break;
                case "KeyR":
                    e.preventDefault();
                    replay();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [hasStarted, status, pause, resume, next, previous, replay]);

    const handleStart = async () => {
        if (isLoadingCapabilities) return;
        // No mic needed for listen mode - just start playback
        setHasStarted(true);
        requestWakeLock();
        start();
    };

    const handleExit = () => {
        stop();
        releaseWakeLock();
        onExit();
    };

    // Quick Start Logic - MOVED BEFORE CONDITIONAL RENDER TO AVOID HOOKS VIOLATION
    const quickStartSettings = useMemo(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`souffleur_listen_settings_${playId}`);
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    }, [playId]);
    const sceneCharactersMap = useMemo(() => getSceneCharacters(script), [script]);

    // Current scene detection
    const currentScene = script.scenes?.find((scene, idx) => {
        const nextScene = script.scenes?.[idx + 1];
        return currentLineIndex >= scene.index && (!nextScene || currentLineIndex < nextScene.index);
    });

    // Helper to check if line is user's
    const isUserLine = (lineChar: string, lineIndex: number) => {
        const sceneStartIdx = getSceneStartIndexForLine(script, lineIndex);
        const activeChars = sceneCharactersMap.get(sceneStartIdx);
        const collectiveMembers = getCollectiveMembersForLine(script, lineIndex);
        return checkIsUserLine(script, lineChar, userCharacters, activeChars, collectiveMembers);
    };

    const startQuick = () => {
        if (quickStartSettings) {
            const enforcedProvider: TTSProvider = hasAiVoiceAccess ? "google" : "browser";
            setListenMode(quickStartSettings.listenMode);
            setTtsProvider(enforcedProvider);
            setAnnounceCharacter(quickStartSettings.announceCharacter);
            setStartLineIndex(quickStartSettings.startLineIndex || 0);
            handleStart();
        }
    };

    const handleStartWithSave = () => {
        const enforcedProvider: TTSProvider = hasAiVoiceAccess ? "google" : "browser";
        if (typeof window !== 'undefined') {
            localStorage.setItem(`souffleur_listen_settings_${playId}`, JSON.stringify({
                listenMode,
                ttsProvider: enforcedProvider,
                announceCharacter,
                startLineIndex,
                timestamp: Date.now()
            }));
        }
        setTtsProvider(enforcedProvider);
        handleStart();
    };

    // === SETUP SCREEN ===
    if (!hasStarted) {

        return (
            <div className="w-full max-w-lg mx-auto py-8 animate-in fade-in slide-in-from-bottom-6 duration-700 min-h-[100dvh] flex items-center justify-center">
                <Card className="bg-card/90 dark:bg-black/40 backdrop-blur-2xl border-border/60 dark:border-white/10 shadow-2xl overflow-hidden relative w-full">
                    {/* Background Gradient Blobs (Teal/Cyan) */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="p-6 md:p-8 space-y-8 relative z-10">
                        {/* Header */}
                        <div className="space-y-6">
                            <button
                                onClick={onExit}
                                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors uppercase tracking-wider group"
                            >
                                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                Retour
                            </button>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-teal-300 via-teal-500 to-cyan-500 drop-shadow-sm flex items-center gap-3">
                                    <Headphones className="w-8 h-8 md:w-10 md:h-10 text-teal-500" />
                                    Mode Écoute
                                </h2>
                                {/* Quick Start Button */}
                                {quickStartSettings && (
                                    <button
                                        onClick={startQuick}
                                        disabled={isLoadingCapabilities}
                                        className={cn(
                                            "mt-2 py-2 px-3 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all w-fit",
                                            isLoadingCapabilities
                                                ? "bg-teal-500/5 border-teal-500/10 text-teal-500/50 cursor-not-allowed"
                                                : "bg-teal-500/10 border-teal-500/20 text-teal-400 hover:bg-teal-500/20"
                                        )}
                                    >
                                        <span>⚡</span> Reprendre (derniers réglages)
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Settings Sections */}
                        <div className="space-y-8">

                            {/* 0. DEPART */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Play className="w-3 h-3" />
                                    Départ
                                </label>
                                <select
                                    value={startLineIndex}
                                    onChange={(e) => setStartLineIndex(Number(e.target.value))}
                                    className="w-full bg-muted/60 dark:bg-white/5 border border-border/70 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-foreground dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50 appearance-none cursor-pointer hover:bg-muted/80 dark:hover:bg-white/10 transition-colors"
                                >
                                    <option value={0} className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">Début du script</option>
                                    {script.scenes?.map((scene) => (
                                        <option key={scene.index} value={scene.index} className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
                                            {scene.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 1. CONFIGURATION (MODE) */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Headphones className="w-3 h-3" />
                                    Configuration
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { id: "full", label: "Intégral", sub: "Tout le texte", icon: Users },
                                        { id: "cue", label: "Réplique", sub: "Juste les cues", icon: MessageSquare },
                                        { id: "check", label: "Solo", sub: "Mes lignes", icon: Zap },
                                    ].map((m) => {
                                        const isActive = listenMode === m.id;
                                        const Icon = m.icon;
                                        const isDisabled = !hasUserCharacters && m.id !== "full";
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => !isDisabled && setListenMode(m.id as ListenMode)}
                                                disabled={isDisabled}
                                                className={cn(
                                                    "relative p-3 rounded-xl text-left transition-all duration-300 border flex flex-col items-start gap-2",
                                                    isDisabled
                                                        ? "bg-muted/40 dark:bg-white/5 border-transparent opacity-40 cursor-not-allowed"
                                                        : isActive
                                                            ? "bg-teal-500/10 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
                                                            : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors mb-1",
                                                    isActive ? "bg-teal-500 text-white" : "bg-muted dark:bg-white/10 text-muted-foreground"
                                                )}>
                                                    <Icon className="w-3 h-3" />
                                                </div>
                                                <div>
                                                    <div className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-teal-700 dark:text-white" : "text-muted-foreground")}>
                                                        {m.label}
                                                    </div>
                                                </div>
                                                {isActive && <Check className="w-3 h-3 text-teal-400 absolute top-3 right-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                {!hasUserCharacters && (
                                    <p className="text-[10px] text-muted-foreground">
                                        Les modes Réplique et Solo nécessitent un personnage sélectionné.
                                    </p>
                                )}
                            </div>

                            {/* 2. OPTIONS (VOIX & NOMS) */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" />
                                    Options
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Voice Status (provider policy enforced by subscription) */}
                                    <div
                                        className={cn(
                                            "relative p-3 rounded-xl text-left border flex items-center gap-3",
                                            ttsProvider === "google"
                                                ? "bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                                : "bg-muted/40 dark:bg-white/5 border-border/60 dark:border-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                            ttsProvider === "google" ? "bg-emerald-500 text-white" : "bg-muted dark:bg-white/10 text-muted-foreground"
                                        )}>
                                            {ttsProvider === "google" ? <Sparkles className="w-3 h-3" /> : <Headphones className="w-3 h-3" />}
                                        </div>
                                        <div>
                                            <div className={cn("text-xs font-bold uppercase tracking-wide", ttsProvider === "google" ? "text-emerald-400" : "text-muted-foreground")}>
                                                {ttsProvider === "google" ? "Google Premium" : "Navigateur"}
                                            </div>
                                            <div className="text-[9px] text-muted-foreground mt-0.5">
                                                {ttsProvider === "google" ? "Voix premium actives" : "Voix système actives"}
                                            </div>
                                        </div>
                                        {ttsProvider === "google" && <Check className="w-4 h-4 text-emerald-400 absolute top-3 right-3" />}
                                    </div>
                                </div>
                            </div>

                            {/* Announce Names Toggle */}
                            <button
                                onClick={() => setAnnounceCharacter(!announceCharacter)}
                                className={cn(
                                    "relative p-3 rounded-xl text-left transition-all duration-300 border flex items-center gap-3",
                                    announceCharacter
                                        ? "bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                                        : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                    announceCharacter ? "bg-indigo-500 text-white" : "bg-muted dark:bg-white/10 text-muted-foreground"
                                )}>
                                    <span className="text-xs">📢</span>
                                </div>
                                <div>
                                    <div className={cn("text-xs font-bold uppercase tracking-wide", announceCharacter ? "text-indigo-400" : "text-muted-foreground")}>
                                        Noms
                                    </div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">
                                        {announceCharacter ? "Annoncés" : "Masqués"}
                                    </div>
                                </div>
                                {announceCharacter && <Check className="w-4 h-4 text-indigo-400 absolute top-3 right-3" />}
                            </button>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                        <button
                            onClick={handleStartWithSave}
                            disabled={isLoadingCapabilities}
                            className={cn(
                                "w-full group relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl transition-all duration-300 shadow-lg",
                                isLoadingCapabilities
                                    ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
                            )}
                        >
                            <span className="font-bold text-sm tracking-wider uppercase">Lancer l&apos;écoute</span>
                            <Headphones className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    // === PLAYBACK SCREEN ===
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/98">
            <div className="absolute inset-0 bg-gradient-radial from-teal-500/5 via-transparent to-transparent opacity-50 pointer-events-none" />

            <div className="w-full h-[100dvh] md:h-[85vh] md:max-w-3xl md:rounded-3xl md:border md:border-border md:shadow-2xl md:bg-background/40 md:backdrop-blur-sm flex flex-col overflow-hidden bg-transparent text-foreground relative">

                {/* Header */}
                <div className="flex-none flex justify-between items-center p-4 md:p-6 z-10">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-teal-500/10 text-teal-400 border-teal-500/30 flex items-center gap-2">
                            <Headphones className="w-3 h-3" />
                            <span className="tabular-nums">{currentRelevantIndex}/{totalRelevantLines}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{progress}%</span>
                        </div>

                        {currentScene && (
                            <div className="hidden md:block text-[10px] text-muted-foreground max-w-[200px] truncate">
                                {currentScene.title}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => status === "paused" ? resume() : pause()}
                            className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-card transition-colors"
                        >
                            {status === "paused"
                                ? <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                                : <Pause className="w-5 h-5 md:w-6 md:h-6" />
                            }
                        </button>
                        <button onClick={handleExit} className="text-muted-foreground hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-colors">
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                {/* Script View */}
                <div
                    ref={containerRef}
                    className={cn(
                        "flex-1 overflow-y-auto px-4 py-8 space-y-6 scroll-smooth no-scrollbar md:scrollbar-thin transition-opacity duration-300",
                        hasInitialScrollCompleted ? "opacity-100" : "opacity-0"
                    )}
                >
                    {script.lines.map((line, index) => {
                        const isActive = index === currentLineIndex;
                        const isUser = isUserLine(line.character, index);

                        return (
                            <div
                                key={line.id}
                                ref={(el) => {
                                    if (el) lineRefs.current.set(index, el);
                                }}
                                className={cn(
                                    "transition-all duration-500 max-w-2xl mx-auto rounded-2xl p-4 md:p-6",
                                    isActive
                                        ? "bg-muted/30 dark:bg-white/10 scale-100 md:scale-105 shadow-2xl border border-border opacity-100"
                                        : index === currentLineIndex + 1
                                            ? "opacity-70 scale-100 blur-none border border-transparent bg-muted/5" // Preview next line
                                            : "opacity-40 scale-95 blur-[0.5px]"
                                )}
                            >
                                {/* Private Note Display */}
                                {userCharacters.includes(PRIVATE_NOTE_CHAR) && (() => {
                                    const note = privateNotes?.find(n => n.line_index === index);
                                    if (!note) return null;
                                    return (
                                        <div className={cn(
                                            "mb-4 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs flex gap-2 items-start animate-in slide-in-from-top-2",
                                            isActive ? "opacity-100" : "opacity-60"
                                        )}>
                                            <StickyNote className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                                            <div className="leading-relaxed">
                                                <span className="font-bold text-blue-400 uppercase tracking-wider block text-[10px] mb-1">Note Personnelle</span>
                                                {note.text}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <p className={cn(
                                    "text-xs font-bold uppercase tracking-widest mb-3",
                                    isActive ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {line.character}
                                </p>

                                <p className={cn(
                                    "leading-relaxed font-serif transition-all",
                                    isActive
                                        ? "text-xl md:text-3xl text-foreground"
                                        : "text-base md:text-lg text-muted-foreground grayscale",
                                    isUser && isActive ? "text-teal-600 dark:text-teal-300 drop-shadow-md" : ""
                                )}>
                                    {isActive && status === "playing" && (
                                        <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse mr-3 align-middle" />
                                    )}
                                    {line.text}
                                </p>
                            </div>
                        );
                    })}
                    <div className="h-48" />
                </div>

                {/* Controls */}
                <div className="flex-none pb-8 md:pb-12 pt-4 px-6 md:px-8 flex items-center justify-between relative z-30">
                    <button
                        onClick={previous}
                        className="p-3 md:p-4 rounded-full bg-card border border-border text-foreground hover:bg-muted active:scale-90 transition-all flex flex-col items-center gap-1 group"
                    >
                        <SkipBack className="w-5 h-5 md:w-6 md:h-6 group-active:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Retour</span>
                    </button>

                    {/* Central Orb */}
                    <div className="relative group">
                        <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] rotate-[-90deg] text-border" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
                            <circle
                                cx="50"
                                cy="50"
                                r="46"
                                fill="none"
                                stroke="#14b8a6"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${progress * 2.89} 289`}
                                className="transition-all duration-500"
                            />
                        </svg>

                        <div className={cn(
                            "absolute inset-0 blur-2xl rounded-full transition-all duration-500",
                            status === "playing"
                                ? "bg-teal-500 opacity-40 scale-150"
                                : "bg-teal-500 opacity-0 scale-100"
                        )} />

                        <button
                            onClick={replay}
                            className={cn(
                                "relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl border-4",
                                status === "playing"
                                    ? "bg-teal-500 border-teal-400 scale-110 shadow-[0_0_50px_rgba(20,184,166,0.6)]"
                                    : "bg-muted border-border text-muted-foreground"
                            )}
                        >
                            {isLoadingAudio ? (
                                <div className="w-8 h-8 md:w-10 md:h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : status === "playing" ? (
                                <div className="flex gap-1 h-6 md:h-8 items-center">
                                    <div className="w-1 md:w-1.5 h-6 md:h-8 bg-white rounded-full animate-[bounce_1s_infinite_0ms]" />
                                    <div className="w-1 md:w-1.5 h-4 md:h-6 bg-white rounded-full animate-[bounce_1s_infinite_200ms]" />
                                    <div className="w-1 md:w-1.5 h-6 md:h-8 bg-white rounded-full animate-[bounce_1s_infinite_400ms]" />
                                </div>
                            ) : status === "paused" ? (
                                <Play className="w-8 h-8 md:w-10 md:h-10 ml-1 text-foreground" />
                            ) : (
                                <RotateCcw className="w-8 h-8 md:w-10 md:h-10" />
                            )}
                        </button>

                        <span className="absolute -bottom-8 md:-bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-foreground/50 whitespace-nowrap">
                            {isLoadingAudio ? "Chargement..." : status === "playing" ? "Lecture..." : status === "paused" ? "En pause" : "Rejouer"}
                        </span>
                    </div>

                    <button
                        onClick={next}
                        className="p-3 md:p-4 rounded-full bg-card border border-border text-foreground hover:bg-muted active:scale-90 transition-all flex flex-col items-center gap-1 group"
                    >
                        <SkipForward className="w-5 h-5 md:w-6 md:h-6 group-active:translate-x-1 transition-transform" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Passer</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
