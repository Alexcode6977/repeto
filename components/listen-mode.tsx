"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ParsedScript } from "@/lib/types";
import { useListen, type ListenMode } from "@/lib/hooks/use-listen";
import { type TTSProvider } from "@/lib/hooks/use-ai-tts";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getUserCapabilities } from "@/app/actions/rehearsal";
import { getVoiceConfig, determineSourceType, VoiceConfig } from "@/lib/actions/voice-cache";
import { Button } from "./ui/button";
import { Play, Pause, SkipForward, SkipBack, X, Loader2, Sparkles, Headphones, RotateCcw, ArrowLeft, MessageSquare, Zap, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import { filterScriptLines, parseSegments } from "@/lib/utils/stage-directions";

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
    showStageDirections = true
}: ListenModeProps) {
    // Configuration state
    const [listenMode, setListenMode] = useState<ListenMode>("full");
    const [ttsProvider, setTtsProvider] = useState<TTSProvider>("browser");
    const [announceCharacter, setAnnounceCharacter] = useState(false);
    const [startLineIndex, setStartLineIndex] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);

    // Premium / Feature State
    const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    // Voice Config State
    const [openaiVoiceAssignments, setOpenaiVoiceAssignments] = useState<Record<string, string>>({});

    // Didascalies detection
    const hasDidascalies = useMemo(() =>
        script.characters.some(c =>
            c.toLowerCase().includes("didascalie") || c.toLowerCase() === "didascalies"
        ), [script.characters]);
    const [skipDidascalies, setSkipDidascalies] = useState(true);

    const effectiveSkipCharacters = useMemo(() => {
        const didascalieChars = hasDidascalies && skipDidascalies
            ? script.characters.filter(c => c.toLowerCase().includes("didascalie"))
            : [];
        return [...new Set([...skipCharacters, ...didascalieChars])];
    }, [skipCharacters, hasDidascalies, skipDidascalies, script.characters]);

    const quickStartSettings = useMemo(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`souffleur_listen_settings_${playId || scriptId}`);
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    }, [playId, scriptId]);

    // Fetch Capabilities
    useEffect(() => {
        const fetchCapabilities = async () => {
            try {
                const capabilities = await getUserCapabilities(troupeId);
                setIsPremiumUnlocked(capabilities.isPremium);

                if (capabilities.features.aiVoices || capabilities.isPremium) {
                    setTtsProvider("elevenlabs");
                } else {
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

    // Fetch voice config
    useEffect(() => {
        const fetchVoiceConfig = async () => {
            const sourceType = await determineSourceType(isPublicScript, troupeId, playId);
            const sourceId = playId || scriptId;
            if (!sourceId) return;

            try {
                const config = await getVoiceConfig(sourceType, sourceId);
                if (config) {
                    const assignments: Record<string, string> = {};
                    config.forEach(c => {
                        assignments[c.character_name] = c.voice;
                    });

                    if (Object.keys(assignments).length > 0) {
                        setOpenaiVoiceAssignments(assignments);
                    } else {
                        // Fallback: ElevenLabs default distribution
                        const VOICES = ["21m00Tcm4TlvDq8ikWAM", "pNInz6obpgDQGcFmaJgB", "EXAVITQu4vr4xnNLMQyw", "ErXw9S1k3MpBy928U4cm", "MF3mGyEYCl7XYW7Lyk9p", "TxGEqnHW47ic3A7NWmsG"];
                        const localAssignments: Record<string, string> = {};
                        script.characters.forEach((char, index) => {
                            localAssignments[char] = VOICES[index % VOICES.length];
                        });
                        setOpenaiVoiceAssignments(localAssignments);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch voice config", error);
            }
        };

        if (scriptId || playId) fetchVoiceConfig();
    }, [scriptId, playId, troupeId, isPublicScript, script.characters]);

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
        skipCharacters: effectiveSkipCharacters,
        playId,
        scriptId,
        isPublicScript,
        showStageDirections
    });

    const { requestWakeLock, releaseWakeLock } = useWakeLock();
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const isFirstScrollRef = useRef(true);

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

    useEffect(() => {
        if (status === "finished" && hasStarted) {
            releaseWakeLock();
            onExit();
        }
    }, [status, hasStarted, onExit, releaseWakeLock]);

    const handleStart = async () => {
        setHasStarted(true);
        requestWakeLock();
        start();
    };

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
            localStorage.setItem(`souffleur_listen_settings_${playId || scriptId}`, JSON.stringify({
                listenMode,
                ttsProvider,
                announceCharacter,
                startLineIndex,
                timestamp: Date.now()
            }));
        }
        handleStart();
    };

    const handleExit = () => {
        stop();
        releaseWakeLock();
        onExit();
    };

    const currentScene = script.scenes?.find((scene, idx) => {
        const nextScene = script.scenes?.[idx + 1];
        return currentLineIndex >= scene.index && (!nextScene || currentLineIndex < nextScene.index);
    });

    const isUserLine = (lineChar: string) => {
        const normalizedLineChar = lineChar.toLowerCase().trim();
        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
        return userCharacters.some(userChar => {
            const normalizedUserChar = userChar.toLowerCase().trim();
            return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
        });
    };

    const filteredLines = useMemo(() =>
        filterScriptLines(script.lines, showStageDirections),
        [script.lines, showStageDirections]
    );

    if (!hasStarted) {
        return (
            <div className="w-full max-w-lg mx-auto pt-24 md:pt-32 pb-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <Card className="bg-black/40 backdrop-blur-2xl border-white/10 shadow-2xl overflow-hidden relative w-full">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="p-6 md:p-8 space-y-8 relative z-10">
                        <div className="space-y-6">
                            <button onClick={onExit} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-wider group">
                                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Retour
                            </button>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-teal-300 via-teal-500 to-cyan-500 drop-shadow-sm flex items-center gap-3">
                                    <Headphones className="w-8 h-8 md:w-10 md:h-10 text-teal-500" /> Mode Écoute
                                </h2>
                                {quickStartSettings && (
                                    <button onClick={startQuick} className="mt-2 py-2 px-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-wider hover:bg-teal-500/20 flex items-center gap-2 transition-all w-fit">
                                        <span>⚡</span> Reprendre
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3 h-3" /> Voix Premium ElevenLabs Actives
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Play className="w-3 h-3" /> Départ
                            </label>
                            <select
                                value={startLineIndex}
                                onChange={(e) => setStartLineIndex(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50 appearance-none cursor-pointer"
                            >
                                <option value={0} className="bg-zinc-900">Début du script</option>
                                {script.scenes?.map((scene, i) => (
                                    <option key={`scene-${scene.index}-${i}`} value={scene.index} className="bg-zinc-900">{scene.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Headphones className="w-3 h-3" /> Configuration
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { id: "full", label: "Intégrale", icon: Users },
                                    { id: "cue", label: "Réplique", icon: MessageSquare },
                                    { id: "check", label: "Solo", icon: Zap },
                                ].map((m) => {
                                    const isActive = listenMode === m.id;
                                    const Icon = m.icon;
                                    return (
                                        <button key={m.id} onClick={() => setListenMode(m.id as any)} className={cn("relative p-3 rounded-xl border flex flex-col items-start gap-2 transition-all", isActive ? "bg-teal-500/10 border-teal-500/50" : "bg-white/5 border-transparent hover:bg-white/10")}>
                                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-colors mb-1", isActive ? "bg-teal-500 text-white" : "bg-white/10 text-muted-foreground")}>
                                                <Icon className="w-3 h-3" />
                                            </div>
                                            <div className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-white" : "text-muted-foreground")}>{m.label}</div>
                                            {isActive && <Check className="w-3 h-3 text-teal-400 absolute top-3 right-3" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button onClick={() => setAnnounceCharacter(!announceCharacter)} className={cn("w-full p-3 rounded-xl border flex items-center gap-3 transition-all", announceCharacter ? "bg-indigo-500/20 border-indigo-500/50" : "bg-white/5 border-transparent hover:bg-white/10")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", announceCharacter ? "bg-indigo-500 text-white" : "bg-white/10")}>📢</div>
                                <div className="text-left">
                                    <div className={cn("text-xs font-bold uppercase tracking-wide", announceCharacter ? "text-indigo-400" : "text-muted-foreground")}>Noms</div>
                                    <div className="text-[9px] text-muted-foreground">{announceCharacter ? "Annoncés" : "Masqués"}</div>
                                </div>
                                {announceCharacter && <Check className="w-4 h-4 text-indigo-400 ml-auto" />}
                            </button>
                        </div>

                        <button onClick={handleStartWithSave} className="w-full group py-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all">
                            <span>Lancer l'écoute</span> <Headphones className="w-5 h-5" />
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/98">
            <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 via-transparent to-transparent opacity-50" />
            <div className="w-full h-[100dvh] md:h-[85vh] md:max-w-3xl md:rounded-3xl md:border md:bg-background/40 md:backdrop-blur-sm flex flex-col overflow-hidden relative">
                <div className="flex justify-between items-center p-4 md:p-6 z-10">
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
                        <button onClick={() => status === "paused" ? resume() : pause()} className="p-2 text-muted-foreground hover:text-foreground">
                            {status === "paused" ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6" />}
                        </button>
                        <button onClick={handleExit} className="p-2 text-muted-foreground hover:text-red-400"><X className="w-6 h-6" /></button>
                    </div>
                </div>

                <div ref={containerRef} className={cn("flex-1 overflow-y-auto px-4 py-8 space-y-6 scroll-smooth no-scrollbar transition-opacity duration-300", isFirstScrollRef.current ? "opacity-0" : "opacity-100")}>
                    {filteredLines.map((line, index) => {
                        const isActive = index === currentLineIndex;
                        const isUser = isUserLine(line.character);
                        return (
                            <div key={line.id} ref={(el) => { if (el) lineRefs.current.set(index, el); }} className={cn("transition-all duration-500 max-w-2xl mx-auto rounded-2xl p-4", isActive ? "bg-muted/30 dark:bg-white/10 scale-105 border border-border opacity-100 shadow-xl" : "opacity-40 scale-95")}>
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
                        <button onClick={replay} className={cn("relative w-24 h-24 rounded-full flex items-center justify-center transition-all border-4 shadow-2xl", status === "playing" ? "bg-cyan-500 border-cyan-400 scale-110" : "bg-muted border-border")}>
                            {isLoadingAudio ? <Loader2 className="w-10 h-10 animate-spin text-white" /> : status === "playing" ? <div className="flex gap-1 items-center"><div className="w-1.5 h-8 bg-white rounded-full animate-bounce" /><div className="w-1.5 h-6 bg-white rounded-full animate-bounce [animation-delay:0.2s]" /></div> : <Play className="w-10 h-10 text-foreground ml-1" />}
                        </button>
                    </div>
                    <button onClick={next} className="p-4 rounded-full bg-card border border-border hover:bg-muted"><SkipForward className="w-6 h-6" /></button>
                </div>
            </div>
        </div>
    );
}
