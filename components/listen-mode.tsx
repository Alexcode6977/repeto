"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ParsedScript } from "@/lib/types";
import { useListen, type ListenMode } from "@/lib/hooks/use-listen";
import { type TTSProvider } from "@/lib/hooks/use-ai-tts";
import { usePauseOnAppBackground } from "@/lib/hooks/use-pause-on-app-background";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getUserCapabilities } from "@/app/actions/rehearsal";
import { Play, Pause, SkipForward, SkipBack, X, Loader2, Sparkles, Headphones, ArrowLeft, MessageSquare, Zap, Users, Check, Heart } from "lucide-react";
import { cn, getCollectiveMembersForLine, getSceneCharacters, getSceneStartIndexForLine, isUserLine as checkIsUserLine } from "@/lib/utils";
import { Card } from "./ui/card";
import { filterScriptLines, parseSegments } from "@/lib/utils/stage-directions";
import { type SoloFavoriteDraft, getListenQuickStartStorageKey } from "@/lib/solo-favorites";

interface ListenModeProps {
    script: ParsedScript;
    userCharacters: string[];
    onExit: () => void;
    playId?: string;
    scriptId?: string;
    isPublicScript?: boolean;
    troupeId?: string;
    skipCharacters?: string[];
    showStageDirections?: boolean;
    initialConfig?: {
        listenMode: ListenMode;
        startLineIndex: number;
        announceCharacter: boolean;
        playbackSpeed: "normal" | "fast" | "veryfast";
    };
    autoStart?: boolean;
    onSaveFavoriteDraft?: (draft: SoloFavoriteDraft) => Promise<void>;
}

