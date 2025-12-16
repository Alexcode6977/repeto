"use client";

import { useState, useEffect, useRef } from "react";
import { ScriptLine, ParsedScript } from "@/lib/types";
import { useRehearsal } from "@/lib/hooks/use-rehearsal";
import { synthesizeSpeech } from "@/app/actions/tts";
import { getVoiceStatus } from "@/app/actions/voice";
import { Button } from "./ui/button";
import { Mic, Play, SkipForward, SkipBack, AlertTriangle, Pause, Power, Loader2, Sparkles, X, Coins, Lock } from "lucide-react";
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
    const [ttsProvider, setTtsProvider] = useState<"browser" | "openai" | null>(null);

    // Premium / Credits State
    const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

    const [isLoadingStatus, setIsLoadingStatus] = useState(true);



    // Local browser voices state (available before rehearsal starts)
    const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [localVoiceAssignments, setLocalVoiceAssignments] = useState<Record<string, SpeechSynthesisVoice | null>>({});

    // Load browser voices on mount
    useEffect(() => {
        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();
            const frenchVoices = allVoices.filter(v => v.lang.startsWith("fr"));
            setBrowserVoices(frenchVoices.length > 0 ? frenchVoices : allVoices);

            // Initialize voice assignments for each character (excluding user)
            if (script.characters && frenchVoices.length > 0) {
                const assignments: Record<string, SpeechSynthesisVoice | null> = {};
                script.characters.filter(c => c !== userCharacter).forEach((char, idx) => {
                    assignments[char] = frenchVoices[idx % frenchVoices.length] || null;
                });
                setLocalVoiceAssignments(assignments);
            }
        };

        // Voices may load async
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [script.characters, userCharacter]);

    // Function to set voice for a character (local state)
    const setLocalVoiceForRole = (char: string, voiceURI: string) => {
        const voice = browserVoices.find(v => v.voiceURI === voiceURI) || null;
        setLocalVoiceAssignments(prev => ({ ...prev, [char]: voice }));
    };

    // Test browser voice
    const testBrowserVoice = (char: string) => {
        const voice = localVoiceAssignments[char];
        if (voice) {
            window.speechSynthesis.cancel();
            const ut = new SpeechSynthesisUtterance("Bonjour, je suis prêt.");
            ut.voice = voice;
            window.speechSynthesis.speak(ut);
        }
    };

    // Fetch Premium Status on Mount
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const status = await getVoiceStatus();
                setIsPremiumUnlocked(status.isPremium);
            } catch (error) {
                console.error("Failed to fetch voice status", error);
            } finally {
                setIsLoadingStatus(false);
            }
        };
        fetchStatus();
    }, []);



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
                console.error("TTS Error:", result.error);
                setTestingVoice(null);
                return;
            }

            if ("audio" in result) {
                const audio = new Audio(result.audio);
                audio.onended = () => setTestingVoice(null);
                await audio.play();
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
    } = useRehearsal({ script, userCharacter, similarityThreshold: threshold, initialLineIndex: startLineIndex, mode: rehearsalMode, ttsProvider: ttsProvider || "browser", openaiVoiceAssignments });

    const handleStart = () => {
        setHasStarted(true);
        sessionStartRef.current = Date.now();
        start();
    };

    // Session tracking
    const sessionStartRef = useRef<number>(Date.now());
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [pendingExit, setPendingExit] = useState(false);

    // Animation states for success/error feedback
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [showErrorAnimation, setShowErrorAnimation] = useState(false);
    const prevLineIndex = useRef(currentLineIndex);
    const prevStatus = useRef(status);

    // Progress calculations
    const totalLines = script.lines.length;
    const progressPercent = totalLines > 0 ? Math.round((currentLineIndex / totalLines) * 100) : 0;

    // Current scene detection
    const currentScene = script.scenes?.find((scene, idx) => {
        const nextScene = script.scenes?.[idx + 1];
        return currentLineIndex >= scene.index && (!nextScene || currentLineIndex < nextScene.index);
    });

    // Next line preview
    const nextLine = script.lines[currentLineIndex + 1];

    // Detect success/error for animations
    useEffect(() => {
        // Success: line advanced
        if (currentLineIndex > prevLineIndex.current && prevStatus.current === "listening_user") {
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 800);
        }
        prevLineIndex.current = currentLineIndex;
    }, [currentLineIndex]);

    useEffect(() => {
        // Error: status changed to error
        if (status === "error" && prevStatus.current !== "error") {
            setShowErrorAnimation(true);
            setTimeout(() => setShowErrorAnimation(false), 600);
        }
        prevStatus.current = status;
    }, [status]);

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

    // DEBUG: Log characters and state
    console.log("[RehearsalMode] ttsProvider:", ttsProvider, "isPremiumUnlocked:", isPremiumUnlocked);
    console.log("[RehearsalMode] script.characters:", script.characters);
    console.log("[RehearsalMode] browserVoices:", browserVoices.length);

    if (!hasStarted) {
        // Get a sample user line for preview
        const sampleUserLine = script.lines.find(l => l.character === userCharacter);
        const sampleOtherLine = script.lines.find(l => l.character !== userCharacter);

        return (
            <div className="flex flex-col lg:flex-row min-h-[100dvh] w-full animate-in fade-in duration-500 bg-gradient-to-br from-black via-gray-900/50 to-black">

                {/* LEFT PANEL - Live Preview */}
                <div className="lg:w-[40%] flex flex-col items-center justify-start pt-12 lg:pt-20 p-6 lg:p-8 lg:border-r border-white/5 order-2 lg:order-1">
                    {/* Logo & Character */}
                    <div className="text-center space-y-4 mb-8">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-glow" />
                            <img src="/repeto.png" alt="Repeto" className="relative w-20 h-20 mx-auto object-contain drop-shadow-2xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">En scène</h2>
                            <p className="text-gray-400 text-sm">Vous jouez <span className="text-yellow-400 font-bold">{userCharacter}</span></p>
                        </div>
                    </div>

                    {/* Preview Card - Glassmorphism */}
                    <div className="w-full max-w-md space-y-6">
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aperçu</span>
                        </div>

                        {/* Preview Container */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 transition-all duration-500">
                            {/* Other character line example */}
                            {sampleOtherLine && (
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 transition-all duration-300">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                        {sampleOtherLine.character}
                                    </p>
                                    <p className="text-gray-400 text-sm font-serif">
                                        {sampleOtherLine.text.substring(0, 80)}...
                                    </p>
                                </div>
                            )}

                            {/* User line example - Animated based on visibility */}
                            {sampleUserLine && (
                                <div
                                    key={lineVisibility}
                                    className={cn(
                                        "p-4 rounded-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-2",
                                        lineVisibility === "visible"
                                            ? "bg-yellow-500/15 border-2 border-yellow-500/50"
                                            : lineVisibility === "hint"
                                                ? "bg-orange-500/10 border-2 border-orange-500/30"
                                                : "bg-gray-800/50 border-2 border-gray-700/50"
                                    )}
                                >
                                    <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                        {userCharacter} (Vous)
                                    </p>
                                    <p className={cn(
                                        "text-lg font-serif transition-all duration-500",
                                        lineVisibility === "visible"
                                            ? "text-yellow-100"
                                            : lineVisibility === "hint"
                                                ? "text-orange-200"
                                                : "text-gray-500"
                                    )}>
                                        {getVisibleText(sampleUserLine.text.substring(0, 100), true)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Mode indicators */}
                        <div className="flex justify-center gap-4 text-[10px] text-gray-500">
                            <span className={cn("transition-colors", lineVisibility === "visible" && "text-yellow-400 font-bold")}>
                                👁️ Visible
                            </span>
                            <span className={cn("transition-colors", lineVisibility === "hint" && "text-orange-400 font-bold")}>
                                💡 Indice
                            </span>
                            <span className={cn("transition-colors", lineVisibility === "hidden" && "text-gray-400 font-bold")}>
                                🙈 Caché
                            </span>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL - Settings */}
                <div className="lg:w-[60%] flex flex-col p-6 lg:p-8 lg:py-12 overflow-y-auto order-1 lg:order-2">
                    {/* Stepper */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {[
                            { num: 1, label: "Scène", icon: "🎬" },
                            { num: 2, label: "Texte", icon: "📝" },
                            { num: 3, label: "Voix", icon: "🎙️" },
                            { num: 4, label: "Go!", icon: "🚀" }
                        ].map((step, i) => (
                            <div key={step.num} className="flex items-center">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                                    i === 0 ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-white/5 text-gray-500"
                                )}>
                                    {step.icon}
                                </div>
                                {i < 3 && <div className="w-4 h-[2px] bg-white/10 mx-1" />}
                            </div>
                        ))}
                    </div>

                    {/* Settings Cards */}
                    <div className="space-y-6 max-w-md mx-auto w-full">

                        {/* Card 1: Scene Selection */}
                        {script.scenes && script.scenes.length > 0 && (
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-lg transition-all hover:bg-white/[0.07]">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">🎬 Point de départ</label>
                                <select
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
                                    onChange={(e) => setStartLineIndex(parseInt(e.target.value))}
                                    value={startLineIndex}
                                >
                                    <option value={0}>Début de la pièce</option>
                                    {script.scenes.map((scene) => (
                                        <option key={scene.index} value={scene.index}>{scene.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Card 2: Text Visibility */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-lg transition-all hover:bg-white/[0.07]">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">📝 Vos Répliques</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "visible", label: "Visibles", emoji: "👁️" },
                                    { id: "hint", label: "Indices", emoji: "💡" },
                                    { id: "hidden", label: "Cachées", emoji: "🙈" }
                                ].map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setLineVisibility(v.id as typeof lineVisibility)}
                                        className={cn(
                                            "py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 touch-manipulation flex flex-col items-center gap-1",
                                            lineVisibility === v.id
                                                ? "bg-white text-black shadow-lg scale-105"
                                                : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 active:scale-95"
                                        )}
                                    >
                                        <span className="text-lg">{v.emoji}</span>
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card 3: Rehearsal Mode */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-lg transition-all hover:bg-white/[0.07]">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">🎭 Mode de répétition</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "full", label: "Intégrale", sub: "Tout le cast" },
                                    { id: "cue", label: "Réplique", sub: "Juste avant" },
                                    { id: "check", label: "Filage", sub: "Rapide" },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setRehearsalMode(m.id as typeof rehearsalMode)}
                                        className={cn(
                                            "p-3 rounded-xl text-left transition-all duration-300 touch-manipulation border",
                                            rehearsalMode === m.id
                                                ? "bg-primary/20 border-primary/50 shadow-lg shadow-primary/10"
                                                : "bg-white/5 border-white/5 hover:bg-white/10 active:scale-95"
                                        )}
                                    >
                                        <span className={cn("block text-xs font-bold mb-0.5", rehearsalMode === m.id ? "text-white" : "text-gray-300")}>{m.label}</span>
                                        <span className="block text-[9px] text-gray-500 leading-tight">{m.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card 4: Voice Settings - Collapsible Logic */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">🎙️ Voix de lecture</label>

                            {/* TTS Provider Selector - Always visible */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setTtsProvider("browser")}
                                    className={cn(
                                        "py-3 rounded-xl text-xs font-bold transition-all border",
                                        ttsProvider === "browser"
                                            ? "bg-white/10 border-white/30 text-white"
                                            : "bg-transparent border-white/5 text-gray-500 hover:bg-white/5"
                                    )}
                                >
                                    Standard
                                </button>
                                <button
                                    onClick={() => isPremiumUnlocked && setTtsProvider("openai")}
                                    disabled={!isPremiumUnlocked}
                                    className={cn(
                                        "py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2",
                                        ttsProvider === "openai"
                                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                            : !isPremiumUnlocked
                                                ? "bg-transparent border-white/5 text-gray-600 cursor-not-allowed opacity-60"
                                                : "bg-transparent border-white/5 text-gray-500 hover:bg-white/5"
                                    )}
                                >
                                    {!isPremiumUnlocked ? <Lock className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                    Neural AI {!isPremiumUnlocked && "(Admin)"}
                                </button>
                            </div>

                            {/* Voice Distribution - Only shown when a provider is selected */}
                            {ttsProvider === "browser" && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Distribution des rôles</span>
                                    {script.characters && script.characters.filter(c => c !== userCharacter).length > 0 ? (
                                        <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                            {script.characters.filter(c => c !== userCharacter).map((char) => (
                                                <div key={char} className="flex items-center gap-2 bg-black/30 p-2 rounded-lg">
                                                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-300 shrink-0">
                                                        {char.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-300 truncate">{char}</p>
                                                        <select
                                                            className="w-full bg-transparent text-[10px] text-gray-500 focus:outline-none cursor-pointer"
                                                            value={localVoiceAssignments[char]?.voiceURI || ""}
                                                            onChange={(e) => setLocalVoiceForRole(char, e.target.value)}
                                                        >
                                                            {browserVoices.map(v => (
                                                                <option key={v.voiceURI} value={v.voiceURI} className="bg-black text-white">
                                                                    {v.name}
                                                                </option>
                                                            ))}
                                                            {browserVoices.length === 0 && <option className="bg-black text-white">Défaut (Navigateur)</option>}
                                                        </select>
                                                    </div>
                                                    <button
                                                        onClick={() => testBrowserVoice(char)}
                                                        className="px-2 py-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-bold border border-white/10 flex items-center gap-1 transition-colors"
                                                    >
                                                        <Play className="w-3 h-3 fill-current" />
                                                        Test
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">Aucun autre personnage détecté.</p>
                                    )}
                                </div>
                            )}

                            {/* Voice Distribution - Neural AI (only if premium unlocked AND selected) */}
                            {ttsProvider === "openai" && isPremiumUnlocked && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Distribution Neural AI</span>
                                    {script.characters && script.characters.filter(c => c !== userCharacter).length > 0 ? (
                                        <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                            {script.characters.filter(c => c !== userCharacter).map((char) => (
                                                <div key={char} className="flex items-center gap-2 bg-emerald-900/20 p-2 rounded-lg border border-emerald-700/30">
                                                    <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-[9px] font-bold text-emerald-300 shrink-0">
                                                        {char.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-emerald-300 truncate">{char}</p>
                                                        <select
                                                            className="w-full bg-transparent text-[10px] text-emerald-500 focus:outline-none cursor-pointer"
                                                            value={openaiVoiceAssignments[char] || "nova"}
                                                            onChange={(e) => setOpenaiVoiceAssignments(prev => ({ ...prev, [char]: e.target.value as any }))}
                                                        >
                                                            {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map(v => (
                                                                <option key={v} value={v} className="bg-black text-white">{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button
                                                        onClick={() => testOpenAIVoice(char, openaiVoiceAssignments[char] || "nova")}
                                                        disabled={testingVoice === char}
                                                        className="px-2 py-1.5 rounded-full hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 transition-colors"
                                                    >
                                                        {testingVoice === char ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                                        Test
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-emerald-500/70 italic">Aucun autre personnage détecté.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Card 5: Advanced Options - Collapsible */}
                        <details className="group">
                            <summary className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg cursor-pointer transition-all hover:bg-white/[0.07] list-none">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">⚙️ Options avancées</label>
                                    <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                                </div>
                            </summary>
                            <div className="mt-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2">
                                {/* Sensitivity Slider */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">Barre de Tolérance</span>
                                        <span className="text-xs font-mono text-primary">{Math.round(threshold * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0.5" max="0.95" step="0.05"
                                        value={threshold}
                                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-600">
                                        <span>Relax</span><span>Strict</span>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* Start Button */}
                        <Button
                            size="lg"
                            onClick={() => {
                                // Auto-select browser if no provider chosen
                                if (!ttsProvider) setTtsProvider("browser");
                                handleStart();
                            }}
                            className="w-full text-lg font-bold py-6 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.4)] bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] transition-all active:scale-95 mt-4"
                        >
                            <Play className="mr-2 h-6 w-6 fill-current" />
                            COMMENCER
                        </Button>

                        <button onClick={onExit} className="w-full text-sm font-medium text-gray-500 hover:text-white transition-colors text-center py-2">
                            Retour au menu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Outer Responsive Wrapper with Dynamic Background */}
            <div className={cn(
                "fixed inset-0 flex items-center justify-center z-50 transition-all duration-700",
                isUserTurn
                    ? "bg-black/90"
                    : "bg-black/98"
            )}>
                {/* Dynamic Background Glow based on turn */}
                <div className={cn(
                    "absolute inset-0 transition-all duration-700 pointer-events-none",
                    isUserTurn
                        ? "bg-gradient-radial from-yellow-500/10 via-transparent to-transparent opacity-100"
                        : "bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50"
                )} />

                {/* Success Flash Animation */}
                {showSuccessAnimation && (
                    <div className="absolute inset-0 bg-green-500/20 animate-[pulse_0.5s_ease-out] pointer-events-none z-50" />
                )}

                {/* Error Shake Container */}
                <div className={cn(
                    "w-full h-[100dvh] md:h-[85vh] md:max-w-3xl md:rounded-3xl md:border md:border-white/10 md:shadow-2xl md:bg-black/40 md:backdrop-blur-sm flex flex-col overflow-hidden bg-transparent text-white relative transition-all duration-300",
                    showErrorAnimation && "animate-[shake_0.4s_ease-in-out]"
                )}>

                    {/* Background Ambient Glow - changes with turn */}
                    <div className={cn(
                        "absolute top-0 left-0 right-0 h-48 pointer-events-none transition-all duration-500",
                        isUserTurn
                            ? "bg-gradient-to-b from-yellow-500/15 to-transparent"
                            : "bg-gradient-to-b from-primary/10 to-transparent"
                    )} />

                    {/* Enhanced Mini-Header with Progress */}
                    <div className="flex-none flex justify-between items-center p-4 md:p-6 z-10">
                        <div className="flex items-center gap-3">
                            {/* Progress Badge */}
                            <div className={cn(
                                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2",
                                isPaused
                                    ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                    : isUserTurn
                                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                                        : "bg-white/5 text-gray-400 border-white/10"
                            )}>
                                <span className="tabular-nums">{currentLineIndex + 1}/{totalLines}</span>
                                <span className="text-gray-600">•</span>
                                <span>{progressPercent}%</span>
                            </div>

                            {/* Scene Name */}
                            {currentScene && (
                                <div className="hidden md:block text-[10px] text-gray-500 max-w-[200px] truncate">
                                    {currentScene.title}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <button onClick={togglePause} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors">
                                {isPaused ? <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Pause className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                            <button onClick={handleExit} className="text-gray-400 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-colors">
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Main Script View - Scrolling List */}
                    <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 scroll-smooth" id="script-container">
                        {script.lines.map((line, index) => {
                            const isActive = index === currentLineIndex;
                            const isUser = line.character === userCharacter;

                            // Auto-scroll ref
                            const lineRef = (el: HTMLDivElement | null) => {
                                if (isActive && el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                            };

                            return (
                                <div
                                    key={line.id}
                                    ref={lineRef}
                                    className={cn(
                                        "transition-all duration-500 max-w-2xl mx-auto rounded-2xl p-6",
                                        isActive
                                            ? "bg-white/10 scale-105 shadow-2xl border border-white/10 opacity-100"
                                            : "opacity-40 scale-95 blur-[0.5px]"
                                    )}
                                >
                                    <p className={cn(
                                        "text-xs font-bold uppercase tracking-widest mb-3",
                                        isActive ? "text-white" : "text-gray-500"
                                    )}>
                                        {line.character}
                                    </p>

                                    <p className={cn(
                                        "leading-relaxed font-serif transition-all",
                                        isActive
                                            ? "text-2xl md:text-3xl text-white"
                                            : "text-lg text-gray-400 grayscale",
                                        isUser && isActive ? "text-yellow-300 drop-shadow-md" : ""
                                    )}>
                                        {/* Status Indicators for Active Line */}
                                        {isActive && status === "listening_user" && (
                                            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse mr-3 align-middle" />
                                        )}
                                        {getVisibleText(line.text, isUser)}
                                    </p>

                                    {/* Error Feedback */}
                                    {isActive && status === "error" && (
                                        <div className="flex items-center gap-2 mt-4 text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span>Je n'ai pas compris. Répétez ?</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {/* Bottom Spacer for scrolling */}
                        <div className="h-48" />
                    </div>

                    {/* Next Line Preview - Faded miniature */}
                    {nextLine && (
                        <div className="flex-none px-6 pb-2 z-10">
                            <div className="max-w-xl mx-auto bg-white/5 rounded-xl p-3 border border-white/5">
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">
                                    Suivant : {nextLine.character === userCharacter ? "VOUS" : nextLine.character}
                                </p>
                                <p className={cn(
                                    "text-sm text-gray-500 line-clamp-2 font-serif",
                                    nextLine.character === userCharacter && "text-yellow-700"
                                )}>
                                    {nextLine.text.substring(0, 100)}{nextLine.text.length > 100 ? "..." : ""}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Controls - Bottom Layout with Progress Ring */}
                    <div className="flex-none pb-8 md:pb-12 pt-4 px-6 md:px-8 flex items-center justify-between relative z-30">

                        {/* Back Button */}
                        <button
                            onClick={previous}
                            className="p-3 md:p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-90 transition-all flex flex-col items-center gap-1 group"
                        >
                            <SkipBack className="w-5 h-5 md:w-6 md:h-6 group-active:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden md:block">Retour</span>
                        </button>

                        {/* CENTRAL ORB with CIRCULAR PROGRESS RING */}
                        <div className="relative group">
                            {/* Progress Ring SVG */}
                            <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] rotate-[-90deg]" viewBox="0 0 100 100">
                                {/* Background Ring */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="46"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="4"
                                />
                                {/* Progress Ring */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="46"
                                    fill="none"
                                    stroke={isUserTurn ? "#facc15" : "#a855f7"}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={`${progressPercent * 2.89} 289`}
                                    className="transition-all duration-500"
                                />
                            </svg>

                            {/* Living Glow */}
                            <div className={cn(
                                "absolute inset-0 blur-2xl rounded-full transition-all duration-500",
                                status === "listening_user"
                                    ? "bg-yellow-500 opacity-60 scale-150"
                                    : showSuccessAnimation
                                        ? "bg-green-500 opacity-80 scale-150"
                                        : "bg-primary opacity-0 scale-100"
                            )} />

                            <button
                                onClick={validateManually}
                                className={cn(
                                    "relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl border-4",
                                    showSuccessAnimation
                                        ? "bg-green-500 border-green-400 scale-110 shadow-[0_0_50px_rgba(34,197,94,0.6)]"
                                        : showErrorAnimation
                                            ? "bg-red-500 border-red-400 scale-95"
                                            : isUserTurn
                                                ? "bg-white border-white scale-110 shadow-[0_0_50px_rgba(255,255,255,0.4)]"
                                                : "bg-gray-900 border-gray-800 text-gray-500"
                                )}
                            >
                                {status === "listening_user" ? (
                                    <Mic className="w-8 h-8 md:w-10 md:h-10 text-black animate-pulse" />
                                ) : status === "playing_other" ? (
                                    <div className="flex gap-1 h-6 md:h-8 items-center">
                                        <div className="w-1 md:w-1.5 h-6 md:h-8 bg-primary rounded-full animate-[bounce_1s_infinite_0ms]" />
                                        <div className="w-1 md:w-1.5 h-4 md:h-6 bg-primary rounded-full animate-[bounce_1s_infinite_200ms]" />
                                        <div className="w-1 md:w-1.5 h-6 md:h-8 bg-primary rounded-full animate-[bounce_1s_infinite_400ms]" />
                                    </div>
                                ) : (
                                    <Play className={cn("w-8 h-8 md:w-10 md:h-10 ml-1", showSuccessAnimation || showErrorAnimation ? "text-white" : "")} />
                                )}
                            </button>

                            {/* Label under button */}
                            <span className="absolute -bottom-8 md:-bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-white/50 whitespace-nowrap">
                                {isUserTurn ? "Appuyer pour valider" : "Écoute..."}
                            </span>
                        </div>

                        {/* Skip Button */}
                        <button
                            onClick={skip}
                            className="p-3 md:p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-90 transition-all flex flex-col items-center gap-1 group"
                        >
                            <SkipForward className="w-5 h-5 md:w-6 md:h-6 group-active:translate-x-1 transition-transform" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden md:block">Passer</span>
                        </button>
                    </div>
                </div>
            </div>



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
