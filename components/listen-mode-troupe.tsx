"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ParsedScript } from "@/lib/types";
import { useListen, ListenMode, OpenAIVoice } from "@/lib/hooks/use-listen";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getUserCapabilities } from "@/app/actions/rehearsal";
import { getVoiceConfig, determineSourceType, VoiceConfig } from "@/lib/actions/voice-cache";
import { Button } from "./ui/button";
import { Play, Pause, SkipForward, SkipBack, X, Sparkles, Headphones, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListenModeTroupeProps {
    script: ParsedScript;
    userCharacters: string[];
    onExit: () => void;
    playId: string;
    troupeId: string;
    skipCharacters?: string[];
}

export function ListenModeTroupe({
    script,
    userCharacters = [],
    onExit,
    playId,
    troupeId,
    skipCharacters = []
}: ListenModeTroupeProps) {
    // Configuration state
    const [listenMode, setListenMode] = useState<ListenMode>("full");
    const [ttsProvider, setTtsProvider] = useState<"browser" | "openai">("browser");
    const [announceCharacter, setAnnounceCharacter] = useState(false);
    const [startLineIndex, setStartLineIndex] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);

    // Premium / Feature State
    const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    // Voice Config State
    const [existingVoiceConfig, setExistingVoiceConfig] = useState<VoiceConfig[] | null>(null);
    const [openaiVoiceAssignments, setOpenaiVoiceAssignments] = useState<Record<string, OpenAIVoice>>({});

    // Didascalies detection - MERGE WITH PASSED SKIP CHARACTERS
    const hasDidascalies = useMemo(() =>
        script.characters.some(c =>
            c.toLowerCase().includes("didascalie") || c.toLowerCase() === "didascalies"
        ), [script.characters]);

    // Default to skipping if technical roles are passed OR didascalies found
    const [shouldSkip, setShouldSkip] = useState(true);

    // Calculate final list of ignored characters
    const effectiveSkippedCharacters = useMemo(() => {
        if (!shouldSkip) return [];

        const internalDidascalies = script.characters.filter(c =>
            c.toLowerCase().includes("didascalie") || c.toLowerCase() === "didascalies"
        );

        return [...new Set([...internalDidascalies, ...skipCharacters])];
    }, [shouldSkip, script.characters, skipCharacters]);

    // Fetch User Capabilities
    useEffect(() => {
        const fetchCapabilities = async () => {
            try {
                const capabilities = await getUserCapabilities(troupeId);
                setIsPremiumUnlocked(capabilities.isPremium);

                if (!capabilities.features.advancedModes && listenMode !== "full") {
                    setListenMode("full");
                }
                if (!capabilities.features.aiVoices && ttsProvider === "openai") {
                    setTtsProvider("browser");
                }
            } catch (error) {
                console.error("Failed to fetch user capabilities", error);
            } finally {
                setIsLoadingStatus(false);
            }
        };
        fetchCapabilities();
    }, [troupeId]);

    // Fetch existing voice config
    useEffect(() => {
        const fetchVoiceConfig = async () => {
            const sourceType = await determineSourceType(false, troupeId, playId);

            try {
                const config = await getVoiceConfig(sourceType, playId);
                if (config) {
                    setExistingVoiceConfig(config);
                    const assignments: Record<string, OpenAIVoice> = {};
                    config.forEach(c => {
                        assignments[c.character_name] = c.voice as OpenAIVoice;
                    });
                    setOpenaiVoiceAssignments(assignments);
                }
            } catch (error) {
                console.error("Failed to fetch voice config", error);
            }
        };

        if (playId) {
            fetchVoiceConfig();
        }
    }, [playId, troupeId]);

    const {
        currentLine,
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
        voices,
        voiceAssignments,
        setVoiceForRole,
        isLoadingAudio
    } = useListen({
        script,
        userCharacters,
        mode: listenMode,
        ttsProvider,
        announceCharacter,
        initialLineIndex: startLineIndex,
        openaiVoiceAssignments,
        skipCharacters: effectiveSkippedCharacters,
        playId,
        troupeId
    });

    const { requestWakeLock, releaseWakeLock } = useWakeLock();

    // Refs for auto-scroll
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const isFirstScrollRef = useRef(true);

    // Auto-scroll to active line
    useEffect(() => {
        if (hasStarted && lineRefs.current.has(currentLineIndex)) {
            const activeEl = lineRefs.current.get(currentLineIndex);
            if (activeEl) {
                if (isFirstScrollRef.current) {
                    requestAnimationFrame(() => {
                        activeEl.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
                    });
                    isFirstScrollRef.current = false;
                } else {
                    activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
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
                    status === "paused" ? resume() : pause();
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

    // Current scene detection
    const currentScene = script.scenes?.find((scene, idx) => {
        const nextScene = script.scenes?.[idx + 1];
        return currentLineIndex >= scene.index && (!nextScene || currentLineIndex < nextScene.index);
    });

    // Helper to check if line is user's
    const isUserLine = (lineChar: string) => {
        const normalizedLineChar = lineChar.toLowerCase().trim();
        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
        return userCharacters.some(userChar => {
            const normalizedUserChar = userChar.toLowerCase().trim();
            return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
        });
    };

    // === SETUP SCREEN ===
    if (!hasStarted) {
        // Quick Start Logic
        const quickStartSettings = useMemo(() => {
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem(`souffleur_listen_settings_${playId}`);
                return saved ? JSON.parse(saved) : null;
            }
            return null;
        }, [playId]);

        const startQuick = () => {
            if (quickStartSettings) {
                setListenMode(quickStartSettings.listenMode);
                setTtsProvider(quickStartSettings.ttsProvider);
                setAnnounceCharacter(quickStartSettings.announceCharacter);
                setStartLineIndex(quickStartSettings.startLineIndex || 0);
                handleStart();
            }
        };

        const handleStartWithSave = () => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(`souffleur_listen_settings_${playId}`, JSON.stringify({
                    listenMode,
                    ttsProvider,
                    announceCharacter,
                    startLineIndex,
                    timestamp: Date.now()
                }));
            }
            handleStart();
        };

        return (
            <div className="flex flex-col h-[100dvh] bg-background">

                {/* 1. STICKY HEADER (Mobile & Desktop) - Preview & Mode Info */}
                <div className="flex-none p-4 pb-0 md:p-6 bg-background/80 mobile-safe-top z-40 backdrop-blur-xl border-b border-border/50">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onExit}
                            className="text-muted-foreground hover:text-foreground -ml-2"
                        >
                            ← Retour
                        </Button>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Mode Écoute</h2>
                        <div className="w-8" /> {/* Spacer */}
                    </div>

                    {/* Compact Mode Preview Card */}
                    <div className="max-w-4xl mx-auto mt-4 px-1">
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg shadow-teal-500/20",
                                    listenMode === 'full' ? "bg-teal-500 text-white" :
                                        listenMode === 'cue' ? "bg-indigo-500 text-white" :
                                            "bg-amber-500 text-white"
                                )}>
                                    {listenMode === 'full' ? "📖" : listenMode === 'cue' ? "💬" : "⚡"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground leading-tight">
                                        {listenMode === "full" ? "Lecture Intégrale" : listenMode === "cue" ? "Donne la Réplique" : "Mode Solo"}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground">
                                        {listenMode === "full" ? "Tout le texte" : listenMode === "cue" ? "Vos indices seulement" : "Vos lignes seules"}
                                    </p>
                                </div>
                            </div>

                            {quickStartSettings && (
                                <Button
                                    onClick={startQuick}
                                    variant="outline"
                                    size="sm"
                                    className="hidden md:flex bg-teal-500/10 text-teal-500 border-teal-500/20 hover:bg-teal-500/20 gap-2"
                                >
                                    <span>⚡ Rapide</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. SCROLLABLE SETTINGS */}
                <div className="flex-1 overflow-y-auto p-4 pb-32 md:p-8 space-y-6">
                    <div className="max-w-2xl mx-auto space-y-6">

                        {/* Quick Start Mobile Button */}
                        {quickStartSettings && (
                            <button
                                onClick={startQuick}
                                className="w-full md:hidden py-3 px-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-wider hover:bg-teal-500/20 flex items-center justify-center gap-2 mb-4"
                            >
                                <span>⚡</span> Reprendre (derniers réglages)
                            </button>
                        )}

                        {/* Scene Selection (Horizontal Scroll on Mobile) */}
                        {script.scenes && script.scenes.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Départ</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x no-scrollbar">
                                    <button
                                        onClick={() => setStartLineIndex(0)}
                                        className={cn(
                                            "flex-none px-4 py-3 rounded-xl border text-sm font-medium transition-all snap-start",
                                            startLineIndex === 0
                                                ? "bg-card border-teal-500 text-foreground ring-1 ring-teal-500"
                                                : "bg-card/50 border-border text-muted-foreground"
                                        )}
                                    >
                                        Début
                                    </button>
                                    {script.scenes.map((scene) => (
                                        <button
                                            key={scene.index}
                                            onClick={() => setStartLineIndex(scene.index)}
                                            className={cn(
                                                "flex-none px-4 py-3 rounded-xl border text-sm font-medium transition-all snap-start whitespace-nowrap",
                                                startLineIndex === scene.index
                                                    ? "bg-card border-teal-500 text-foreground ring-1 ring-teal-500"
                                                    : "bg-card/50 border-border text-muted-foreground"
                                            )}
                                        >
                                            {scene.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mode Selection (Cards) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Configuration</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {[
                                    { id: "full", label: "Intégrale", icon: "📖", desc: "Tout le texte" },
                                    { id: "cue", label: "Réplique", icon: "💬", desc: "Avant vos lignes" },
                                    { id: "check", label: "Solo", icon: "⚡", desc: "Vos lignes seules" },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setListenMode(m.id as ListenMode)}
                                        className={cn(
                                            "p-3 rounded-xl text-left transition-all duration-300 border flex items-center gap-3 active:scale-98",
                                            listenMode === m.id
                                                ? "bg-card border-teal-500 shadow-md ring-1 ring-teal-500"
                                                : "bg-card/50 border-border opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <span className="text-xl">{m.icon}</span>
                                        <div>
                                            <p className={cn("text-sm font-bold", listenMode === m.id ? "text-foreground" : "text-muted-foreground")}>{m.label}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Toggles (Voice & Announce) */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTtsProvider(prev => prev === 'openai' ? 'browser' : 'openai')}
                                className={cn(
                                    "p-4 rounded-xl border text-left transition-all",
                                    ttsProvider === 'openai'
                                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                                        : "bg-card/50 border-border text-muted-foreground"
                                )}
                            >
                                <div className="text-[10px] uppercase font-bold tracking-widest mb-1">Voix</div>
                                <div className="flex items-center gap-2 font-bold">
                                    {ttsProvider === 'openai' ? <Sparkles className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                                    {ttsProvider === 'openai' ? "Neural AI" : "Standard"}
                                </div>
                            </button>

                            <button
                                onClick={() => setAnnounceCharacter(!announceCharacter)}
                                className={cn(
                                    "p-4 rounded-xl border text-left transition-all",
                                    announceCharacter
                                        ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-500"
                                        : "bg-card/50 border-border text-muted-foreground"
                                )}
                            >
                                <div className="text-[10px] uppercase font-bold tracking-widest mb-1">Noms</div>
                                <div className="flex items-center gap-2 font-bold">
                                    <span className="text-lg">{announceCharacter ? "📢" : "😶"}</span>
                                    {announceCharacter ? "Annoncés" : "Masqués"}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. FLOAT BOTTOM START BUTTON */}
                <div className="fixed bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-background via-background to-transparent z-50">
                    <Button
                        size="lg"
                        onClick={handleStartWithSave}
                        className="w-full max-w-md mx-auto text-lg font-bold py-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_30px_rgba(20,184,166,0.4)] animate-pulse-glow"
                    >
                        <Headphones className="mr-2 h-6 w-6" />
                        Commencer ({script.scenes && script.scenes.length > 0 && startLineIndex > 0
                            ? "Scène " + (script.scenes.find(s => s.index === startLineIndex)?.title?.split(' ')[1] || startLineIndex)
                            : "Début"})
                    </Button>
                </div>
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
                        isFirstScrollRef.current ? "opacity-0" : "opacity-100"
                    )}
                >
                    {script.lines.map((line, index) => {
                        const isActive = index === currentLineIndex;
                        const isUser = isUserLine(line.character);

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
