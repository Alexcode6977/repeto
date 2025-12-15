"use client";

import { useState, useEffect, useRef } from "react";
import { ScriptLine, ParsedScript } from "@/lib/types";
import { useRehearsal } from "@/lib/hooks/use-rehearsal";
import { synthesizeSpeech } from "@/app/actions/tts";
import { getVoiceStatus, unlockPremium } from "@/app/actions/voice";
import { Button } from "./ui/button";
import { Mic, Play, SkipForward, SkipBack, AlertTriangle, Pause, Power, Loader2, Sparkles, X, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FeedbackModal, FeedbackData } from "./feedback-modal";
import { submitFeedback } from "@/app/(protected)/dashboard/feedback-actions";

// Helper for Portals
const Portal = ({ children }: { children: React.ReactNode }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    // Use document.body directly to bypass any framework wrappers
    return typeof document !== "undefined"
        ? require("react-dom").createPortal(children, document.body)
        : null;
};

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

    // Premium / Credits State
    const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
    const [credits, setCredits] = useState(0);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [unlockCode, setUnlockCode] = useState("");
    const [unlockError, setUnlockError] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Fetch Premium Status on Mount
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const status = await getVoiceStatus();
                setIsPremiumUnlocked(status.isPremium);
                setCredits(status.credits);
            } catch (error) {
                console.error("Failed to fetch voice status", error);
            } finally {
                setIsLoadingStatus(false);
            }
        };
        fetchStatus();
    }, []);

    // Function to unlock premium via Server Action
    const handleUnlock = async () => {
        setIsUnlocking(true);
        setUnlockError(false);
        try {
            const result = await unlockPremium(unlockCode);
            if (result.success) {
                setIsPremiumUnlocked(true);
                setShowUnlockModal(false);
                setTtsProvider("openai"); // Auto-switch to premium
            } else {
                setUnlockError(true);
            }
        } catch (e) {
            console.error(e);
            setUnlockError(true);
        } finally {
            setIsUnlocking(false);
        }
    };

    // Line Visibility State
    const [lineVisibility, setLineVisibility] = useState<"visible" | "hint" | "hidden">("visible");

    // OpenAI voice assignments per character
    type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    const [openaiVoiceAssignments, setOpenaiVoiceAssignments] = useState<Record<string, OpenAIVoice>>({});
    const [testingVoice, setTestingVoice] = useState<string | null>(null);  // Track which role is being tested

    // Function to test OpenAI voice
    const testOpenAIVoice = async (role: string, voice: OpenAIVoice) => {
        setTestingVoice(role);
        try {
            const result = await synthesizeSpeech("Bonjour, je suis votre partenaire de répétition !", voice);

            if ("error" in result) {
                if (result.error === "QUOTA_EXCEEDED") {
                    setShowUnlockModal(true);
                } else {
                    console.error("TTS Error:", result.error);
                }
                setTestingVoice(null);
                return;
            }

            if ("audio" in result) {
                const audio = new Audio(result.audio);
                audio.onended = () => setTestingVoice(null);
                await audio.play();
                // Optimistically update credits
                if (!isPremiumUnlocked) {
                    setCredits(prev => Math.max(0, prev - 1));
                }
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
        sessionStartRef.current = Date.now();
        start();
    };

    // Session tracking
    const sessionStartRef = useRef<number>(Date.now());
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [pendingExit, setPendingExit] = useState(false);

    // Calculate session stats
    const getSessionStats = () => {
        const durationSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const userLines = script.lines.filter(l => l.character === userCharacter);
        const completionPercentage = userLines.length > 0
            ? Math.round((currentLineIndex / script.lines.length) * 100)
            : 0;

        return {
            scriptTitle: script.title || "Script sans titre",
            characterName: userCharacter,
            durationSeconds,
            linesRehearsed: currentLineIndex,
            completionPercentage,
            settings: {
                textMode: lineVisibility,
                rehearsalMode,
                threshold,
                ttsProvider,
            },
        };
    };

    // Updated Exit Handler - Shows feedback modal first
    const handleExit = () => {
        stop(); // Force stop audio/recognition
        if (hasStarted && currentLineIndex > 0) {
            // Only show feedback if they actually rehearsed something
            setShowFeedbackModal(true);
            setPendingExit(true);
        } else {
            onExit();
        }
    };

    // Handle feedback submission
    const handleFeedbackSubmit = async (feedbackData: FeedbackData) => {
        const sessionStats = getSessionStats();
        await submitFeedback({
            scriptId: (script as any).id,
            ...sessionStats,
            rating: feedbackData.rating,
            whatWorked: feedbackData.whatWorked,
            whatDidntWork: feedbackData.whatDidntWork,
            improvementIdeas: feedbackData.improvementIdeas,
        });
    };

    // Handle modal close
    const handleFeedbackClose = () => {
        setShowFeedbackModal(false);
        if (pendingExit) {
            onExit();
        }
    };

    // AUTO-TRIGGER: Detect when script is finished and show feedback
    useEffect(() => {
        if (status === "finished" && hasStarted && !showFeedbackModal) {
            // Script completed! Show feedback modal
            stop();
            setShowFeedbackModal(true);
            setPendingExit(true);
        }
    }, [status, hasStarted, showFeedbackModal, stop]);

    const isUserTurn = currentLine?.character === userCharacter;

    const getExampleStatus = (score: number) => score >= threshold;

    // Helper for visibility masking
    const getVisibleText = (text: string | undefined, isUser: boolean) => {
        if (!text) return "";
        if (!isUser || lineVisibility === "visible") return text;

        if (lineVisibility === "hint") {
            const words = text.split(" ");
            if (words.length <= 2) return text;
            return `${words[0]} ${words[1]} ...`;
        }

        // Hidden
        return "..............."; // Visual placeholder
    };

    if (!hasStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 md:p-8 animate-in zoom-in-95 duration-500 overflow-y-auto w-full">
                <div className="w-full max-w-md md:max-w-4xl space-y-8 flex flex-col items-center">

                    {/* Header - Minimalist */}
                    <div className="text-center space-y-4 pt-10 md:pt-0">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-glow" />
                            <img src="/repeto.png" alt="Repeto" className="relative w-24 h-24 md:w-28 md:h-28 mx-auto object-contain drop-shadow-2xl" />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                                En scène
                            </h2>
                            <p className="text-gray-400 text-lg">Vous jouez <span className="text-white font-bold">{userCharacter}</span></p>
                        </div>
                    </div>

                    {/* Settings Container - Clean Stack */}
                    <div className="w-full space-y-6 md:space-y-8 px-2 md:px-0">
                        {/* 1. Start Point */}
                        {script.scenes && script.scenes.length > 0 && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Départ</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
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

                        {/* 2. Text Visibility - Big Toggles */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Vos Répliques</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: "visible", label: "Visibles" },
                                    { id: "hint", label: "Indices" },
                                    { id: "hidden", label: "Cachées" }
                                ].map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setLineVisibility(v.id as typeof lineVisibility)}
                                        className={cn(
                                            "py-4 rounded-2xl text-sm font-bold transition-all touch-manipulation",
                                            lineVisibility === v.id
                                                ? "bg-white text-black shadow-lg scale-105"
                                                : "bg-white/5 text-gray-400 border border-white/5 active:scale-95"
                                        )}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Rehearsal Mode */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Mode de lecture</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: "full", label: "Intégrale", sub: "Tout le cast" },
                                    { id: "cue", label: "Réplique", sub: "Juste avant vous" },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setRehearsalMode(m.id as typeof rehearsalMode)}
                                        className={cn(
                                            "p-4 rounded-2xl text-left transition-all touch-manipulation border",
                                            rehearsalMode === m.id
                                                ? "bg-primary/20 border-primary/50"
                                                : "bg-white/5 border-white/5 active:scale-95"
                                        )}
                                    >
                                        <span className={cn("block text-sm font-bold mb-1", rehearsalMode === m.id ? "text-white" : "text-gray-300")}>{m.label}</span>
                                        <span className="block text-[10px] text-gray-500 uppercase tracking-wider">{m.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Start Button - Massive */}
                        <Button
                            size="lg"
                            onClick={handleStart}
                            className="w-full text-xl font-bold py-8 rounded-[2rem] shadow-[0_0_40px_rgba(124,58,237,0.4)] bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] transition-all active:scale-95 mt-4 animate-in-up"
                            style={{ animationDelay: "200ms" }}
                        >
                            <Play className="mr-3 h-8 w-8 fill-current" />
                            COMMENCER
                        </Button>

                        <div className="text-center pb-8">
                            <button onClick={onExit} className="text-sm font-medium text-gray-500 hover:text-white transition-colors underline decoration-transparent hover:decoration-white/30 underline-offset-4">
                                Retour au menu
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Outer Responsive Wrapper */}
            <div className="fixed inset-0 bg-black/95 md:bg-black/80 md:backdrop-blur-xl flex items-center justify-center z-50">
                {/* Mobile: Full Screen | Desktop: Centered Card */}
                <div className="w-full h-[100dvh] md:h-[85vh] md:max-w-3xl md:rounded-3xl md:border md:border-white/10 md:shadow-2xl md:bg-black/40 md:backdrop-blur-sm flex flex-col overflow-hidden bg-black text-white relative transition-all duration-300">

                    {/* Background Ambient Glow */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                    {/* Header / Status Bar - Minimalist Transparent */}
                    <div className="flex-none flex justify-between items-center p-6 z-10">
                        <div className="flex items-center gap-3">
                            <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border", isPaused ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-white/5 text-gray-400 border-white/10")}>
                                {isPaused ? "Pause" : `Ligne ${currentLineIndex + 1}`}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={togglePause} className="text-gray-400 hover:text-white p-2">
                                {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6" />}
                            </button>
                            <button onClick={handleExit} className="text-gray-400 hover:text-red-400 p-2">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Main Script View - Central Focus */}
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 relative">

                        {/* Previous Line Context (Faded) */}
                        <div className="space-y-4 w-full opacity-30 blur-[1px] transition-all duration-500 min-h-[60px] flex flex-col justify-end">
                            {script.lines.slice(Math.max(0, currentLineIndex - 1), currentLineIndex).map((line) => (
                                <div key={line.id} className="text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">{line.character}</p>
                                    <p className="text-lg leading-tight font-serif text-gray-300">{getVisibleText(line.text, line.character === userCharacter)}</p>
                                </div>
                            ))}
                        </div>

                        {/* ACTIVE LINE - HERO */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentLine?.id}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="w-full text-center relative z-20"
                            >
                                <span className={cn(
                                    "inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-lg",
                                    isUserTurn
                                        ? "bg-white text-black"
                                        : "bg-gray-800 text-gray-400 border border-gray-700"
                                )}>
                                    {currentLine?.character}
                                </span>

                                <p className={cn(
                                    "text-3xl md:text-5xl font-bold leading-tight md:leading-snug transition-all duration-300",
                                    isUserTurn ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-gray-400 font-serif italic"
                                )}>
                                    {status === "listening_user" && (
                                        <span className="absolute -left-4 md:-left-8 top-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                    )}
                                    {getVisibleText(currentLine?.text, isUserTurn)}
                                </p>

                                {/* Error State Message */}
                                {status === "error" && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm font-medium mt-4 uppercase tracking-wider flex items-center justify-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Je ne vous entends pas
                                    </motion.p>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Next Line Preview (Faded) */}
                        <div className="w-full opacity-20 scale-95 min-h-[40px]">
                            {script.lines.slice(currentLineIndex + 1, currentLineIndex + 2).map((line) => (
                                <div key={line.id} className="text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">{line.character}</p>
                                    <p className="text-base truncate font-serif text-gray-400">{getVisibleText(line.text, line.character === userCharacter)}</p>
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* Controls - Bottom Layout */}
                    <div className="flex-none pb-12 pt-4 px-8 flex items-center justify-between relative z-30">

                        {/* Back Button */}
                        <button
                            onClick={previous}
                            className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-90 transition-all"
                        >
                            <SkipBack className="w-6 h-6" />
                        </button>

                        {/* CENTRAL ORB - MIC / ACTION */}
                        <div className="relative group">
                            {/* Living Glow */}
                            <div className={cn(
                                "absolute inset-0 bg-primary blur-2xl rounded-full transition-all duration-500",
                                status === "listening_user" ? "opacity-60 scale-150 animate-pulse-glow" : "opacity-0 scale-100"
                            )} />

                            <button
                                onClick={validateManually}
                                className={cn(
                                    "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl border-4",
                                    isUserTurn
                                        ? "bg-white border-white scale-110 shadow-[0_0_50px_rgba(255,255,255,0.4)]"
                                        : "bg-gray-900 border-gray-800 text-gray-500"
                                )}
                            >
                                {status === "listening_user" ? (
                                    <Mic className="w-10 h-10 text-black animate-pulse" />
                                ) : status === "playing_other" ? (
                                    <div className="flex gap-1 h-8 items-center">
                                        <div className="w-1.5 h-8 bg-primary rounded-full animate-[bounce_1s_infinite_0ms]" />
                                        <div className="w-1.5 h-6 bg-primary rounded-full animate-[bounce_1s_infinite_200ms]" />
                                        <div className="w-1.5 h-8 bg-primary rounded-full animate-[bounce_1s_infinite_400ms]" />
                                    </div>
                                ) : (
                                    <Play className="w-10 h-10 ml-1" />
                                )}
                            </button>

                            {isUserTurn && (
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-white/50 whitespace-nowrap">
                                    Appuyer pour valider
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {/* Premium Unlock Modal */}
            {
                showUnlockModal && (
                    <Portal>
                        <div
                            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
                            onClick={() => setShowUnlockModal(false)}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-gray-950 border border-emerald-500/30 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-in zoom-in-95 duration-200"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                            <Sparkles className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Débloquer Premium</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowUnlockModal(false)}
                                        className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    Vous n'avez plus de crédits gratuits (50). Entrez votre code d'accès pour débloquer les voix AI neuronales en illimité.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Code d'accès</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="SCEN3-..."
                                            value={unlockCode}
                                            onChange={(e) => {
                                                setUnlockCode(e.target.value.toUpperCase());
                                                setUnlockError(false);
                                            }}
                                            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                                            className={cn(
                                                "w-full bg-black/50 border rounded-xl p-4 text-white text-center font-mono text-lg tracking-widest placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black transition-all",
                                                unlockError
                                                    ? "border-red-500 focus:ring-red-500/50"
                                                    : "border-white/10 focus:ring-emerald-500/50"
                                            )}
                                        />
                                    </div>

                                    {unlockError && (
                                        <div className="flex items-center gap-2 justify-center text-red-400 bg-red-500/10 p-2 rounded-lg">
                                            <AlertTriangle className="h-3 w-3" />
                                            <p className="text-xs font-medium">Code invalide ou erreur</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleUnlock}
                                        disabled={isUnlocking}
                                        className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                                    >
                                        {isUnlocking && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {isUnlocking ? "Vérification..." : "Débloquer"}
                                    </button>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/5">
                                    <p className="text-gray-600 text-[10px] text-center">
                                        Besoin d'un code ? <a href="#" className="text-gray-400 underline hover:text-emerald-400">Contactez le support</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Portal>
                )
            }

            {/* Feedback Modal */}
            <FeedbackModal
                isOpen={showFeedbackModal}
                onClose={handleFeedbackClose}
                onSubmit={handleFeedbackSubmit}
                sessionData={getSessionStats()}
            />
        </>
    );
}
