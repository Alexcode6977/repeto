"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScriptLine, ParsedScript } from "@/lib/types";
import { type TTSProvider } from "@/lib/hooks/use-ai-tts";
import { useRehearsal } from "@/lib/hooks/use-rehearsal";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getUserCapabilities, validateAndStartRehearsal } from "@/app/actions/rehearsal";
import { getVoiceConfig, determineSourceType } from "@/lib/actions/voice-cache";
import { ScriptSettings } from "./script-setup";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Mic, Play, SkipForward, SkipBack, AlertTriangle, Pause, Loader2, X, Lock, Check, ArrowLeft, ScanEye, Eye, EyeOff, MessageSquare, Zap, Users, StickyNote } from "lucide-react";
import { cn, getCollectiveMembersForLine, getSceneCharacters, isUserLine } from "@/lib/utils";
import { Card } from "./ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { FeedbackModal, FeedbackData } from "./feedback-modal";
import { submitFeedback } from "@/app/(protected)/dashboard/feedback-actions";
import { saveSessionStats, saveLineErrors, LineErrorData, type RehearsalContextType } from "@/app/actions/stats"; // Stats Actions
import { PRIVATE_NOTE_CHAR } from "./script-viewer";
import { removeStageDirections, parseSegments } from "@/lib/utils/stage-directions";
import { Progress } from "./ui/progress";
import { createPortal } from "react-dom";

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
                            Créez un compte gratuitement pour débloquer tous les modes de répétition et les voix Premium.
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

interface PrivateNote {
    line_index: number;
    text: string;
}

