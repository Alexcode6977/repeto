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
}

export function ListenModeTroupe({
    script,
    userCharacters = [],
    onExit,
    playId,
    troupeId
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

    // Didascalies detection
    const hasDidascalies = useMemo(() =>
        script.characters.some(c =>
            c.toLowerCase().includes("didascalie") || c.toLowerCase() === "didascalies"
        ), [script.characters]);
    const [skipDidascalies, setSkipDidascalies] = useState(true);

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
        skipCharacters: hasDidascalies && skipDidascalies
            ? script.characters.filter(c => c.toLowerCase().includes("didascalie"))
            : [],
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
        return (
            <div className="flex flex-col lg:flex-row min-h-[100dvh] w-full max-w-7xl mx-auto animate-in fade-in duration-500 bg-background overflow-y-auto">

                {/* LEFT PANEL - Preview (Hidden on mobile) */}
                <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-start pt-16 p-8 border-r border-border">
                    <div className="text-center space-y-4 mb-8">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full animate-pulse-glow" />
                            <Headphones className="relative w-20 h-20 text-teal-400 mx-auto" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Mode Écoute Troupe</h2>
                            <p className="text-muted-foreground text-sm">
                                Vous écoutez <span className="text-teal-400 font-bold">{userCharacters.join(", ")}</span>
                            </p>
                        </div>
                    </div>

                    {/* Mode indicator */}
                    <div className="w-full max-w-md space-y-4">
                        <div className="bg-card backdrop-blur-xl border border-border rounded-3xl p-6 shadow-2xl">
                            <div className="text-center space-y-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mode sélectionné</span>
                                <p className="text-lg font-bold text-foreground">
                                    {listenMode === "full" ? "📖 Intégrale" : listenMode === "cue" ? "💬 Réplique" : "⚡ Filage"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {listenMode === "full"
                                        ? "Toutes les répliques seront lues"
                                        : listenMode === "cue"
                                            ? "Seules les répliques avant les vôtres"
                                            : "Seulement vos répliques"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL - Settings (Full width on mobile) */}
                <div className="lg:w-[55%] flex flex-col items-center justify-center p-4 pt-8 pb-12 lg:p-8 lg:py-10 overflow-y-auto">
                    {/* Start Button */}
                    <div className="w-full mb-6 flex flex-col items-center">
                        <Button
                            size="lg"
                            onClick={handleStart}
                            className="text-lg md:text-xl font-black py-6 md:py-7 px-8 md:px-12 rounded-2xl bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 text-foreground hover:scale-[1.02] transition-all active:scale-95 shadow-[0_0_50px_rgba(20,184,166,0.5)] animate-pulse-subtle group"
                        >
                            <Headphones className="mr-3 h-7 w-7 group-hover:scale-110 transition-transform" />
                            🎧 Commencer l'écoute
                        </Button>
                        <p className="text-center text-[10px] text-muted-foreground mt-2">Pas de micro nécessaire</p>
                    </div>

                    {/* Settings Cards */}
                    <div className="space-y-6 max-w-md mx-auto w-full">

                        {/* Scene Selection */}
                        {script.scenes && script.scenes.length > 0 && (
                            <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-4 md:p-5 shadow-lg">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">🎬 Point de départ</label>
                                <select
                                    className="w-full bg-background/50 border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50 appearance-none cursor-pointer"
                                    onChange={(e) => setStartLineIndex(parseInt(e.target.value))}
                                    value={startLineIndex}
                                >
                                    {(!script.scenes?.[0] || script.scenes[0].index > 0) && (
                                        <option value={0}>Début de la pièce</option>
                                    )}
                                    {script.scenes.map((scene) => (
                                        <option key={scene.index} value={scene.index}>{scene.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Listen Mode Selection */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-4 md:p-5 shadow-lg">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">🎧 Mode d'écoute</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "full", label: "Intégrale", icon: "📖", desc: "Tout le texte" },
                                    { id: "cue", label: "Réplique", icon: "💬", desc: "Avant vos lignes" },
                                    { id: "check", label: "Filage", icon: "⚡", desc: "Vos lignes seules" },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setListenMode(m.id as ListenMode)}
                                        className={cn(
                                            "p-3 rounded-xl text-center transition-all duration-300 touch-manipulation border flex flex-col items-center gap-1",
                                            listenMode === m.id
                                                ? "bg-teal-500/20 border-teal-500/50 shadow-lg shadow-teal-500/10"
                                                : "bg-card border-border hover:bg-white/10 active:scale-95"
                                        )}
                                    >
                                        <span className="text-lg">{m.icon}</span>
                                        <span className={cn("text-xs font-bold", listenMode === m.id ? "text-foreground" : "text-muted-foreground")}>{m.label}</span>
                                        <span className="text-[8px] text-muted-foreground leading-tight">{m.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Voice Provider Selection */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-4 md:p-5 shadow-lg space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">🎙️ Voix de lecture</label>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setTtsProvider("browser")}
                                    className={cn(
                                        "py-3 rounded-xl text-xs font-bold transition-all border",
                                        ttsProvider === "browser"
                                            ? "bg-muted/30 dark:bg-white/10 border-border dark:border-white/30 text-foreground"
                                            : "bg-transparent border-border text-muted-foreground hover:bg-card"
                                    )}
                                >
                                    Standard
                                </button>
                                <button
                                    onClick={() => setTtsProvider("openai")}
                                    className={cn(
                                        "py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2",
                                        ttsProvider === "openai"
                                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                            : "bg-transparent border-border text-muted-foreground hover:bg-card"
                                    )}
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Neural AI
                                </button>
                            </div>
                        </div>

                        {/* Announce Character Toggle */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-4 md:p-5 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">📢 Annonce des personnages</label>
                                    <p className="text-[10px] text-muted-foreground mt-1">Dire le nom avant chaque réplique</p>
                                </div>
                                <button
                                    onClick={() => setAnnounceCharacter(!announceCharacter)}
                                    className={cn(
                                        "relative w-14 h-7 rounded-full transition-colors shrink-0",
                                        announceCharacter ? "bg-teal-500" : "bg-muted"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow",
                                        announceCharacter ? "left-8" : "left-1"
                                    )} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <button onClick={onExit} className="w-full max-w-md mx-auto text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-center py-2 mt-6">
                        Retour au menu
                    </button>
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