export function ListenMode({
    script,
    userCharacters = [],
    onExit,
    playId,
    scriptId,
    isPublicScript = false,
    troupeId,
    skipCharacters = [],
    showStageDirections = true,
    initialConfig,
    autoStart = false,
    onSaveFavoriteDraft
}: ListenModeProps) {
    const hasUserCharacters = userCharacters.length > 0;
    const canSaveFavorite = Boolean(onSaveFavoriteDraft && scriptId && !playId && !troupeId);

    // Configuration state
    const [listenMode, setListenMode] = useState<ListenMode>(initialConfig?.listenMode || "full");
    const [ttsProvider, setTtsProvider] = useState<TTSProvider>("browser");
    const [announceCharacter, setAnnounceCharacter] = useState(initialConfig?.announceCharacter || false);
    const [startLineIndex, setStartLineIndex] = useState(initialConfig?.startLineIndex || 0);
    const [hasStarted, setHasStarted] = useState(false);
    const [hasAiVoiceAccess, setHasAiVoiceAccess] = useState(false);
    const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true);
    const [isSavingFavorite, setIsSavingFavorite] = useState(false);
    const [showCompletionSheet, setShowCompletionSheet] = useState(false);

    // Playback Speed: 3 positions (Normal=1.0, Accéléré=1.25, Très rapide=1.5)
    const [playbackSpeed, setPlaybackSpeed] = useState<"normal" | "fast" | "veryfast">(initialConfig?.playbackSpeed || "normal");
    const speedMultiplier = playbackSpeed === "normal" ? 1.0 : playbackSpeed === "fast" ? 1.25 : 1.5;
    type ScriptLineWithOriginalIndex = typeof script.lines[number] & { originalIndex: number };

    const effectiveSkipCharacters = useMemo(
        () => [...new Set(skipCharacters)],
        [skipCharacters]
    );

    const quickStartStorageKey = useMemo(
        () => getListenQuickStartStorageKey(playId || scriptId || script.title || "listen"),
        [playId, scriptId, script.title]
    );

    const quickStartSettings = useMemo(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(quickStartStorageKey);
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    }, [quickStartStorageKey]);

    const sceneCharactersMap = useMemo(() => getSceneCharacters(script), [script]);

    // Fetch Capabilities
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

    useEffect(() => {
        if (initialConfig && !hasStarted) {
            setListenMode(initialConfig.listenMode);
            setAnnounceCharacter(initialConfig.announceCharacter);
            setStartLineIndex(initialConfig.startLineIndex);
            setPlaybackSpeed(initialConfig.playbackSpeed);
        }
    }, [initialConfig, hasStarted]);

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
        skipCharacters: effectiveSkipCharacters,
        playId,
        scriptId,
        isPublicScript,
        showStageDirections,
        playbackRate: speedMultiplier
    });

    const { requestWakeLock, releaseWakeLock } = useWakeLock();
    usePauseOnAppBackground(status === "playing", pause);
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const isFirstScrollRef = useRef(true);
    const [hasInitialScrollCompleted, setHasInitialScrollCompleted] = useState(false);

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

    useEffect(() => {
        if (status === "finished" && hasStarted) {
            stop();
            releaseWakeLock();

            if (canSaveFavorite) {
                setShowCompletionSheet(true);
            } else {
                onExit();
            }
        }
    }, [status, hasStarted, onExit, releaseWakeLock, canSaveFavorite, stop]);

    const handleStart = async () => {
        if (isLoadingCapabilities) return;
        setHasStarted(true);
        requestWakeLock();
        start();
    };

    const buildFavoriteDraft = (): SoloFavoriteDraft | null => {
        if (!scriptId || !userCharacters[0]) return null;

        return {
            scriptId,
            characterName: userCharacters[0],
            ignoredCharacters: effectiveSkipCharacters,
            showStageDirections,
            launchMode: "listen",
            preset: {
                listenMode,
                startLineIndex,
                announceCharacter,
                playbackSpeed,
            },
        };
    };

    const handleSaveFavorite = async () => {
        if (!onSaveFavoriteDraft || isSavingFavorite) return;

        const draft = buildFavoriteDraft();
        if (!draft) return;

        try {
            setIsSavingFavorite(true);
            await onSaveFavoriteDraft(draft);
        } finally {
            setIsSavingFavorite(false);
        }
    };

    const startQuick = () => {
        if (quickStartSettings) {
            const enforcedProvider: TTSProvider = hasAiVoiceAccess ? "google" : "browser";
            setListenMode(quickStartSettings.listenMode);
            setTtsProvider(enforcedProvider);
            setAnnounceCharacter(quickStartSettings.announceCharacter);
            setStartLineIndex(quickStartSettings.startLineIndex || 0);
            setPlaybackSpeed(quickStartSettings.playbackSpeed || "normal");
            handleStart();
        }
    };

    const handleStartWithSave = () => {
        const enforcedProvider: TTSProvider = hasAiVoiceAccess ? "google" : "browser";
        if (typeof window !== 'undefined') {
            localStorage.setItem(quickStartStorageKey, JSON.stringify({
                listenMode,
                ttsProvider: enforcedProvider,
                announceCharacter,
                startLineIndex,
                playbackSpeed,
                timestamp: Date.now()
            }));
        }
        setTtsProvider(enforcedProvider);
        handleStart();
    };

    const handleExit = () => {
        stop();
        releaseWakeLock();

        if (canSaveFavorite && hasStarted && currentRelevantIndex > 0) {
            setShowCompletionSheet(true);
            return;
        }

        onExit();
    };

    useEffect(() => {
        if (!autoStart || hasStarted || isLoadingCapabilities) {
            return;
        }

        const timer = setTimeout(() => {
            const enforcedProvider: TTSProvider = hasAiVoiceAccess ? "google" : "browser";

            if (typeof window !== "undefined") {
                localStorage.setItem(quickStartStorageKey, JSON.stringify({
                    listenMode,
                    ttsProvider: enforcedProvider,
                    announceCharacter,
                    startLineIndex,
                    playbackSpeed,
                    timestamp: Date.now()
                }));
            }

            setTtsProvider(enforcedProvider);
            setHasStarted(true);
            requestWakeLock();
            start();
        }, 250);

        return () => clearTimeout(timer);
    }, [autoStart, hasStarted, isLoadingCapabilities, hasAiVoiceAccess, quickStartStorageKey, listenMode, announceCharacter, startLineIndex, playbackSpeed, requestWakeLock, start]);

    const currentScene = script.scenes?.find((scene, idx) => {
        const nextScene = script.scenes?.[idx + 1];
        return currentLineIndex >= scene.index && (!nextScene || currentLineIndex < nextScene.index);
    });

    const isUserLine = (lineChar: string, lineIndex: number) => {
        const sceneStartIdx = getSceneStartIndexForLine(script, lineIndex);
        const activeChars = sceneCharactersMap.get(sceneStartIdx);
        const collectiveMembers = getCollectiveMembersForLine(script, lineIndex);
        return checkIsUserLine(script, lineChar, userCharacters, activeChars, collectiveMembers);
    };

    const filteredLines = useMemo(
        () =>
            filterScriptLines(
                script.lines.map((line, originalIndex) => ({
                    ...line,
                    originalIndex
                })),
                showStageDirections
            ) as ScriptLineWithOriginalIndex[],
        [script, showStageDirections]
    );

    if (!hasStarted) {
        return (
            <div className="w-full max-w-lg mx-auto pt-24 md:pt-32 pb-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <Card className="bg-card/90 dark:bg-black/40 backdrop-blur-2xl border-border/60 dark:border-white/10 shadow-2xl overflow-hidden relative w-full">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="p-6 md:p-8 space-y-8 relative z-10">
                        <div className="space-y-6">
                            <button onClick={onExit} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors uppercase tracking-wider group">
                                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Retour
                            </button>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-teal-300 via-teal-500 to-cyan-500 drop-shadow-sm flex items-center gap-3">
                                    <Headphones className="w-8 h-8 md:w-10 md:h-10 text-teal-500" /> Mode Écoute
                                </h2>
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
                                        <span>⚡</span> Reprendre
                                    </button>
                                )}
                            </div>
                        </div>

                        <div
                            className={cn(
                                "p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2",
                                ttsProvider === "google"
                                    ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                                    : "bg-zinc-500/10 border border-zinc-500/20 text-zinc-300"
                            )}
                        >
                            <Sparkles className="w-3 h-3" />
                            {ttsProvider === "google"
                                ? "Voix Premium Google HD Actives"
                                : "Voix Navigateur Actives"}
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Play className="w-3 h-3" /> Départ
                            </label>
                            <select
                                value={startLineIndex}
                                onChange={(e) => setStartLineIndex(Number(e.target.value))}
                                className="w-full bg-muted/60 dark:bg-white/5 border border-border/70 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-foreground dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50 appearance-none cursor-pointer"
                            >
                                <option value={0} className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">Début du script</option>
                                {script.scenes?.map((scene, i) => (
                                    <option key={`scene-${scene.index}-${i}`} value={scene.index} className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">{scene.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Headphones className="w-3 h-3" /> Configuration
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { id: "full", label: "Intégral", icon: Users },
                                    { id: "cue", label: "Réplique", icon: MessageSquare },
                                    { id: "check", label: "Solo", icon: Zap },
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
                                                "relative p-3 rounded-xl border flex flex-col items-start gap-2 transition-all",
                                                isDisabled
                                                    ? "bg-muted/40 dark:bg-white/5 border-transparent opacity-40 cursor-not-allowed"
                                                    : isActive
                                                        ? "bg-teal-500/10 border-teal-500/50"
                                                        : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10"
                                            )}
                                        >
                                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-colors mb-1", isActive ? "bg-teal-500 text-white" : "bg-muted dark:bg-white/10 text-muted-foreground")}>
                                                <Icon className="w-3 h-3" />
                                            </div>
                                            <div className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-teal-700 dark:text-white" : "text-muted-foreground")}>{m.label}</div>
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

                        <div className="space-y-4">
                            <button onClick={() => setAnnounceCharacter(!announceCharacter)} className={cn("w-full p-3 rounded-xl border flex items-center gap-3 transition-all", announceCharacter ? "bg-indigo-500/20 border-indigo-500/50" : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", announceCharacter ? "bg-indigo-500 text-white" : "bg-muted dark:bg-white/10")}>📢</div>
                                <div className="text-left">
                                    <div className={cn("text-xs font-bold uppercase tracking-wide", announceCharacter ? "text-indigo-400" : "text-muted-foreground")}>Noms</div>
                                    <div className="text-[9px] text-muted-foreground">{announceCharacter ? "Annoncés" : "Masqués"}</div>
                                </div>
                                {announceCharacter && <Check className="w-4 h-4 text-indigo-400 ml-auto" />}
                            </button>
                        </div>

                        {/* PLAYBACK SPEED */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-3 h-3" />
                                Vitesse de lecture
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: "normal", label: "Normal", sub: "1×" },
                                    { id: "fast", label: "Accéléré", sub: "1.25×" },
                                    { id: "veryfast", label: "Très rapide", sub: "1.5×" },
                                ].map((s) => {
                                    const isActive = playbackSpeed === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setPlaybackSpeed(s.id as "normal" | "fast" | "veryfast")}
                                            className={cn(
                                                "relative p-3 rounded-xl text-center transition-all duration-300 border",
                                                isActive
                                                    ? "bg-teal-500/10 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
                                                    : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10"
                                            )}
                                        >
                                            <div className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-teal-700 dark:text-white" : "text-muted-foreground")}>
                                                {s.label}
                                            </div>
                                            {isActive && <Check className="w-3 h-3 text-teal-400 absolute top-2 right-2" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {canSaveFavorite && (
                                <button
                                    onClick={handleSaveFavorite}
                                    disabled={isSavingFavorite}
                                    className={cn(
                                        "w-full group py-3 rounded-xl font-bold tracking-wider border flex items-center justify-center gap-3 transition-all",
                                        isSavingFavorite
                                            ? "bg-teal-500/10 border-teal-500/20 text-teal-300 cursor-not-allowed"
                                            : "bg-teal-500/5 border-teal-500/20 text-teal-500 hover:bg-teal-500/10"
                                    )}
                                >
                                    {isSavingFavorite ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            <Heart className="w-4 h-4" />
                                            Ajouter aux favoris
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={handleStartWithSave}
                                disabled={isLoadingCapabilities}
                                className={cn(
                                    "w-full group py-4 rounded-xl font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all",
                                    isLoadingCapabilities
                                        ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-teal-500 to-cyan-600 text-white"
                                )}
                            >
                                <span>Lancer l&apos;écoute</span> <Headphones className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-background">
            <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 via-transparent to-transparent opacity-50" />
            <div className="w-full h-[100dvh] md:h-[85vh] md:max-w-3xl md:rounded-3xl md:border md:bg-background/40 md:backdrop-blur-sm flex flex-col overflow-hidden relative">
                <div className="flex justify-between items-center p-4 md:p-6 pt-[max(env(safe-area-inset-top,1rem),1rem)] z-20">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                            {currentRelevantIndex}/{totalRelevantLines} • {progress}%
                        </div>
                        {currentScene && (
                            <div className="px-3 py-1.5 rounded-full text-[10px] font-bold border bg-muted/30 text-foreground truncate max-w-[150px]">
                                🎬 {currentScene.title}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={replay} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-transparent border border-muted-foreground/30 rounded-full text-muted-foreground hover:text-foreground transition-colors mr-1">
                            Rejouer
                        </button>
                        <button onClick={handleExit} className="p-2 text-muted-foreground hover:text-red-400 bg-muted/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                </div>

                <div ref={containerRef} className={cn("flex-1 overflow-y-auto px-4 py-8 space-y-6 scroll-smooth no-scrollbar transition-opacity duration-300", hasInitialScrollCompleted ? "opacity-100" : "opacity-0")}>
                    {filteredLines.map((line) => {
                        const originalIndex = line.originalIndex;
                        const isActive = originalIndex === currentLineIndex;
                        const isUser = isUserLine(line.character, originalIndex);
                        return (
                            <div key={line.id} ref={(el) => { if (el) lineRefs.current.set(originalIndex, el); }} className={cn("transition-all duration-500 max-w-2xl mx-auto rounded-2xl p-4", isActive ? "bg-muted/30 dark:bg-white/10 scale-105 border border-border opacity-100 shadow-xl" : "opacity-40 scale-95")}>
                                {line.character !== "INDICATIONS" && <p className={cn("text-xs font-bold uppercase tracking-widest mb-3", isActive ? "text-foreground" : "text-muted-foreground")}>{line.character}</p>}
                                <p className={cn("leading-relaxed font-serif", isActive ? "text-xl md:text-3xl text-foreground" : "text-base md:text-lg text-muted-foreground")}>
                                    {isActive && status === "playing" && <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 animate-pulse mr-3" />}
                                    {(() => {
                                        const segments = parseSegments(line.text);
                                        return segments.map((seg, i) => (
                                            <span
                                                key={i}
                                                className={cn(
                                                    seg.isDirection
                                                        ? "text-muted-foreground/60 italic text-[0.85em] mx-1 font-sans"
                                                        : (isUser && isActive ? "text-cyan-600 dark:text-cyan-300" : "")
                                                )}
                                            >
                                                {seg.text}
                                            </span>
                                        ));
                                    })()}
                                </p>
                            </div>
                        );
                    })}
                    <div className="h-48" />
                </div>

                <div className="pb-8 md:pb-12 pt-4 px-6 md:px-8 flex items-center justify-between relative z-30">
                    <button onClick={previous} className="p-4 rounded-full bg-card border border-border hover:bg-muted"><SkipBack className="w-6 h-6" /></button>
                    <div className="relative">
                        <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] rotate-[-90deg] text-border" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
                            <circle cx="50" cy="50" r="46" fill="none" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${progress * 2.89} 289`} className="transition-all duration-500" />
                        </svg>
                        <button onClick={() => status === "paused" ? resume() : pause()} className={cn("relative w-24 h-24 rounded-full flex items-center justify-center transition-all border-4 shadow-2xl", status === "playing" ? "bg-cyan-500 border-cyan-400 scale-110" : "bg-muted border-border hover:bg-muted/80")}>
                            {isLoadingAudio ? <Loader2 className="w-10 h-10 animate-spin text-white" /> : status === "playing" ? <Pause className="w-10 h-10 text-white fill-current" /> : <Play className="w-10 h-10 text-foreground ml-1 fill-current" />}
                        </button>
                    </div>
                    <button onClick={next} className="p-4 rounded-full bg-card border border-border hover:bg-muted"><SkipForward className="w-6 h-6" /></button>
                </div>
            </div>

            {showCompletionSheet && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
                        <div className="space-y-2 text-center">
                            <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/15 flex items-center justify-center">
                                <Headphones className="w-7 h-7 text-cyan-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Écoute terminée</h3>
                            <p className="text-sm text-muted-foreground">
                                Sauvegarde cette configuration pour la relancer en un tap depuis Favoris.
                            </p>
                        </div>

                        <div className="mt-6 space-y-3">
                            {canSaveFavorite && (
                                <button
                                    onClick={handleSaveFavorite}
                                    disabled={isSavingFavorite}
                                    className={cn(
                                        "w-full rounded-xl py-3 font-semibold transition-all flex items-center justify-center gap-2",
                                        isSavingFavorite
                                            ? "bg-cyan-500/10 text-cyan-300 cursor-not-allowed"
                                            : "bg-cyan-500 text-white hover:bg-cyan-600"
                                    )}
                                >
                                    {isSavingFavorite ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            <Heart className="w-4 h-4" />
                                            Sauvegarder ce favori
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setShowCompletionSheet(false);
                                    onExit();
                                }}
                                className="w-full rounded-xl py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Terminer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