// Helper for Portals
const Portal = ({ children }: { children: React.ReactNode }) => {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
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
    eventId?: string;
    initialIgnoredCharacters?: string[];
    partnerCharacters?: string[];
    isVisio?: boolean;
    autoStart?: boolean;
    privateNotes?: PrivateNote[];
    showStageDirections?: boolean; // Toggle for showing/hiding stage directions
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
    troupeId,
    eventId,
    initialIgnoredCharacters = [],
    partnerCharacters = [],
    isVisio = false,
    autoStart = false,
    privateNotes = [],
    showStageDirections = true
}: RehearsalModeProps) {
    // Tolerance: 3 positions (Strict=0.90, Modéré=0.80, Permissif=0.65)
    const [toleranceLevel, setToleranceLevel] = useState<"strict" | "moderate" | "permissive">("moderate");
    const threshold = toleranceLevel === "strict" ? 0.90 : toleranceLevel === "moderate" ? 0.80 : 0.65;

    // Playback Speed: 3 positions (Normal=1.0, Accéléré=1.25, Très rapide=1.5)
    const [playbackSpeed, setPlaybackSpeed] = useState<"normal" | "fast" | "veryfast">("normal");
    const speedMultiplier = playbackSpeed === "normal" ? 1.0 : playbackSpeed === "fast" ? 1.25 : 1.5;

    const [startLineIndex, setStartLineIndex] = useState(0);
    const [rehearsalMode, setRehearsalMode] = useState<"full" | "cue" | "check">(initialSettings?.mode || "full");
    const [hasStarted, setHasStarted] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [startupProgress, setStartupProgress] = useState(0);
    const [startupStep, setStartupStep] = useState("En attente...");
    const [ttsProvider, setTtsProvider] = useState<"browser" | "google" | null>(null);
    const [forceAudioOutput] = useState(false); // CarPlay experimental fix (read-only for now)

    // Initialize ignored characters - merge prop with default didascalies
    const ignoredCharacters = useMemo(() => {
        const defaultIgnored = script.characters.filter(c =>
            c.toLowerCase().includes("didascalie")
        );
        return [...new Set([...defaultIgnored, ...initialIgnoredCharacters])];
    }, [script.characters, initialIgnoredCharacters]);

    // Premium / Feature State
    const [hasAiVoiceAccess, setHasAiVoiceAccess] = useState(false);
    // canRecordAudio is set but currently unused - keeping for future use
    const [, setCanRecordAudio] = useState(false);

    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    // Line Visibility State
    const [lineVisibility, setLineVisibility] = useState<"visible" | "hint" | "hidden">(initialSettings?.visibility || "visible");

    // Fetch User Capabilities on Mount (replaces getVoiceStatus)
    useEffect(() => {
        const fetchCapabilities = async () => {
            try {
                const capabilities = await getUserCapabilities(troupeId);
                setCanRecordAudio(capabilities.features.recording);
                const canUseAiVoices = capabilities.features.aiVoices || capabilities.isPremium;
                setHasAiVoiceAccess(canUseAiVoices);

                // If not premium, ensure settings are reset to free tier defaults
                if (!capabilities.features.advancedModes && rehearsalMode !== "full") {
                    setRehearsalMode("full");
                }
                if (!capabilities.features.advancedVisibility && lineVisibility !== "visible") {
                    setLineVisibility("visible");
                }
                // Enforce TTS Rules: Premium/Troupe -> Google, Free -> Browser
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
                setIsLoadingStatus(false);
            }
        };
        fetchCapabilities();
    }, [troupeId]);

    // Fetch existing voice config on mount
    useEffect(() => {
        const fetchVoiceConfig = async () => {
            // Determine source type and ID
            const sourceType = await determineSourceType(isPublicScript, troupeId, playId);
            const sourceId = playId || scriptId;

            if (!sourceId) return;

            try {
                const config = await getVoiceConfig(sourceType, sourceId);
                if (config) {
                    // Pre-fill voice assignments from config
                    const assignments: Record<string, string> = {};

                    config.forEach(c => {
                        // Accept all voices from config as they are already validated by the provider column in DB
                        assignments[c.character_name] = c.voice;
                    });

                    if (Object.keys(assignments).length > 0) {
                        setAiVoiceAssignments(assignments);
                    } else {
                        // Fallback: Generate local Google assignments
                        const VOICES = ["Aoede", "Charon", "Fenrir", "Puck", "Kore", "Leda"];
                        const localAssignments: Record<string, string> = {};
                        script.characters.forEach((char, index) => {
                            localAssignments[char] = VOICES[index % VOICES.length];
                        });
                        setAiVoiceAssignments(localAssignments);
                    }
                } else {
                    // Fallback: Google default distribution
                    const VOICES = ["Aoede", "Charon", "Fenrir", "Puck", "Kore", "Leda"];
                    const localAssignments: Record<string, string> = {};

                    script.characters.forEach((char, index) => {
                        localAssignments[char] = VOICES[index % VOICES.length];
                    });

                    setAiVoiceAssignments(localAssignments);
                }
            } catch (error) {
                console.error("Failed to fetch voice config", error);
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

    // Auto-start for Visio mode - skip the setup screen entirely
    useEffect(() => {
        // Ensure we have everything needed before auto-starting
        const hasValidScript = script?.lines?.length > 0;
        const hasValidUserCharacters = userCharacters?.length > 0 && userCharacters.some(c => c?.trim());

        if (autoStart && !hasStarted && !isStarting && !isLoadingStatus && hasValidScript && hasValidUserCharacters) {
            // Slightly longer delay to ensure audio context and all dependencies are ready
            const timer = setTimeout(() => {
                console.log("[AutoStart] Triggering with", {
                    scriptLines: script.lines.length,
                    userCharacters,
                    ttsProvider
                });
                if (!ttsProvider) setTtsProvider(hasAiVoiceAccess ? "google" : "browser");
                handleStart();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [autoStart, hasStarted, isStarting, isLoadingStatus, script?.lines?.length, userCharacters, hasAiVoiceAccess, ttsProvider]);

    // Google voice assignments per character
    const [aiVoiceAssignments, setAiVoiceAssignments] = useState<Record<string, string>>({});

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
        initializeAudio,
        preparePlaybackStart,
        transcript, // Real-time interim transcript
        isPlayingRecording
    } = useRehearsal({
        script,
        userCharacters,
        similarityThreshold: threshold,
        initialLineIndex: startLineIndex,
        mode: rehearsalMode,
        ttsProvider: ttsProvider || (hasAiVoiceAccess ? "google" : "browser"),
        aiVoiceAssignments,
        showStageDirections,
        skipCharacters: ignoredCharacters,
        playId,
        scriptId,
        troupeId,
        playbackRate: speedMultiplier,
        isPublicScript,
        partnerCharacters
    });

    const { requestWakeLock, releaseWakeLock, isActive: isWakeLockActive } = useWakeLock();

    const handleStart = async () => {
        if (isStarting || hasStarted || isLoadingStatus || !ttsProvider) return;
        setStartupProgress(5);
        setStartupStep("Validation des réglages...");
        setIsStarting(true);
        let didStart = false;

        try {
            // SERVER-SIDE VALIDATION: Validate and sanitize settings before starting
            setStartupProgress(25);
            setStartupStep("Vérification des droits et paramètres...");
            const validation = await validateAndStartRehearsal(
                {
                    mode: rehearsalMode,
                    visibility: lineVisibility,
                    ttsProvider: ttsProvider || (hasAiVoiceAccess ? "google" : "browser")
                },
                troupeId
            );

            if (!validation.success) {
                setStartupStep("Impossible de démarrer");
                alert(validation.error || "Erreur lors du démarrage de la répétition");
                return;
            }

            // Apply sanitized settings (server enforces tier limits)
            if (validation.settings.mode !== rehearsalMode) {
                setRehearsalMode(validation.settings.mode);
                // NOTIFY USER OF DOWNGRADE
                alert(`Le mode "${rehearsalMode === 'cue' ? 'Réplique' : 'Solo'}" est réservé aux comptes Premium/Troupe.\n\nLe mode "Lecture Intégrale" a été activé.`);
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
                setStartupProgress(55);
                setStartupStep("Initialisation du micro...");
                if (initializeAudio) {
                    // Check if the user speaks first (Check mode or Cue mode leading into user line)
                    // If so, we SKIP the warmup to avoid race condition with the immediate listen() call
                    let isUserStarting = false;
                    const startLine = script.lines[startLineIndex];
                    if (startLine) {
                        const normalizedLineChar = startLine.character.toLowerCase().trim();
                        isUserStarting = (userCharacters || []).some(userChar => {
                            const normalizedUserChar = (userChar || "").toLowerCase().trim();
                            return normalizedLineChar === normalizedUserChar;
                        });
                    }

                    await initializeAudio(forceAudioOutput, isUserStarting);
                } else {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                }
            } catch (e) {
                console.error("Microphone initialization error", e);

                // Provide specific error messages based on the error type
                if (e === "MIC_API_NOT_AVAILABLE" || (typeof e === 'object' && e && 'message' in e && (e as Error).message === "MIC_API_NOT_AVAILABLE")) {
                    alert("Votre navigateur ne supporte pas l'enregistrement audio.\n\nSur Safari, assurez-vous d'utiliser une version récente et d'être en HTTPS.");
                } else {
                    alert("Accès micro refusé. Veuillez vérifier les permissions de votre navigateur.");
                }
                setStartupStep("Erreur d'initialisation micro");
                return;
            }

            setStartupProgress(65);
            setStartupStep("Préparation des premières répliques...");
            try {
                await preparePlaybackStart(startLineIndex, (completed, total) => {
                    const safeTotal = total > 0 ? total : 1;
                    const ratio = Math.min(completed / safeTotal, 1);
                    const mappedProgress = Math.round(65 + ratio * 30);

                    setStartupProgress((previous) => Math.max(previous, mappedProgress));
                    if (total > 0) {
                        setStartupStep(`Préparation des premières répliques (${completed}/${total})...`);
                    }
                });
            } catch (e) {
                console.warn("[Rehearsal] Preload start skipped", e);
            }

            setStartupProgress(100);
            setStartupStep("Prêt, lancement...");
            setHasStarted(true);
            didStart = true;
            sessionStartRef.current = Date.now();
            requestWakeLock();
            start();
        } finally {
            if (!didStart) {
                setIsStarting(false);
                setStartupProgress(0);
                setStartupStep("En attente...");
            } else {
                setStartupStep("En attente...");
            }
        }
    };

    // Session tracking
    const sessionStartRef = useRef<number>(Date.now());
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const [pendingExit, setPendingExit] = useState(false);
    const hasSavedStats = useRef(false); // Prevent duplicate saves
    const lineErrorsRef = useRef<LineErrorData[]>([]); // Track line errors during session

    // Detailed metrics tracking
    const sessionMetricsRef = useRef({
        linesValidatedFirstTry: 0,
        linesWrong: 0,
        linesSkipped: 0,
        linesValidatedTotal: 0
    });
    const seenUserLinesRef = useRef<Set<number>>(new Set());
    const validatedUserLinesRef = useRef<Set<number>>(new Set());
    const firstTryUserLinesRef = useRef<Set<number>>(new Set());
    const erroredUserLinesRef = useRef<Set<number>>(new Set());
    const skippedUserLinesRef = useRef<Set<number>>(new Set());

    const [sessionStatsForRecap, setSessionStatsForRecap] = useState<{
        durationSeconds: number;
        linesRehearsed: number;
        completionPercentage: number;
        linesValidatedFirstTry: number;
        linesWrong: number;
        linesSkipped: number;
        firstTryRate: number;
    } | null>(null);

    // Animation states for success/error feedback
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [showErrorAnimation, setShowErrorAnimation] = useState(false);
    const prevLineIndex = useRef(currentLineIndex);
    const prevStatus = useRef(status);

    // Refs for auto-scroll
    const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const isFirstScrollRef = useRef(true);
    const [hasInitialScrollCompleted, setHasInitialScrollCompleted] = useState(false);

    // Auto-scroll to active line when index changes - INSTANT on first scroll, smooth after
    useEffect(() => {
        if (hasStarted && lineRefs.current.has(currentLineIndex)) {
            const activeEl = lineRefs.current.get(currentLineIndex);
            if (activeEl) {
                if (isFirstScrollRef.current) {
                    // First scroll: use requestAnimationFrame to ensure DOM is ready, then instant scroll
                    requestAnimationFrame(() => {
                        activeEl.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
                        setHasInitialScrollCompleted(true);
                    });
                    isFirstScrollRef.current = false;
                } else {
                    // Subsequent scrolls: smooth animation
                    activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    setHasInitialScrollCompleted(true);
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
                    handleManualNext();
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
    }, [hasStarted, showFeedbackModal, showUpgradeModal, pendingExit, togglePause, next, previous, retry, status, feedback]); // Added status/feedback deps via handleManualNext closure risk (or ideally refs)

    // Current scene detection
    const currentScene = script.scenes?.find((scene, idx) => {
        const nextScene = script.scenes?.[idx + 1];
        return currentLineIndex >= scene.index && (!nextScene || currentLineIndex < nextScene.index);
    });

    // Next line preview
    const nextLine = script.lines[currentLineIndex + 1];

    // Virtualized script window to keep scrolling smooth on long scripts.
    const VIRTUAL_CONTEXT = 70;
    const VIRTUAL_ROW_ESTIMATE = 176; // Approximate average line card height.
    const virtualStart = Math.max(0, currentLineIndex - VIRTUAL_CONTEXT);
    const virtualEnd = Math.min(script.lines.length, currentLineIndex + VIRTUAL_CONTEXT + 1);
    const visibleLines = script.lines.slice(virtualStart, virtualEnd);
    const topSpacerHeight = virtualStart * VIRTUAL_ROW_ESTIMATE;
    const bottomSpacerHeight = Math.max(0, (script.lines.length - virtualEnd) * VIRTUAL_ROW_ESTIMATE);
    const scriptRuntimeId = (script as { id?: string }).id;

    const getSessionContext = (): {
        contextType: RehearsalContextType;
        scriptId?: string;
        playId?: string;
        troupeId?: string;
        eventId?: string;
    } => {
        const contextType: RehearsalContextType = eventId
            ? "troupe_event"
            : playId
                ? "troupe_play"
                : "solo_script";

        return {
            contextType,
            scriptId: contextType === "solo_script" ? (scriptId || scriptRuntimeId) : undefined,
            playId: playId || undefined,
            troupeId: troupeId || undefined,
            eventId: eventId || undefined,
        };
    };

    // Track a line error (skip, timeout, mismatch)
    const trackLineError = useCallback((lineIndex: number, errorType: 'skip' | 'timeout' | 'mismatch') => {
        const line = script.lines[lineIndex];
        if (!line) return;
        const context = getSessionContext();

        lineErrorsRef.current.push({
            contextType: context.contextType,
            scriptId: context.scriptId,
            playId: context.playId,
            troupeId: context.troupeId,
            eventId: context.eventId,
            lineIndex,
            lineText: line.text?.substring(0, 200) || '',
            characterName: line.character,
            errorType
        });

        if (errorType === 'skip' && !skippedUserLinesRef.current.has(lineIndex)) {
            skippedUserLinesRef.current.add(lineIndex);
            sessionMetricsRef.current.linesSkipped = skippedUserLinesRef.current.size;
        }

        console.log(`[LineError] Tracked ${errorType} at line ${lineIndex}`);
    }, [eventId, playId, script, scriptId, troupeId]);

    // Detect success/error for animations (Purely visual)
    useEffect(() => {
        if (currentLineIndex > prevLineIndex.current && (prevStatus.current === "listening_user" || prevStatus.current === "evaluating")) {
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 800);
        }
        prevLineIndex.current = currentLineIndex;
    }, [currentLineIndex]);

    // Mark every user line reached during the session.
    useEffect(() => {
        if (status === "listening_user") {
            seenUserLinesRef.current.add(currentLineIndex);
        }
    }, [status, currentLineIndex]);

    // Track successful validations once per unique line.
    useEffect(() => {
        if (feedback !== "correct") return;

        if (!validatedUserLinesRef.current.has(currentLineIndex)) {
            validatedUserLinesRef.current.add(currentLineIndex);
            sessionMetricsRef.current.linesValidatedTotal = validatedUserLinesRef.current.size;

            if (!erroredUserLinesRef.current.has(currentLineIndex)) {
                firstTryUserLinesRef.current.add(currentLineIndex);
                sessionMetricsRef.current.linesValidatedFirstTry = firstTryUserLinesRef.current.size;
            }
        }
    }, [feedback, currentLineIndex]);

    // Track spoken mismatches/timeouts.
    useEffect(() => {
        if (feedback !== "incorrect") return;

        setShowErrorAnimation(true);
        setTimeout(() => setShowErrorAnimation(false), 600);

        sessionMetricsRef.current.linesWrong++;
        erroredUserLinesRef.current.add(currentLineIndex);

        const errorType: 'timeout' | 'mismatch' = lastTranscript?.trim() ? 'mismatch' : 'timeout';
        trackLineError(currentLineIndex, errorType);
    }, [feedback, currentLineIndex, lastTranscript, trackLineError]);

    // Wrapped Next function to track Manual Skips
    const handleManualNext = () => {
        if (status === "listening_user" && !validatedUserLinesRef.current.has(currentLineIndex)) {
            trackLineError(currentLineIndex, 'skip');
        }
        next();
    };

    useEffect(() => {
        // Runtime recognition errors from the hook.
        if (status === "error" && prevStatus.current !== "error") {
            setShowErrorAnimation(true);
            setTimeout(() => setShowErrorAnimation(false), 600);

            sessionMetricsRef.current.linesWrong++;
            erroredUserLinesRef.current.add(currentLineIndex);
            trackLineError(currentLineIndex, 'timeout');
        }

        prevStatus.current = status;
    }, [status, currentLineIndex, trackLineError]);

    // Calculate session stats
    const getSessionStats = () => {
        const durationSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        // Helper to check if a character is in the user's selection
        const isUserCharacter = (char: string) => {
            const normalizedLineChar = char.toLowerCase().trim();
            return userCharacters.some(uc => uc.toLowerCase().trim() === normalizedLineChar);
        };
        const totalUserLines = script.lines.filter(l => isUserCharacter(l.character)).length;
        const linesRehearsed = seenUserLinesRef.current.size;
        const completionPercentage = totalUserLines > 0
            ? Math.round((linesRehearsed / totalUserLines) * 100)
            : 0;

        const metrics = sessionMetricsRef.current;
        const firstTryRate = linesRehearsed > 0
            ? Math.round((metrics.linesValidatedFirstTry / linesRehearsed) * 100)
            : 0;

        return {
            scriptTitle: script.title || "Script sans titre",
            characterNames: userCharacters,
            characterName: (userCharacters || []).join(", "),
            durationSeconds,
            linesRehearsed,
            completionPercentage,
            // Add detailed stats
            linesValidatedFirstTry: metrics.linesValidatedFirstTry,
            linesWrong: metrics.linesWrong,
            linesSkipped: metrics.linesSkipped,
            linesValidatedTotal: metrics.linesValidatedTotal,
            firstTryRate,
            settings: {
                textMode: lineVisibility,
                rehearsalMode,
                threshold,
                ttsProvider: ttsProvider || (hasAiVoiceAccess ? "google" : "browser"),
            },
        };
    };

    // Helper to save stats and line errors
    const persistSessionStats = async () => {
        if (hasSavedStats.current || isDemo) return;
        // Only save if meaningful duration (> 10s) or lines (> 0)
        const stats = getSessionStats();
        if (stats.durationSeconds < 5 && stats.linesRehearsed < 1) return;

        hasSavedStats.current = true;
        console.log("[Stats] Saving session...", stats);

        const metrics = sessionMetricsRef.current;
        const firstTryRate = stats.linesRehearsed > 0
            ? Math.round((metrics.linesValidatedFirstTry / stats.linesRehearsed) * 100)
            : 0;

        // Store stats for recap modal
        setSessionStatsForRecap({
            durationSeconds: stats.durationSeconds,
            linesRehearsed: stats.linesRehearsed,
            completionPercentage: stats.completionPercentage,
            linesValidatedFirstTry: metrics.linesValidatedFirstTry,
            linesWrong: metrics.linesWrong,
            linesSkipped: metrics.linesSkipped,
            firstTryRate
        });

        try {
            const context = getSessionContext();

            const saveResult = await saveSessionStats({
                contextType: context.contextType,
                scriptId: context.scriptId,
                playId: context.playId,
                troupeId: context.troupeId,
                eventId: context.eventId,
                scriptTitle: script.title || "Untitled",
                characterName: (userCharacters || []).join(", "),
                startTime: new Date(sessionStartRef.current),
                endTime: new Date(),
                durationSeconds: stats.durationSeconds,
                linesTotal: script.lines.length,
                linesRehearsed: stats.linesRehearsed,
                completionPercentage: stats.completionPercentage,
                mode: rehearsalMode,
                // Detailed metrics
                linesValidatedFirstTry: metrics.linesValidatedFirstTry,
                linesWrong: metrics.linesWrong,
                linesSkipped: metrics.linesSkipped
            });
            if ("error" in saveResult) {
                console.error("[Stats] Session save returned error:", saveResult.error);
            }
            const sessionId = "success" in saveResult ? saveResult.sessionId : undefined;

            // Save line errors if any
            if (lineErrorsRef.current.length > 0) {
                console.log("[Stats] Saving", lineErrorsRef.current.length, "line errors...");
                // Update line errors with correct scriptId
                lineErrorsRef.current = lineErrorsRef.current.map(e => ({
                    ...e,
                    contextType: context.contextType,
                    scriptId: context.scriptId,
                    playId: context.playId,
                    troupeId: context.troupeId,
                    eventId: context.eventId,
                    sessionId
                }));
                await saveLineErrors(lineErrorsRef.current);
            }
        } catch (e) {
            console.error("[Stats] Failed to save", e);
        }
    };

    // Updated Exit Handler - Shows feedback modal first
    const handleExit = () => {
        stop(); // Force stop audio/recognition
        if (hasStarted && currentLineIndex > 0) {
            persistSessionStats(); // [NEW] Save on user exit
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
        const actualScriptId = playId || scriptId || scriptRuntimeId;
        await submitFeedback({
            scriptId: actualScriptId,
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
            persistSessionStats(); // [NEW] Save on finish
            if (isDemo) {
                setShowUpgradeModal(true);
            } else {
                setShowFeedbackModal(true);
                setPendingExit(true);
            }
        }
    }, [status, hasStarted, showFeedbackModal, showUpgradeModal, stop, isDemo]);

    // Helper for visibility masking
    const getVisibleText = (text: string | undefined, isUser: boolean) => {
        if (!text) return "";

        // First, filter stage directions if needed
        const filteredText = showStageDirections ? text : removeStageDirections(text);

        // Then apply visibility masking for user lines
        if (!isUser || lineVisibility === "visible") return filteredText;

        if (lineVisibility === "hint") {
            const words = filteredText.split(" ");
            if (words.length <= 2) return filteredText;
            return `${words[0]} ${words[1]} ...`;
        }

        // Hidden
        return "..............."; // Visual placeholder
    };

    // Quick Start Logic - MOVED OUTSIDE conditional to respect React hooks rules
    const rehearsalStorageKey = useMemo(
        () => `souffleur_rehearsal_settings_${playId || scriptId || scriptRuntimeId || script.title}`,
        [playId, scriptId, scriptRuntimeId, script.title]
    );

    const quickStartSettings = useMemo(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(rehearsalStorageKey);
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    }, [rehearsalStorageKey]);

    // Pre-calculate scene characters for collective role logic
    const sceneCharactersMap = useMemo(() => getSceneCharacters(script), [script]);

    const getSceneStartIndex = (lineIndex: number): number => {
        let currentIndex = 0;
        for (const scene of script.scenes || []) {
            if (scene.index <= lineIndex) {
                currentIndex = scene.index;
            } else {
                break;
            }
        }
        return currentIndex;
    };

    const isUserLineHelper = (line: ScriptLine, index: number) => {
        const sceneStartIdx = getSceneStartIndex(index);
        const activeChars = sceneCharactersMap.get(sceneStartIdx);
        const collectiveMembers = getCollectiveMembersForLine(script, index);
        return isUserLine(script, line.character, userCharacters, activeChars, collectiveMembers);
    };

    const isUserTurn = currentLine && isUserLineHelper(currentLine, currentLineIndex);

    if (!hasStarted) {
        // Quick Start Logic - quickStartSettings is now defined above, outside this conditional

        const startQuick = async () => {
            if (isStarting || isLoadingStatus || !ttsProvider) return;
            if (quickStartSettings) {
                const enforcedProvider: TTSProvider = hasAiVoiceAccess ? "google" : "browser";
                setRehearsalMode(quickStartSettings.rehearsalMode);
                setTtsProvider(enforcedProvider);
                setLineVisibility(quickStartSettings.lineVisibility);
                setStartLineIndex(quickStartSettings.startLineIndex || 0);
                await handleStart();
            }
        };

        const handleStartWithSave = async () => {
            if (isStarting || isLoadingStatus || !ttsProvider) return;
            const enforcedProvider: TTSProvider = hasAiVoiceAccess ? "google" : "browser";
            if (typeof window !== 'undefined') {
                localStorage.setItem(rehearsalStorageKey, JSON.stringify({
                    rehearsalMode,
                    ttsProvider: enforcedProvider,
                    lineVisibility,
                    startLineIndex,
                    timestamp: Date.now()
                }));
            }
            setTtsProvider(enforcedProvider);
            await handleStart();
        };

        return (
            <div className="w-full max-w-lg mx-auto py-8 animate-in fade-in slide-in-from-bottom-6 duration-700 min-h-[100dvh] flex items-center justify-center pt-safe">
                <Card className="bg-card/90 dark:bg-black/40 backdrop-blur-2xl border-border/60 dark:border-white/10 shadow-2xl overflow-hidden relative w-full">
                    {/* Background Gradient Blobs */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="p-6 md:p-8 space-y-8 relative z-10 pt-8">
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
                                <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-violet-300 via-violet-500 to-purple-500 drop-shadow-sm">
                                    Répétition
                                </h2>
                                {/* Quick Start Button */}
                                {quickStartSettings && (
                                    <button
                                        onClick={startQuick}
                                        disabled={isStarting || isLoadingStatus || !ttsProvider}
                                        className="mt-2 py-2 px-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-500/20 flex items-center gap-2 transition-all w-fit"
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
                                    className="w-full bg-muted/60 dark:bg-white/5 border border-border/70 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-foreground dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none cursor-pointer hover:bg-muted/80 dark:hover:bg-white/10 transition-colors"
                                >
                                    <option value={0} className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">Début du script</option>
                                    {script.scenes?.map((scene, i) => (
                                        <option key={`scene-${scene.index}-${i}`} value={scene.index} className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
                                            {scene.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 1. VISIBILITY */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <ScanEye className="w-3 h-3" />
                                    Visibilité
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { id: "visible", label: "Visible", sub: "Texte complet", icon: Eye },
                                        { id: "hint", label: "Indices", sub: "1ers mots", icon: ScanEye },
                                        { id: "hidden", label: "Caché", sub: "À l'aveugle", icon: EyeOff },
                                    ].map((v) => {
                                        const isActive = lineVisibility === v.id;
                                        const Icon = v.icon;
                                        return (
                                            <button
                                                key={v.id}
                                                onClick={() => setLineVisibility(v.id as "visible" | "hint" | "hidden")}
                                                className={cn(
                                                    "relative p-3 rounded-xl text-left transition-all duration-300 border flex flex-col items-start gap-2",
                                                    isActive
                                                        ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                                        : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors mb-1",
                                                    isActive ? "bg-violet-500 text-white" : "bg-muted dark:bg-white/10 text-muted-foreground"
                                                )}>
                                                    <Icon className="w-3 h-3" />
                                                </div>
                                                <div>
                                                    <div className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-violet-700 dark:text-white" : "text-muted-foreground")}>
                                                        {v.label}
                                                    </div>
                                                </div>
                                                {isActive && <Check className="w-3 h-3 text-violet-400 absolute top-3 right-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. MODE */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Mic className="w-3 h-3" />
                                    Mode
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { id: "full", label: "Intégrale", sub: "Tout le cast", icon: Users },
                                        { id: "cue", label: "Réplique", sub: "Juste avant", icon: MessageSquare },
                                        { id: "check", label: "Solo", sub: "Mes lignes", icon: Zap },
                                    ].map((m) => {
                                        const isActive = rehearsalMode === m.id;
                                        const Icon = m.icon;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => setRehearsalMode(m.id as "full" | "cue" | "check")}
                                                className={cn(
                                                    "relative p-3 rounded-xl text-left transition-all duration-300 border flex flex-col items-start gap-2",
                                                    isActive
                                                        ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                                        : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors mb-1",
                                                    isActive ? "bg-violet-500 text-white" : "bg-muted dark:bg-white/10 text-muted-foreground"
                                                )}>
                                                    <Icon className="w-3 h-3" />
                                                </div>
                                                <div>
                                                    <div className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-violet-700 dark:text-white" : "text-muted-foreground")}>
                                                        {m.label}
                                                    </div>
                                                </div>
                                                {isActive && <Check className="w-3 h-3 text-violet-400 absolute top-3 right-3" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 3. TOLERANCE */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" />
                                    Tolérance
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: "strict", label: "Strict", sub: "Exigent" },
                                        { id: "moderate", label: "Modéré", sub: "Équilibré" },
                                        { id: "permissive", label: "Permissif", sub: "Souple" },
                                    ].map((t) => {
                                        const isActive = toleranceLevel === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => setToleranceLevel(t.id as "strict" | "moderate" | "permissive")}
                                                className={cn(
                                                    "relative p-3 rounded-xl text-center transition-all duration-300 border",
                                                    isActive
                                                        ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                                        : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10"
                                                )}
                                            >
                                                <div className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-violet-700 dark:text-white" : "text-muted-foreground")}>
                                                    {t.label}
                                                </div>
                                                {isActive && <Check className="w-3 h-3 text-violet-400 absolute top-2 right-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 4. PLAYBACK SPEED */}
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
                                                        ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                                        : "bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/70 dark:hover:bg-white/10"
                                                )}
                                            >
                                                <div className={cn("text-[10px] font-bold uppercase tracking-wide", isActive ? "text-violet-700 dark:text-white" : "text-muted-foreground")}>
                                                    {s.label}
                                                </div>
                                                {isActive && <Check className="w-3 h-3 text-violet-400 absolute top-2 right-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        {/* Action Button */}
                        <div className="pt-4">
                            <button
                                onClick={handleStartWithSave}
                                disabled={isStarting || isLoadingStatus || !ttsProvider}
                                className={cn(
                                    "w-full group relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl transition-all duration-300 shadow-lg",
                                    isStarting || isLoadingStatus || !ttsProvider
                                        ? "bg-violet-500/70 text-white/90 cursor-not-allowed"
                                        : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                )}
                            >
                                <span className="font-bold text-sm tracking-wider uppercase">
                                    {isStarting ? "Chargement..." : "C'est parti"}
                                </span>
                                {isStarting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Play className="w-5 h-5 fill-current group-hover:translate-x-1 transition-transform" />
                                )}
                            </button>
                            {isStarting && (
                                <div className="mt-4 space-y-2">
                                    <Progress
                                        value={startupProgress}
                                        className="h-2 bg-violet-500/20 [&>div]:bg-violet-500"
                                    />
                                    <div className="flex items-center justify-between text-[11px] font-medium">
                                        <p className="text-muted-foreground">{startupStep}</p>
                                        <p className="text-violet-300">{startupProgress}%</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <>
            <Portal>
                <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
            </Portal>

            {!showFeedbackModal && !showUpgradeModal && !sessionStatsForRecap && (
                <button
                    onClick={handleExit}
                    aria-label="Quitter la répétition"
                    className="md:hidden fixed right-4 z-[90] p-2.5 rounded-full bg-card/90 dark:bg-black/65 border border-border/70 dark:border-white/20 text-foreground dark:text-white hover:text-red-500 dark:hover:text-red-300 active:scale-95 transition-all backdrop-blur-sm shadow-xl"
                    style={{ top: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
                >
                    <X className="w-5 h-5" />
                </button>
            )}

            {/* Outer Responsive Wrapper with Dynamic Background */}
            <div className={cn(
                "flex items-center justify-center transition-all duration-700",
                isVisio
                    ? "relative w-full h-full"
                    : "fixed inset-0 z-50",
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
                    "flex flex-col overflow-hidden bg-transparent text-foreground relative transition-all duration-300",
                    isVisio
                        ? "w-full h-full"
                        : "w-full h-[100dvh] md:h-[85vh] md:max-w-3xl md:rounded-3xl md:border md:border-border md:shadow-2xl md:bg-background/40 md:backdrop-blur-sm",
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
                            hasInitialScrollCompleted ? "opacity-100" : "opacity-0"
                        )}
                        id="script-container"
                    >
                        {topSpacerHeight > 0 && <div style={{ height: `${topSpacerHeight}px` }} />}
                        {visibleLines.map((line, localIndex) => {
                            const index = virtualStart + localIndex;
                            const isActive = index === currentLineIndex;
                            const isUser = isUserLineHelper(line, index);

                            const isIndication = line.character === "INDICATIONS";

                            return (
                                <div
                                    key={line.id}
                                    ref={(el) => {
                                        if (el) {
                                            lineRefs.current.set(index, el);
                                        } else {
                                            lineRefs.current.delete(index);
                                        }
                                    }}
                                    className={cn(
                                        "transition-all duration-500 max-w-2xl mx-auto rounded-2xl p-4 md:p-6",
                                        isActive
                                            ? "bg-muted/30 dark:bg-white/10 scale-100 md:scale-105 shadow-2xl border border-border opacity-100"
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

                                    {!isIndication && (
                                        <p className={cn(
                                            "text-xs font-bold uppercase tracking-widest mb-3",
                                            isActive ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {line.character}
                                        </p>
                                    )}

                                    <p className={cn(
                                        "leading-relaxed font-serif transition-all",
                                        isActive
                                            ? "text-xl md:text-3xl text-foreground"
                                            : "text-base md:text-lg text-muted-foreground grayscale",
                                        isIndication ? "text-muted-foreground italic text-lg" : ""
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
                                        {(() => {
                                            const text = getVisibleText(line.text, isUser);
                                            if (typeof text !== "string") return text;

                                            // If showStageDirections is false, the text is already stripped.
                                            // If true, we split it to apply different styles.
                                            if (!showStageDirections) {
                                                return <span className={cn(isUser && isActive ? "text-yellow-600 dark:text-yellow-300 drop-shadow-md" : "")}>{text}</span>;
                                            }

                                            const segments = parseSegments(text);
                                            return segments.map((seg, i) => (
                                                <span
                                                    key={i}
                                                    className={cn(
                                                        seg.isDirection
                                                            ? "text-muted-foreground/60 italic text-[0.85em] mx-1 font-sans"
                                                            : (isUser && isActive ? "text-yellow-600 dark:text-yellow-300 drop-shadow-md" : "")
                                                    )}
                                                >
                                                    {seg.text}
                                                </span>
                                            ));
                                        })()}
                                    </p>

                                    {/* Error Feedback */}
                                    {
                                        isActive && status === "error" && (
                                            <div className="flex items-center gap-2 mt-4 text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span>Je n&apos;ai pas compris. Répétez ?</span>
                                            </div>
                                        )
                                    }
                                </div>
                            );
                        })}
                        {bottomSpacerHeight > 0 && <div style={{ height: `${bottomSpacerHeight}px` }} />}
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
                    <div className={cn(
                        "flex-none pt-4 flex items-center justify-between relative",
                        isVisio
                            ? "fixed bottom-0 left-0 right-0 w-full px-8 pb-8 bg-gradient-to-t from-background via-background/95 to-transparent z-[60]"
                            : "pb-8 md:pb-12 px-6 md:px-8 z-30"
                    )}>

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
                            onClick={handleManualNext}
                            className="p-3 md:p-4 rounded-full bg-card border border-border text-foreground hover:bg-muted active:scale-90 transition-all flex flex-col items-center gap-1 group"
                        >
                            <SkipForward className="w-5 h-5 md:w-6 md:h-6 group-active:translate-x-1 transition-transform" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Passer</span>
                        </button>
                    </div>
                </div>
            </div >



            {/* Stats Recap Modal */}
            {
                sessionStatsForRecap && !showFeedbackModal && !showUpgradeModal && (
                    <Portal>
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                            <div className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-primary/20 to-violet-500/20 p-6 text-center">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-primary/10">
                                        <Check className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">Répétition terminée !</h3>
                                </div>

                                {/* Stats Grid */}
                                <div className="p-5 space-y-3">
                                    {/* Top stats row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-muted/30 rounded-2xl p-4 text-center">
                                            <p className="text-2xl font-bold text-foreground">
                                                {Math.floor(sessionStatsForRecap.durationSeconds / 60)}
                                                <span className="text-sm font-normal text-muted-foreground">min</span>
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Durée</p>
                                        </div>
                                        <div className="bg-muted/30 rounded-2xl p-4 text-center">
                                            <p className="text-2xl font-bold text-foreground">{sessionStatsForRecap.linesRehearsed}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Répliques</p>
                                        </div>
                                    </div>

                                    {/* Detailed stats */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-teal-500/10 rounded-xl p-3 text-center">
                                            <p className="text-xl font-bold text-teal-400">
                                                {sessionStatsForRecap.linesValidatedFirstTry}
                                            </p>
                                            <p className="text-[9px] text-teal-400/70 uppercase font-bold">1er coup</p>
                                        </div>
                                        <div className={cn(
                                            "rounded-xl p-3 text-center",
                                            sessionStatsForRecap.linesWrong > 0 ? "bg-red-500/10" : "bg-muted/20"
                                        )}>
                                            <p className={cn(
                                                "text-xl font-bold",
                                                sessionStatsForRecap.linesWrong > 0 ? "text-red-400" : "text-muted-foreground"
                                            )}>
                                                {sessionStatsForRecap.linesWrong}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Erreurs</p>
                                        </div>
                                        <div className={cn(
                                            "rounded-xl p-3 text-center",
                                            sessionStatsForRecap.linesSkipped > 0 ? "bg-orange-500/10" : "bg-muted/20"
                                        )}>
                                            <p className={cn(
                                                "text-xl font-bold",
                                                sessionStatsForRecap.linesSkipped > 0 ? "text-orange-400" : "text-muted-foreground"
                                            )}>
                                                {sessionStatsForRecap.linesSkipped}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Passées</p>
                                        </div>
                                    </div>

                                    {/* First try rate banner */}
                                    <div className="bg-primary/10 rounded-2xl p-4 text-center">
                                        <p className="text-3xl font-bold text-primary">{sessionStatsForRecap.firstTryRate}%</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Réussite du 1er coup</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-5 pt-0 space-y-3">
                                    <Button
                                        onClick={() => {
                                            setSessionStatsForRecap(null);
                                            if (!isDemo) {
                                                setShowFeedbackModal(true);
                                            } else {
                                                setShowUpgradeModal(true);
                                            }
                                        }}
                                        className="w-full bg-primary hover:bg-primary/90 text-foreground font-bold py-3 rounded-xl"
                                    >
                                        Continuer
                                    </Button>
                                    {sessionStatsForRecap.linesSkipped > 0 && troupeId && playId && (
                                        <a
                                            href={`/troupes/${troupeId}/plays/${playId}/my-character`}
                                            className="block w-full text-center text-xs text-orange-400 hover:text-orange-300 transition-colors py-2 font-medium"
                                        >
                                            Voir les répliques difficiles →
                                        </a>
                                    )}
                                    <button
                                        onClick={() => {
                                            setSessionStatsForRecap(null);
                                            releaseWakeLock();
                                            onExit();
                                        }}
                                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                                    >
                                        Passer le feedback
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Portal>
                )
            }

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
