"use client";

import { useState, useEffect } from "react";
import { ScriptLine, ParsedScript } from "@/lib/types";
import { useRehearsal } from "@/lib/hooks/use-rehearsal";
import { synthesizeSpeech } from "@/app/actions/tts";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Mic, MicOff, Play, SkipForward, SkipBack, AlertTriangle, CheckCircle, Pause, Power, Loader2, Lock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Premium unlock code - generated complex code
const PREMIUM_CODE = "SCEN3-PRMT-X7K9-2024";


interface RehearsalModeProps {
    script: ParsedScript;
    userCharacter: string;
    onExit: () => void;
}

export function RehearsalMode({ script, userCharacter, onExit }: RehearsalModeProps) {
    const [threshold, setThreshold] = useState(0.85); // Default 85%
    const [startLineIndex, setStartLineIndex] = useState(0);
    const [rehearsalMode, setRehearsalMode] = useState<"full" | "cue" | "check">("full");
    const [hasStarted, setHasStarted] = useState(false);
    const [ttsProvider, setTtsProvider] = useState<"browser" | "openai">("browser");

    // Premium unlock state
    const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [unlockCode, setUnlockCode] = useState("");
    const [unlockError, setUnlockError] = useState(false);

    // Check localStorage for premium unlock on mount
    useEffect(() => {
        const unlocked = localStorage.getItem("repeto_premium_unlocked");
        if (unlocked === "true") {
            setIsPremiumUnlocked(true);
        }
    }, []);

    // Function to unlock premium
    const handleUnlock = () => {
        if (unlockCode.toUpperCase().replace(/\s/g, "") === PREMIUM_CODE.replace(/-/g, "")) {
            setIsPremiumUnlocked(true);
            localStorage.setItem("repeto_premium_unlocked", "true");
            setShowUnlockModal(false);
            setUnlockError(false);
            setTtsProvider("openai");  // Auto-switch to premium
        } else {
            setUnlockError(true);
        }
    };

    // OpenAI voice assignments per character
    type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    const [openaiVoiceAssignments, setOpenaiVoiceAssignments] = useState<Record<string, OpenAIVoice>>({});
    const [testingVoice, setTestingVoice] = useState<string | null>(null);  // Track which role is being tested

    // Function to test OpenAI voice
    const testOpenAIVoice = async (role: string, voice: OpenAIVoice) => {
        setTestingVoice(role);
        try {
            const result = await synthesizeSpeech("Bonjour, je suis votre partenaire de répétition !", voice);
            if ("audio" in result) {
                const audio = new Audio(result.audio);
                audio.onended = () => setTestingVoice(null);
                await audio.play();
            } else {
                console.error("TTS Error:", result.error);
                setTestingVoice(null);
            }
        } catch (e) {
            console.error("Test failed:", e);
            setTestingVoice(null);
        }
    };

    const {
        currentLine,
        currentLineIndex,
        status,
        feedback,
        start,
        skip,
        stop,
        lastTranscript,
        retry,
        validateManually,
        togglePause,
        isPaused,
        previous,
        voiceAssignments,
        setVoiceForRole,
        voices
    } = useRehearsal({ script, userCharacter, similarityThreshold: threshold, initialLineIndex: startLineIndex, mode: rehearsalMode, ttsProvider, openaiVoiceAssignments });

    const handleStart = () => {
        setHasStarted(true);
        start();
    };

    // Updated Exit Handler
    const handleExit = () => {
        stop(); // Force stop audio/recognition
        onExit();
    };

    const isUserTurn = currentLine?.character === userCharacter;

    const getExampleStatus = (score: number) => score >= threshold;

    if (!hasStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 md:p-8 animate-in zoom-in-50 duration-500">
                <div className="w-full max-w-6xl space-y-6">

                    <div className="text-center space-y-2">
                        <img src="/repeto.png" alt="Repeto" className="w-16 h-16 mx-auto object-contain mb-4 drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            Réglages
                        </h2>
                        <p className="text-gray-400">Pour <span className="text-white font-medium">{userCharacter}</span></p>
                    </div>

                    {/* Settings Card - Full Width */}
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl">

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                            {/* LEFT COLUMN: Script Preview */}
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-gray-300 uppercase tracking-widest">Aperçu de la Pièce</label>
                                <div className="bg-black/30 rounded-2xl border border-white/5 p-3 md:p-4 h-[300px] md:h-[450px] overflow-y-auto custom-scrollbar space-y-3 md:space-y-4">
                                    {script.lines.slice(startLineIndex, startLineIndex + 20).map((line, idx) => {
                                        const isUser = line.character.includes(userCharacter);
                                        return (
                                            <div key={line.id} className={cn(
                                                "p-3 rounded-xl border transition-all",
                                                isUser
                                                    ? "bg-primary/10 border-primary/30"
                                                    : "bg-white/5 border-white/5"
                                            )}>
                                                <p className={cn(
                                                    "text-[10px] font-bold uppercase tracking-widest mb-1",
                                                    isUser ? "text-primary" : "text-gray-500"
                                                )}>
                                                    {line.character}
                                                </p>
                                                <p className={cn(
                                                    "text-sm",
                                                    isUser ? "text-white" : "text-gray-400 italic"
                                                )}>
                                                    {line.text.substring(0, 100)}{line.text.length > 100 ? "..." : ""}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: All Settings */}
                            <div className="space-y-6">

                                {/* Scene Selection - First for Preview Sync */}
                                {script.scenes && script.scenes.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-300 uppercase tracking-widest">Commencer à</label>
                                        <select
                                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                                            onChange={(e) => setStartLineIndex(parseInt(e.target.value))}
                                            value={startLineIndex}
                                        >
                                            <option value={0}>Début de la pièce</option>
                                            {script.scenes.map((scene) => (
                                                <option key={scene.index} value={scene.index}>
                                                    {scene.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Slider Section */}
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-end">
                                        <label className="text-sm font-medium text-gray-300 uppercase tracking-widest">Niveau d'exigence</label>
                                        <span className="text-xl font-bold text-primary">{Math.round(threshold * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.70"
                                        max="1.0"
                                        step="0.05"
                                        value={threshold}
                                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                                    />
                                    <div className="flex justify-between text-[10px] font-medium text-gray-500 uppercase tracking-widest px-1">
                                        <span>Débutant</span>
                                        <span>Intermédiaire</span>
                                        <span>Expert</span>
                                    </div>
                                </div>

                                {/* Tolerance Examples - Right after slider */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                                        <div className="text-[10px]">
                                            <span className="text-gray-500">Texte:</span> <span className="text-gray-200">"Je ne sais pas"</span>
                                            <span className="text-gray-500 ml-2">→</span> <span className="text-gray-300 italic">"Ch'ais pas"</span>
                                        </div>
                                        <div className={cn(
                                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                            getExampleStatus(0.75) ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                        )}>
                                            {getExampleStatus(0.75) ? "OK" : "KO"}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                                        <div className="text-[10px]">
                                            <span className="text-gray-500">Texte:</span> <span className="text-gray-200">"Il faut qu'on y aille"</span>
                                            <span className="text-gray-500 ml-2">→</span> <span className="text-gray-300 italic">"Faut qu'on y aille"</span>
                                        </div>
                                        <div className={cn(
                                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                            getExampleStatus(0.85) ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                        )}>
                                            {getExampleStatus(0.85) ? "OK" : "KO"}
                                        </div>
                                    </div>
                                </div>

                                {/* Rehearsal Mode Selection */}
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <label className="text-sm font-medium text-gray-300 uppercase tracking-widest">Mode de répétition</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: "full", label: "Intégrale" },
                                            { id: "cue", label: "Réplique" },
                                            { id: "check", label: "Rapide" }
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setRehearsalMode(m.id as typeof rehearsalMode)}
                                                className={cn(
                                                    "p-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all",
                                                    rehearsalMode === m.id
                                                        ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                                        : "bg-black/20 text-gray-400 border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-center text-gray-500 italic">
                                        {rehearsalMode === "full" && "Lecture de toutes les répliques."}
                                        {rehearsalMode === "cue" && "Lecture uniquement de la réplique avant la vôtre."}
                                        {rehearsalMode === "check" && "Aucune lecture, enchaînez vos répliques."}
                                    </p>
                                </div>

                                {/* TTS Provider Selection */}
                                {rehearsalMode !== "check" && (
                                    <div className="space-y-3 pt-4 border-t border-white/5">
                                        <label className="text-sm font-medium text-gray-300 uppercase tracking-widest">Voix</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setTtsProvider("browser")}
                                                className={cn(
                                                    "p-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all",
                                                    ttsProvider === "browser"
                                                        ? "bg-gray-700 text-white border-gray-600"
                                                        : "bg-black/20 text-gray-400 border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                🔊 Standard
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (isPremiumUnlocked) {
                                                        setTtsProvider("openai");
                                                    } else {
                                                        setShowUnlockModal(true);
                                                    }
                                                }}
                                                className={cn(
                                                    "p-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all flex items-center justify-center gap-1.5",
                                                    ttsProvider === "openai" && isPremiumUnlocked
                                                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                                        : !isPremiumUnlocked
                                                            ? "bg-black/30 text-gray-500 border-white/5 hover:bg-white/5 cursor-pointer"
                                                            : "bg-black/20 text-gray-400 border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                {isPremiumUnlocked ? (
                                                    <>
                                                        <Sparkles className="h-3 w-3" />
                                                        Premium (AI)
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="h-3 w-3" />
                                                        Premium
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-center text-gray-500 italic">
                                            {ttsProvider === "browser" && "Voix système gratuites."}
                                            {ttsProvider === "openai" && isPremiumUnlocked && "Voix OpenAI - Sélectionnez ci-dessous."}
                                            {!isPremiumUnlocked && ttsProvider !== "openai" && (
                                                <span className="text-emerald-400/60 cursor-pointer hover:underline" onClick={() => setShowUnlockModal(true)}>
                                                    Débloquer les voix Premium →
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                )}

                                {/* Voice Distribution Section */}
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <label className="text-sm font-medium text-gray-300 uppercase tracking-widest">
                                        Distribution des Voix {ttsProvider === "openai" && <span className="text-emerald-400">(AI)</span>}
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {["ASSISTANT", ...script.characters.filter(c => c !== userCharacter)].map((role) => {
                                            const assignedBrowserVoice = voiceAssignments[role];
                                            const assignedOpenaiVoice = openaiVoiceAssignments[role] || "nova";
                                            const isAssistant = role === "ASSISTANT";
                                            const label = isAssistant ? "Assistant" : role;

                                            const openaiVoices = [
                                                { id: "nova", label: "Nova ♀" },
                                                { id: "shimmer", label: "Shimmer ♀" },
                                                { id: "alloy", label: "Alloy" },
                                                { id: "echo", label: "Echo ♂" },
                                                { id: "onyx", label: "Onyx ♂" },
                                                { id: "fable", label: "Fable" },
                                            ];

                                            return (
                                                <div key={role} className="flex flex-col gap-1 bg-black/20 rounded-lg p-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase truncate">{label}</span>
                                                        {/* Browser voice test button */}
                                                        {ttsProvider === "browser" && assignedBrowserVoice && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const utt = new SpeechSynthesisUtterance("Bonjour !");
                                                                    utt.voice = assignedBrowserVoice;
                                                                    window.speechSynthesis.speak(utt);
                                                                }}
                                                                className="text-primary hover:text-white transition-colors"
                                                                title="Tester"
                                                            >
                                                                <Play className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                        {/* OpenAI voice test button */}
                                                        {ttsProvider === "openai" && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    testOpenAIVoice(role, assignedOpenaiVoice);
                                                                }}
                                                                disabled={testingVoice !== null}
                                                                className={cn(
                                                                    "text-emerald-400 hover:text-white transition-colors",
                                                                    testingVoice === role && "animate-pulse"
                                                                )}
                                                                title="Tester la voix AI"
                                                            >
                                                                {testingVoice === role ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <Play className="h-3 w-3" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Browser voices */}
                                                    {ttsProvider === "browser" && (
                                                        <select
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                            value={assignedBrowserVoice?.voiceURI || ""}
                                                            onChange={(e) => setVoiceForRole(role, e.target.value)}
                                                        >
                                                            {voices
                                                                .filter(v => v.lang.startsWith("fr"))
                                                                .filter(v => !v.name.toLowerCase().includes("compact") && !v.name.toLowerCase().includes("espeak"))
                                                                .map(v => (
                                                                    <option key={v.voiceURI} value={v.voiceURI}>
                                                                        {v.name.replace("Google", "").replace("Microsoft", "").trim()}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    )}

                                                    {/* OpenAI voices */}
                                                    {ttsProvider === "openai" && (
                                                        <select
                                                            className="w-full bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-1.5 text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                            value={assignedOpenaiVoice}
                                                            onChange={(e) => setOpenaiVoiceAssignments(prev => ({
                                                                ...prev,
                                                                [role]: e.target.value as OpenAIVoice
                                                            }))}
                                                        >
                                                            {openaiVoices.map(v => (
                                                                <option key={v.id} value={v.id}>
                                                                    {v.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-white/5">
                        <Button size="lg" onClick={handleStart} className="flex-1 text-lg font-bold py-6 rounded-2xl shadow-[0_0_30px_rgba(var(--primary),0.4)] bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] transition-all active:scale-95">
                            <Play className="mr-3 h-6 w-6 fill-current" />
                            COMMENCER
                        </Button>

                        <Button variant="ghost" onClick={onExit} className="text-sm text-gray-500 hover:text-white hover:bg-transparent">
                            Retour au menu
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="w-full h-[100dvh] flex flex-col overflow-hidden max-w-3xl mx-auto md:h-[80vh] md:rounded-2xl md:border md:border-white/5 md:bg-black/20 md:backdrop-blur-sm">
                {/* Header / Status Bar */}
                <div className="flex-none flex justify-between items-center p-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2">
                        <img src="/repeto.png" alt="Repeto" className="w-8 h-8 object-contain opacity-80" />
                        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest hidden md:inline">
                            Repeto
                        </span>
                        <span className="text-xs font-mono text-gray-600 uppercase tracking-widest ml-2">
                            Ligne {currentLineIndex + 1} / {script.lines.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePause}
                            className={cn("h-8 w-8 hover:bg-white/10", isPaused ? "text-yellow-400" : "text-gray-400")}
                        >
                            {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
                        </Button>

                        <Button variant="ghost" size="sm" onClick={handleExit} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30">
                            <Power className="h-3 w-3 mr-1" />
                            QUITTER
                        </Button>
                    </div>
                </div>

                {/* Main Script View */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth pb-32">
                    {/* Show previous context (last 2 lines) */}
                    {script.lines.slice(Math.max(0, currentLineIndex - 2), currentLineIndex).map((line) => (
                        <div key={line.id} className="opacity-40 blur-[0.5px] scale-95 origin-left conversation-line">
                            <p className="text-[10px] md:text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">{line.character}</p>
                            <p className="text-sm md:text-base text-gray-300">{line.text}</p>
                        </div>
                    ))}

                    {/* Current Active Line */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentLine?.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className={cn(
                                "relative p-4 md:p-6 rounded-xl md:rounded-2xl border transition-colors duration-500",
                                isUserTurn
                                    ? "bg-primary/10 border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.15)]"
                                    : "bg-white/5 border-white/10"
                            )}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={cn(
                                    "text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full",
                                    isUserTurn ? "bg-primary text-white" : "bg-gray-700 text-gray-300"
                                )}>
                                    {currentLine?.character}
                                </span>
                                {status === "listening_user" && (
                                    <div className="flex items-center gap-2 text-primary animate-pulse">
                                        <div className="h-2 w-2 rounded-full bg-current" />
                                        <span className="text-[10px] font-bold uppercase">Je vous écoute</span>
                                    </div>
                                )}
                                {status === "error" && (
                                    <div className="flex items-center gap-2 text-red-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="text-[10px] font-bold uppercase">Problème</span>
                                    </div>
                                )}
                                {status === "paused" && (
                                    <div className="flex items-center gap-2 text-yellow-400">
                                        <Pause className="h-4 w-4 fill-current" />
                                        <span className="text-[10px] font-bold uppercase">En Pause</span>
                                    </div>
                                )}
                                {status === "playing_other" && (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <div className="h-2 w-2 rounded-full bg-current animate-bounce" />
                                        <span className="text-[10px] uppercase">Lecture...</span>
                                    </div>
                                )}
                            </div>

                            <p className={cn(
                                "text-xl md:text-3xl font-medium leading-relaxed",
                                isUserTurn ? "text-white" : "text-gray-300 italic",
                                status === "paused" && "opacity-50 blur-[1px] transition-all"
                            )}>
                                {currentLine?.text}
                            </p>

                            {/* Feedback UI */}
                            {status === "paused" && (
                                <div className="mt-6 flex flex-col items-center justify-center py-8 text-yellow-400/50">
                                    <Pause className="w-12 h-12 mb-2 opacity-50" />
                                    <p className="text-sm font-medium uppercase tracking-widest">Répétition en pause</p>
                                </div>
                            )}

                            {status === "error" && (
                                <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex flex-col gap-3">
                                    <div className="flex items-center gap-3 text-red-200">
                                        <img src="/repeto.png" alt="Sad Repeto" className="w-10 h-10 opacity-80 grayscale contrast-125" />
                                        <p className="text-sm font-medium">Je ne vous entends pas...</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button size="sm" variant="destructive" onClick={retry} className="w-full">
                                            Réessayer
                                        </Button>
                                        <Button size="sm" variant="outline" className="w-full border-red-500/30 hover:bg-red-500/20 text-red-200" onClick={validateManually}>
                                            Passer
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {feedback === "incorrect" && (
                                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 flex gap-4 items-start">
                                    <img src="/repeto.png" alt="Repeto" className="w-12 h-12 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    <div>
                                        <div className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wide mb-1">
                                            Pas tout à fait...
                                        </div>
                                        <p className="text-sm text-red-200/80">Vous avez dit : <span className="italic text-white">"{lastTranscript}"</span></p>
                                    </div>
                                </div>
                            )}

                            {feedback === "correct" && (
                                <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-4 text-green-400">
                                    <img src="/repeto.png" alt="Happy Repeto" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <p className="text-sm font-bold uppercase tracking-wide">Excellent !</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Show next preview (1 line) */}
                    {script.lines.slice(currentLineIndex + 1, currentLineIndex + 2).map((line) => (
                        <div key={line.id} className="opacity-30 scale-90 origin-left mt-8">
                            <p className="text-[10px] md:text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">{line.character}</p>
                            <p className="text-sm md:text-base text-gray-500 truncate">{line.text}</p>
                        </div>
                    ))}
                </div>

                {/* Controls Fixed Bottom */}
                <div className="flex-none p-6 pb-8 md:p-6 flex items-center justify-center gap-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20 absolute bottom-0 left-0 right-0 md:relative md:bg-none md:border-t md:border-white/5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={previous}
                        className="h-12 w-12 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        <SkipBack className="h-6 w-6" />
                    </Button>

                    {status === "listening_user" ? (
                        <div className="flex flex-col items-center gap-2 relative">
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-primary/30 blur-3xl animate-pulse rounded-full" />

                            <Button
                                variant="default"
                                size="icon"
                                className="relative h-20 w-20 rounded-full bg-primary hover:bg-primary/90 shadow-2xl border-4 border-black/50 transform active:scale-95 transition-all"
                                onClick={validateManually}
                            >
                                <Mic className="h-8 w-8 text-white" />
                            </Button>
                            <span className="absolute -bottom-8 whitespace-nowrap text-[10px] font-medium text-gray-500 uppercase tracking-widest opacity-60">
                                Appuyer pour valider
                            </span>
                        </div>
                    ) : (
                        <div className="h-20 w-20 flex items-center justify-center rounded-full border border-white/10 bg-white/5">
                            <div className="h-2 w-2 rounded-full bg-gray-600 animate-pulse" />
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={skip}
                        className="h-12 w-12 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        <SkipForward className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* Premium Unlock Modal */}
            <AnimatePresence>
                {showUnlockModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setShowUnlockModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gradient-to-br from-gray-900 to-gray-950 border border-emerald-500/30 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-emerald-400" />
                                    <h3 className="text-lg font-bold text-white">Débloquer Premium</h3>
                                </div>
                                <button
                                    onClick={() => setShowUnlockModal(false)}
                                    className="text-gray-500 hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <p className="text-gray-400 text-sm mb-4">
                                Entrez votre code pour débloquer les voix Premium OpenAI.
                            </p>

                            <input
                                type="text"
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                value={unlockCode}
                                onChange={(e) => {
                                    setUnlockCode(e.target.value.toUpperCase());
                                    setUnlockError(false);
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                                className={cn(
                                    "w-full bg-black/50 border rounded-xl p-3 text-white text-center font-mono tracking-widest placeholder:text-gray-600 focus:outline-none focus:ring-2",
                                    unlockError
                                        ? "border-red-500 focus:ring-red-500/50"
                                        : "border-white/10 focus:ring-emerald-500/50"
                                )}
                            />

                            {unlockError && (
                                <p className="text-red-400 text-xs mt-2 text-center">
                                    Code invalide. Vérifiez votre code et réessayez.
                                </p>
                            )}

                            <button
                                onClick={handleUnlock}
                                className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg"
                            >
                                Débloquer
                            </button>

                            <p className="text-gray-600 text-[10px] text-center mt-3">
                                Pas de code ? Contactez le support.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
