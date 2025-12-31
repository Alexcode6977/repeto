"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScriptLine, ParsedScript } from "@/lib/types";
import { useRehearsal } from "@/lib/hooks/use-rehearsal";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { synthesizeSpeech } from "@/app/actions/tts";
import { getUserCapabilities, validateAndStartRehearsal } from "@/app/actions/rehearsal";
import { getVoiceConfig, createVoiceConfig, VoiceConfig, determineSourceType, SourceType } from "@/lib/actions/voice-cache";
import { ScriptSettings } from "./script-setup";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Mic, Play, SkipForward, SkipBack, AlertTriangle, Pause, Power, Loader2, Sparkles, X, Coins, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FeedbackModal, FeedbackData } from "./feedback-modal";
import { submitFeedback } from "@/app/(protected)/dashboard/feedback-actions";

// Upgrade / Signup Modal
const UpgradeModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-8 text-center space-y-5">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-primary/10">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-foreground">Fonctionnalité réservée</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Créez un compte gratuitement pour débloquer tous les modes de répétition et les voix IA.
                        </p>
                    </div>

                    <div className="pt-2 space-y-3">
                        <a href="/signup" className="block w-full">
                            <Button className="w-full bg-primary hover:bg-primary/90 text-foreground font-bold py-3 text-sm shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                                Créer un compte
                            </Button>
                        </a>
                        <button
                            onClick={onClose}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Non merci
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
    userCharacters: string[];
    onExit: () => void;
    isDemo?: boolean;
    initialSettings?: ScriptSettings;
    playId?: string;
    scriptId?: string;
    isPublicScript?: boolean;
    troupeId?: string;
}

export function RehearsalMode({
    script,
    userCharacters = [],
    onExit,
    isDemo = false,
    initialSettings,
    playId,
    scriptId,
    isPublicScript = false,
    troupeId
}: RehearsalModeProps) {
    const [threshold, setThreshold] = useState(0.85); // Default 85%
    const [startLineIndex, setStartLineIndex] = useState(0);
    const [rehearsalMode, setRehearsalMode] = useState<"full" | "cue" | "check">(initialSettings?.mode || "full");
    const [hasStarted, setHasStarted] = useState(false);
    const [ttsProvider, setTtsProvider] = useState<"browser" | "openai" | null>(null);
    const [forceAudioOutput, setForceAudioOutput] = useState(false); // CarPlay experimental fix

    // Didascalies (stage directions) toggle - detect if present in script
    const hasDidascalies = useMemo(() =>
        script.characters.some(c =>
            c.toLowerCase().includes("didascalie") || c.toLowerCase() === "didascalies"
        ), [script.characters]);
    const [skipDidascalies, setSkipDidascalies] = useState(true); // Skip by default if present

    // Premium / Feature State
    const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
    const [canRecordAudio, setCanRecordAudio] = useState(false);

    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    // Line Visibility State
    const [lineVisibility, setLineVisibility] = useState<"visible" | "hint" | "hidden">(initialSettings?.visibility || "visible");

    // Fetch User Capabilities on Mount (replaces getVoiceStatus)
    useEffect(() => {
        const fetchCapabilities = async () => {
            try {
                const capabilities = await getUserCapabilities(troupeId);
                setIsPremiumUnlocked(capabilities.isPremium);
                setCanRecordAudio(capabilities.features.recording);

                // If not premium, ensure settings are reset to free tier defaults
                if (!capabilities.features.advancedModes && rehearsalMode !== "full") {
                    setRehearsalMode("full");
                }
                if (!capabilities.features.advancedVisibility && lineVisibility !== "visible") {
                    setLineVisibility("visible");
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

    // Voice Cache State
    const [existingVoiceConfig, setExistingVoiceConfig] = useState<VoiceConfig[] | null>(null);
    const [isLoadingVoiceConfig, setIsLoadingVoiceConfig] = useState(false);
    const [voiceCacheSourceType, setVoiceCacheSourceType] = useState<SourceType | null>(null);
    const [voiceCacheSourceId, setVoiceCacheSourceId] = useState<string | null>(null);

    // Fetch existing voice config on mount
    useEffect(() => {
        const fetchVoiceConfig = async () => {
            // Determine source type and ID
            const sourceType = await determineSourceType(isPublicScript, troupeId, playId);
            const sourceId = playId || scriptId;

            if (!sourceId) return;

            setVoiceCacheSourceType(sourceType);
            setVoiceCacheSourceId(sourceId);
            setIsLoadingVoiceConfig(true);

            try {
                const config = await getVoiceConfig(sourceType, sourceId);
                if (config) {
                    setExistingVoiceConfig(config);
                    // Pre-fill voice assignments from config
                    const assignments: Record<string, OpenAIVoice> = {};
                    config.forEach(c => {
                        assignments[c.character_name] = c.voice as OpenAIVoice;
                    });
                    setOpenaiVoiceAssignments(assignments);
                }
            } catch (error) {
                console.error("Failed to fetch voice config", error);
            } finally {
                setIsLoadingVoiceConfig(false);
            }
        };

        if (scriptId || playId) {
            fetchVoiceConfig();
        }
    }, [scriptId, playId, troupeId, isPublicScript]);

    useEffect(() => {
        if (initialSettings && !hasStarted) {
            // Auto-sync if settings change
            setRehearsalMode(initialSettings.mode);
            setLineVisibility(initialSettings.visibility);
        }
    }, [initialSettings, hasStarted]);

    // OpenAI voice assignments per character
    type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    const [openaiVoiceAssignments, setOpenaiVoiceAssignments] = useState<Record<string, OpenAIVoice>>({});
    const [testingVoice, setTestingVoice] = useState<string | null>(null);  // Track which role is being tested

    const {
        currentLine,
        currentLineIndex,
        status,
        feedback,
        start,
        next,
        stop,
        lastTranscript,
        retry,
        validateManually,
        togglePause,
        isPaused,
        previous,
        voiceAssignments,
        setVoiceForRole,
        voices,
        initializeAudio,
        transcript, // Real-time interim transcript
        isPlayingRecording
    } = useRehearsal({
        script,
        userCharacters,
        similarityThreshold: threshold,
        initialLineIndex: startLineIndex,
        mode: rehearsalMode,
        ttsProvider: ttsProvider || "browser",
        openaiVoiceAssignments,
        skipCharacters: hasDidascalies && skipDidascalies ? script.characters.filter(c => c.toLowerCase().includes("didascalie")) : [],
        playId
    });

    const { requestWakeLock, releaseWakeLock, isActive: isWakeLockActive } = useWakeLock();

    // Test browser voice
    const testBrowserVoice = (char: string) => {
        const voice = voiceAssignments[char];
        if (voice) {
            window.speechSynthesis.cancel();
            const ut = new SpeechSynthesisUtterance("Bonjour, je suis prêt.");
            ut.voice = voice;
            window.speechSynthesis.speak(ut);
        }
    };
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

    const handleStart = async () => {
        // SERVER-SIDE VALIDATION: Validate and sanitize settings before starting
        const validation = await validateAndStartRehearsal(
            {
                mode: rehearsalMode,
                visibility: lineVisibility,
                ttsProvider: ttsProvider || "browser"
            },
            troupeId
        );

        if (!validation.success) {
            alert(validation.error || "Erreur lors du démarrage de la répétition");
            return;
        }

        // Apply sanitized settings (server enforces tier limits)
        if (validation.settings.mode !== rehearsalMode) {
            setRehearsalMode(validation.settings.mode);
            // NOTIFY USER OF DOWNGRADE
            alert(`Le mode "${rehearsalMode === 'cue' ? 'Réplique' : 'Filage'}" est réservé aux comptes Premium/Troupe.\n\nLe mode "Lecture Intégrale" a été activé.`);
        }
        if (validation.settings.visibility !== lineVisibility) {
            setLineVisibility(validation.settings.visibility);
        }
        if (validation.settings.ttsProvider !== ttsProvider) {
            setTtsProvider(validation.settings.ttsProvider);
        }

        // Show warnings if any features were downgraded
        if (validation.warnings.length > 0) {
            console.warn("[Server Validation]", validation.warnings);
        }

        // Init audio (Mic + Speech Recog) immediately on user interaction (Required for Safari)
        try {
            if (initializeAudio) {
                await initializeAudio(forceAudioOutput);
            } else {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            }
        } catch (e) {
            console.error("Microphone access denied", e);
            alert("Accès micro refusé. Veuillez vérifier les permissions de votre navigateur.");
            return;
        }

        setHasStarted(true);
        sessionStartRef.current = Date.now();
        requestWakeLock();
        start();
    };

    // Session tracking
    const sessionStartRef = useRef<number>(Date.now());
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [pendingExit, setPendingExit] = useState(false);

    // Animation states for success/error feedback
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [showErrorAnimation, setShowErrorAnimation] = useState(false);
    const prevLineIndex = useRef(currentLineIndex);
    const prevStatus = useRef(status);

    // Refs for auto-scroll
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const isFirstScrollRef = useRef(true);

    // Auto-scroll to active line when index changes - INSTANT on first scroll, smooth after
    useEffect(() => {
        if (hasStarted && lineRefs.current.has(currentLineIndex)) {
            const activeEl = lineRefs.current.get(currentLineIndex);
            if (activeEl) {
                if (isFirstScrollRef.current) {
                    // First scroll: use requestAnimationFrame to ensure DOM is ready, then instant scroll
                    requestAnimationFrame(() => {
                        activeEl.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
                    });
                    isFirstScrollRef.current = false;
                } else {
                    // Subsequent scrolls: smooth animation
                    activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
        }
    }, [currentLineIndex, hasStarted]);

    // Progress calculations
    const totalLines = script.lines.length;
    const progressPercent = totalLines > 0 ? Math.round((currentLineIndex / totalLines) * 100) : 0;

    // Keyboard Shortcuts
    useEffect(() => {
        if (!hasStarted || showFeedbackModal || showUpgradeModal || pendingExit) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if no input/textarea is focused
            if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "")) return;

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    togglePause();
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
                    retry();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [hasStarted, showFeedbackModal, showUpgradeModal, pendingExit, togglePause, next, previous, retry]);

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
        // Helper to check if a character is in the user's selection
        const isUserCharacter = (char: string) => {
            const normalizedLineChar = char.toLowerCase().trim();
            return userCharacters.some(uc => uc.toLowerCase().trim() === normalizedLineChar);
        };
        const userLines = script.lines.filter(l => isUserCharacter(l.character));
        const completionPercentage = userLines.length > 0
            ? Math.round((currentLineIndex / script.lines.length) * 100)
            : 0;

        return {
            scriptTitle: script.title || "Script sans titre",
            characterNames: userCharacters,
            characterName: (userCharacters || []).join(", "),
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
            if (isDemo) {
                // In demo mode, show Upgrade Modal instead of feedback
                setShowUpgradeModal(true);
            } else {
                // Only show feedback if they actually rehearsed something
                setShowFeedbackModal(true);
                setPendingExit(true);
            }
        } else {
            releaseWakeLock();
            onExit();
        }
    };

    // Handle feedback submission
    const handleFeedbackSubmit = async (feedbackData: FeedbackData) => {
        const sessionStats = getSessionStats();
        await submitFeedback({
            scriptId: (script as any).id,
            ...sessionStats,
            characterName: sessionStats.characterNames.join(", "),
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
            releaseWakeLock();
            onExit();
        }
    };

    // AUTO-TRIGGER: Detect when script is finished and show feedback
    useEffect(() => {
        if (status === "finished" && hasStarted && !showFeedbackModal && !showUpgradeModal) {
            // Script completed! Show feedback modal or upgrade modal
            stop();
            if (isDemo) {
                setShowUpgradeModal(true);
            } else {
                setShowFeedbackModal(true);
                setPendingExit(true);
            }
        }
    }, [status, hasStarted, showFeedbackModal, showUpgradeModal, stop, isDemo]);

    const isUserTurn = currentLine && (() => {
        const normalizedLineChar = currentLine.character.toLowerCase().trim();
        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
        return (userCharacters || []).some(userChar => {
            const normalizedUserChar = (userChar || "").toLowerCase().trim();
            return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
        });
    })();

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


    if (!hasStarted) {
        // Get a sample user line for preview
        const sampleUserLine = script.lines.find(l => {
            const normalizedLineChar = l.character.toLowerCase().trim();
            const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
            return (userCharacters || []).some(userChar => {
                const normalizedUserChar = (userChar || "").toLowerCase().trim();
                return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
            });
        });
        const sampleOtherLine = script.lines.find(l => !(userCharacters || []).includes(l.character));

        return (
            <div className="flex flex-col lg:flex-row min-h-[100dvh] w-full max-w-7xl mx-auto animate-in fade-in duration-500 bg-background">

                {/* LEFT PANEL - Live Preview */}
                <div className="lg:w-[45%] flex flex-col items-center justify-start pt-12 lg:pt-16 p-6 lg:p-8 lg:border-r border-border order-2 lg:order-1">
                    {/* Logo & Character */}
                    <div className="text-center space-y-4 mb-8">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-glow" />
                            <img src="/repeto.png" alt="Repeto" className="relative w-20 h-20 mx-auto object-contain drop-shadow-2xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground tracking-tight">En scène</h2>
                            <p className="text-muted-foreground text-sm">Vous jouez <span className="text-yellow-400 font-bold">{(userCharacters || []).join(", ")}</span></p>
                        </div>
                    </div>

                    {/* Preview Card - Glassmorphism */}
                    <div className="w-full max-w-md space-y-6">
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aperçu</span>
                        </div>

                        {/* Preview Container */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-3xl p-6 shadow-2xl space-y-4 transition-all duration-500">
                            {/* Other character line example */}
                            {sampleOtherLine && (
                                <div className="p-3 rounded-xl bg-card border border-border transition-all duration-300">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                        {sampleOtherLine.character}
                                    </p>
                                    <p className="text-muted-foreground text-sm font-serif">
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
                                                : "bg-muted/50 border-2 border-border"
                                    )}
                                >
                                    <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                        {(userCharacters || []).length > 1 ? 'Vos Roles' : `${userCharacters[0]} (Vous)`}
                                    </p>
                                    <p className={cn(
                                        "text-lg font-serif transition-all duration-500",
                                        lineVisibility === "visible"
                                            ? "text-yellow-100"
                                            : lineVisibility === "hint"
                                                ? "text-orange-200"
                                                : "text-muted-foreground"
                                    )}>
                                        {getVisibleText(sampleUserLine.text.substring(0, 100), true)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Mode indicators */}
                        <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                            <span className={cn("transition-colors", lineVisibility === "visible" && "text-yellow-400 font-bold")}>
                                👁️ Visible
                            </span>
                            <span className={cn("transition-colors", lineVisibility === "hint" && "text-orange-400 font-bold")}>
                                💡 Indice
                            </span>
                            <span className={cn("transition-colors", lineVisibility === "hidden" && "text-muted-foreground font-bold")}>
                                🙈 Caché
                            </span>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL - Settings */}
                <div className="lg:w-[55%] flex flex-col items-center p-6 lg:p-8 lg:py-10 overflow-y-auto order-1 lg:order-2">
                    {/* Stepper - Enhanced with labels */}
                    <div className="flex items-center justify-center gap-1 mb-8">
                        {[
                            { num: 1, label: "Scène", icon: "🎬", active: true },
                            { num: 2, label: "Texte", icon: "📝", active: true },
                            { num: 3, label: "Voix", icon: "🎙️", active: true },
                            { num: 4, label: "Jouer", icon: "🎭", active: false }
                        ].map((step, i) => (
                            <div key={step.num} className="flex items-center">
                                <div className="flex flex-col items-center gap-1">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-all",
                                        step.active
                                            ? "bg-primary/20 text-foreground border-2 border-primary/50 shadow-lg shadow-primary/20"
                                            : "bg-card/50 text-muted-foreground border border-border"
                                    )}>
                                        {step.icon}
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider",
                                        step.active ? "text-primary" : "text-muted-foreground/50"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>
                                {i < 3 && (
                                    <div className={cn(
                                        "w-6 h-[2px] mx-1 mt-[-16px]",
                                        step.active ? "bg-primary/30" : "bg-border"
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Start Button - Enhanced CTA */}
                    <div className="max-w-md mx-auto w-full mb-6">
                        <Button
                            size="lg"
                            onClick={() => {
                                if (!ttsProvider) setTtsProvider("browser");
                                handleStart();
                            }}
                            className="w-full text-xl font-black py-7 rounded-2xl bg-gradient-to-r from-primary via-primary to-purple-600 text-foreground hover:scale-[1.02] transition-all active:scale-95 shadow-[0_0_50px_rgba(124,58,237,0.5)] animate-pulse-subtle group"
                        >
                            <Play className="mr-3 h-7 w-7 fill-current group-hover:scale-110 transition-transform" />
                            🎬 Entrer en scène
                        </Button>
                        <p className="text-center text-[10px] text-muted-foreground mt-2">Votre micro sera activé</p>
                    </div>

                    {/* Settings Cards */}
                    <div className="space-y-6 max-w-md mx-auto w-full">

                        {/* DEMO MODE ALERT */}
                        {isDemo && (
                            <div className="bg-primary/20 border border-primary/50 text-foreground p-4 rounded-xl text-sm font-medium text-center animate-pulse flex flex-col gap-2">
                                <p>Mode Démonstration</p>
                                <button onClick={() => setShowUpgradeModal(true)} className="text-xs underline text-primary-foreground/80 hover:text-foreground">
                                    Voir les limitations
                                </button>
                            </div>
                        )}

                        {/* Card 1: Scene Selection */}
                        {script.scenes && script.scenes.length > 0 && (
                            <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg transition-all hover:bg-muted/50">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">🎬 Point de départ</label>
                                <select
                                    className="w-full bg-background/50 border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
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

                        {/* Card 2: Text Visibility - Enhanced with descriptions */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg transition-all hover:bg-muted/50">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">📝 Vos Répliques</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "visible", label: "Visibles", emoji: "👁️", desc: "Texte complet" },
                                    { id: "hint", label: "Indices", emoji: "💡", desc: "Premiers mots" },
                                    { id: "hidden", label: "Cachées", emoji: "🙈", desc: "Test mémoire" }
                                ].map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => {
                                            if (isDemo && v.id !== 'visible') {
                                                setShowUpgradeModal(true);
                                                return;
                                            }
                                            setLineVisibility(v.id as typeof lineVisibility);
                                        }}
                                        className={cn(
                                            "py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 touch-manipulation flex flex-col items-center gap-0.5",
                                            lineVisibility === v.id
                                                ? "bg-white text-black shadow-lg scale-105"
                                                : "bg-card text-muted-foreground border border-border hover:bg-white/10 active:scale-95",
                                            isDemo && v.id !== 'visible' && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <span className="text-lg">{v.emoji}</span>
                                        <span className="font-bold">{v.label}</span>
                                        <span className={cn("text-[8px]", lineVisibility === v.id ? "text-foreground/60" : "text-muted-foreground/60")}>{v.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card 3: Rehearsal Mode - Enhanced with clearer labels */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg transition-all hover:bg-muted/50">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">🎭 Mode de répétition</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "full", label: "Intégrale", icon: "📖", desc: "Tout le texte lu" },
                                    { id: "cue", label: "Réplique", icon: "💬", desc: "Avant vos lignes" },
                                    { id: "check", label: "Filage", icon: "⚡", desc: "Vos lignes seules" },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            if (isDemo && m.id !== 'full') {
                                                setShowUpgradeModal(true);
                                                return;
                                            }
                                            setRehearsalMode(m.id as typeof rehearsalMode);
                                        }}
                                        className={cn(
                                            "p-3 rounded-xl text-center transition-all duration-300 touch-manipulation border flex flex-col items-center gap-1",
                                            rehearsalMode === m.id
                                                ? "bg-primary/20 border-primary/50 shadow-lg shadow-primary/10"
                                                : "bg-card border-border hover:bg-white/10 active:scale-95",
                                            isDemo && m.id !== 'full' && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <span className="text-lg">{m.icon}</span>
                                        <span className={cn("text-xs font-bold", rehearsalMode === m.id ? "text-foreground" : "text-muted-foreground")}>{m.label}</span>
                                        <span className="text-[8px] text-muted-foreground leading-tight">{m.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card 4: Voice Settings */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg space-y-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">🎙️ Voix de lecture</label>

                            {/* Premium users: show both options */}
                            {isPremiumUnlocked ? (
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
                            ) : (
                                /* Non-premium users: Standard only + upgrade CTA */
                                <div className="space-y-3">
                                    <div className="py-3 rounded-xl text-xs font-bold bg-muted/30 dark:bg-white/10 border border-border dark:border-white/30 text-foreground text-center">
                                        Voix Standard
                                    </div>
                                    <a
                                        href="/profile"
                                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Passez à Pro pour des voix IA réalistes
                                    </a>
                                </div>
                            )}
                            {isDemo && <div className="absolute inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowUpgradeModal(true); }} />}
                        </div>

                        {/* Voice Distribution - Only shown when a provider is selected */}
                        {ttsProvider === "browser" && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest block">Distribution des rôles</span>
                                {script.characters && script.characters.filter(c => !(userCharacters || []).includes(c)).length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                        {script.characters.filter(c => !(userCharacters || []).includes(c)).map((char) => (
                                            <div key={char} className="flex items-center gap-2 bg-background/30 p-2 rounded-lg">
                                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                                                    {char.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-foreground truncate">{char}</p>
                                                    <select
                                                        className="w-full bg-transparent text-[10px] text-muted-foreground focus:outline-none cursor-pointer"
                                                        value={voiceAssignments[char]?.voiceURI || ""}
                                                        onChange={(e) => setVoiceForRole(char, e.target.value)}
                                                    >
                                                        {voices.map(v => (
                                                            <option key={v.voiceURI} value={v.voiceURI} className="bg-background text-foreground">
                                                                {v.name}
                                                            </option>
                                                        ))}
                                                        {voices.length === 0 && <option className="bg-background text-foreground">Défaut (Navigateur)</option>}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => testBrowserVoice(char)}
                                                    className="px-2 py-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] font-bold border border-border flex items-center gap-1 transition-colors"
                                                >
                                                    <Play className="w-3 h-3 fill-current" />
                                                    Test
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">Aucun autre personnage détecté.</p>
                                )}
                            </div>
                        )}

                        {/* Voice Distribution - Neural AI (only if premium unlocked AND selected) */}
                        {ttsProvider === "openai" && isPremiumUnlocked && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Distribution Neural AI</span>
                                    {existingVoiceConfig && (
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                            <Check className="w-3 h-3" />
                                            Voix figées
                                        </span>
                                    )}
                                </div>
                                {isLoadingVoiceConfig ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                                    </div>
                                ) : script.characters && script.characters.filter(c => !(userCharacters || []).includes(c)).length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                        {script.characters.filter(c => !(userCharacters || []).includes(c)).map((char) => (
                                            <div key={char} className={cn(
                                                "flex items-center gap-2 p-2 rounded-lg border",
                                                existingVoiceConfig
                                                    ? "bg-emerald-900/30 border-emerald-600/40"
                                                    : "bg-emerald-900/20 border-emerald-700/30"
                                            )}>
                                                <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-[9px] font-bold text-emerald-300 shrink-0">
                                                    {char.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-emerald-300 truncate">{char}</p>
                                                    {existingVoiceConfig ? (
                                                        /* Frozen voice - just display */
                                                        <p className="text-[10px] text-emerald-500 font-medium">
                                                            {(openaiVoiceAssignments[char] || "nova").charAt(0).toUpperCase() + (openaiVoiceAssignments[char] || "nova").slice(1)}
                                                        </p>
                                                    ) : (
                                                        /* Editable select */
                                                        <select
                                                            className="w-full bg-transparent text-[10px] text-emerald-500 focus:outline-none cursor-pointer"
                                                            value={openaiVoiceAssignments[char] || "nova"}
                                                            onChange={(e) => setOpenaiVoiceAssignments(prev => ({ ...prev, [char]: e.target.value as any }))}
                                                        >
                                                            {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map(v => (
                                                                <option key={v} value={v} className="bg-background text-foreground">{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                                                            ))}
                                                        </select>
                                                    )}
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

                        {/* Card 5: Tolerance Slider */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg transition-all hover:bg-muted/50 relative">
                            {isDemo && (
                                <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-2xl"
                                    onClick={(e) => { e.stopPropagation(); setShowUpgradeModal(true); }}>
                                    <Lock className="w-6 h-6 text-foreground/50" />
                                </div>
                            )}
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">🎯 Barre de Tolérance</label>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Précision reconnaissance vocale</span>
                                    <span className="text-sm font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{Math.round(threshold * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0.5" max="0.95" step="0.05"
                                    value={threshold}
                                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                    className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                    <span>😌 Relax</span><span>🎯 Strict</span>
                                </div>
                            </div>
                        </div>

                        {/* Card 6: Car Mode Toggle */}
                        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg transition-all hover:bg-muted/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        🚗 Mode Voiture
                                        <span className="text-[8px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">BETA</span>
                                    </label>
                                    <p className="text-[10px] text-muted-foreground mt-1">Force la sortie audio sur les hauts-parleurs</p>
                                </div>
                                <button
                                    onClick={() => setForceAudioOutput(!forceAudioOutput)}
                                    className={cn(
                                        "relative w-14 h-7 rounded-full transition-colors shrink-0",
                                        forceAudioOutput ? "bg-yellow-500" : "bg-muted"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow",
                                        forceAudioOutput ? "left-8" : "left-1"
                                    )} />
                                </button>
                            </div>
                        </div>
                    </div>


                    <button onClick={onExit} className="w-full max-w-md mx-auto text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-center py-2">
                        Retour au menu
                    </button>
                </div>
            </div>

        );
    }

    return (
        <>
            <Portal>
                <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
            </Portal>

            {/* Outer Responsive Wrapper with Dynamic Background */}
            <div className={cn(
                "fixed inset-0 flex items-center justify-center z-50 transition-all duration-700",
                isUserTurn
                    ? "bg-background/90"
                    : "bg-background/98"
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
                    "w-full h-[100dvh] md:h-[85vh] md:max-w-3xl md:rounded-3xl md:border md:border-border md:shadow-2xl md:bg-background/40 md:backdrop-blur-sm flex flex-col overflow-hidden bg-transparent text-foreground relative transition-all duration-300",
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
                                        : "bg-card text-muted-foreground border-border"
                            )}>
                                <span className="tabular-nums">{currentLineIndex + 1}/{totalLines}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{progressPercent}%</span>
                                {isWakeLockActive && (
                                    <>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="flex items-center gap-1 group/wake">
                                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                            <span className="md:inline hidden">Lock</span>
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Scene Name */}
                            {currentScene && (
                                <div className="hidden md:block text-[10px] text-muted-foreground max-w-[200px] truncate">
                                    {currentScene.title}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <button onClick={togglePause} className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-card transition-colors">
                                {isPaused ? <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Pause className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                            <button onClick={handleExit} className="text-muted-foreground hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-colors">
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Main Script View - Scrolling List */}
                    <div
                        ref={containerRef}
                        className={cn(
                            "flex-1 overflow-y-auto px-4 py-8 space-y-6 scroll-smooth no-scrollbar md:scrollbar-thin transition-opacity duration-300",
                            isFirstScrollRef.current ? "opacity-0" : "opacity-100"
                        )}
                        id="script-container"
                    >
                        {script.lines.map((line, index) => {
                            const isActive = index === currentLineIndex;
                            const isUser = (() => {
                                const normalizedLineChar = line.character.toLowerCase().trim();
                                const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
                                return (userCharacters || []).some(userChar => {
                                    const normalizedUserChar = (userChar || "").toLowerCase().trim();
                                    return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
                                });
                            })();

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
                                        isUser && isActive ? "text-yellow-600 dark:text-yellow-300 drop-shadow-md" : ""
                                    )}>
                                        {/* Status Indicators for Active Line */}
                                        {isActive && status === "listening_user" && (
                                            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse mr-3 align-middle" />
                                        )}
                                        {isActive && isPlayingRecording && (
                                            <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[8px] font-black px-2 py-0.5 mr-3 align-middle animate-in fade-in zoom-in-95">
                                                <Mic className="w-2.5 h-2.5 mr-1" />
                                                Voix Troupe
                                            </Badge>
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
                            <div className="max-w-xl mx-auto bg-card rounded-xl p-3 border border-border">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                    Suivant : {(() => {
                                        const normalizedLineChar = nextLine.character.toLowerCase().trim();
                                        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
                                        const isUser = (userCharacters || []).some(userChar => {
                                            const normalizedUserChar = (userChar || "").toLowerCase().trim();
                                            return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
                                        });
                                        return isUser ? "VOUS" : nextLine.character;
                                    })()}
                                </p>
                                <p className={cn(
                                    "text-sm text-muted-foreground line-clamp-2 font-serif",
                                    (() => {
                                        const normalizedLineChar = nextLine.character.toLowerCase().trim();
                                        const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());
                                        return (userCharacters || []).some(userChar => {
                                            const normalizedUserChar = (userChar || "").toLowerCase().trim();
                                            return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
                                        });
                                    })() && "text-yellow-700"
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
                            className="p-3 md:p-4 rounded-full bg-card border border-border text-foreground hover:bg-muted active:scale-90 transition-all flex flex-col items-center gap-1 group"
                        >
                            <SkipBack className="w-5 h-5 md:w-6 md:h-6 group-active:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Retour</span>
                        </button>

                        {/* CENTRAL ORB with CIRCULAR PROGRESS RING */}
                        <div className="relative group">
                            {/* LIVE TRANSCRIPT BUBBLE (Above Orb) */}
                            <AnimatePresence>
                                {status === "listening_user" && transcript && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        className="absolute -top-16 left-1/2 -translate-x-1/2 w-full max-w-[250px] flex flex-wrap justify-center gap-1 z-50 px-2"
                                    >
                                        {transcript.split(" ").slice(-6).map((word, idx) => (
                                            <motion.span
                                                key={`${word}-${idx}`}
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="bg-yellow-500/20 text-yellow-500 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full border border-yellow-500/30 backdrop-blur-md shadow-lg"
                                            >
                                                {word}
                                            </motion.span>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Progress Ring SVG */}
                            <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] rotate-[-90deg] text-border" viewBox="0 0 100 100">
                                {/* Background Ring */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="46"
                                    fill="none"
                                    stroke="currentColor"
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
                                                : "bg-muted border-border text-muted-foreground"
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
                                    <Play className={cn("w-8 h-8 md:w-10 md:h-10 ml-1", showSuccessAnimation || showErrorAnimation ? "text-foreground" : "")} />
                                )}
                            </button>

                            {/* Label under button */}
                            <span className="absolute -bottom-8 md:-bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-foreground/50 whitespace-nowrap">
                                {isUserTurn ? "Je vous écoute..." : "Lecture..."}
                            </span>
                        </div>

                        {/* Skip Button */}
                        <button
                            onClick={next}
                            className="p-3 md:p-4 rounded-full bg-card border border-border text-foreground hover:bg-muted active:scale-90 transition-all flex flex-col items-center gap-1 group"
                        >
                            <SkipForward className="w-5 h-5 md:w-6 md:h-6 group-active:translate-x-1 transition-transform" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Passer</span>
                        </button>
                    </div>
                </div>
            </div >



            {/* Feedback Modal */}
            < FeedbackModal
                isOpen={showFeedbackModal}
                onClose={handleFeedbackClose}
                onSubmit={handleFeedbackSubmit}
                sessionData={getSessionStats()}
            />
        </>
    );
}
