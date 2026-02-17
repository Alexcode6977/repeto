"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Check,
    Loader2,
    Upload,
    X,
    UserPlus,
    Edit3,
    BookOpen,
    Crown,
    Sparkles,
} from "lucide-react";
import {
    detectCharactersAction,
    finalizeParsingAction,
    importScriptWithAI,
    runImportDiagnosticsAction,
    saveScriptWithImportValidation,
    type ImportDiagnosticsResult,
    type ImportValidationSubmission,
} from "../actions";
import type { ParsedScript, ScriptMappings } from "@/lib/types";
import { CatalogBrowser } from "./catalog-browser";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ImportWizardProps {
    showImportGuide: boolean;
    setShowImportGuide: (show: boolean) => void;
    userTier: "free" | "solo_pro" | "troupe" | "troupe_xl";
    userEmail: string | null;
    onImportComplete: () => Promise<void>;
    onError: (msg: string) => void;
}

type ValidationDecision = "accept" | "reject";

interface CollectiveResolutionState {
    label: string;
    scope: "global" | "scene";
    sceneIndex?: number;
    members: string[];
}

export function ImportWizard({
    showImportGuide,
    setShowImportGuide,
    onImportComplete,
    onError,
}: ImportWizardProps) {
    // --- STATE ---
    const [isImporting, setIsImporting] = useState(false);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [validationModalOpen, setValidationModalOpen] = useState(false);
    const [detectedCharacters, setDetectedCharacters] = useState<string[]>([]);
    const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
    const [customTitle, setCustomTitle] = useState("");
    const [importProgress, setImportProgress] = useState(0);

    // Character editing in Validation Modal
    const [newCharName, setNewCharName] = useState("");
    const [editingChar, setEditingChar] = useState<string | null>(null);
    const [tempCharName, setTempCharName] = useState("");
    const [validationMessage, setValidationMessage] = useState<string | null>(null);

    // Final IA diagnostics validation (shared by classic + IA import)
    const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
    const [pendingScriptForSave, setPendingScriptForSave] = useState<ParsedScript | null>(null);
    const [diagnosticsResult, setDiagnosticsResult] = useState<ImportDiagnosticsResult | null>(null);
    const [diagnosticsDecisions, setDiagnosticsDecisions] = useState<Record<string, ValidationDecision>>({});
    const [aliasTargetsById, setAliasTargetsById] = useState<Record<string, string>>({});
    const [collectiveResolutionsById, setCollectiveResolutionsById] = useState<Record<string, CollectiveResolutionState>>({});

    // AI Import State
    const [isAiImporting, setIsAiImporting] = useState(false);
    const [aiImportStep, setAiImportStep] = useState(0);
    const [aiImportProgress, setAiImportProgress] = useState(0);
    const [aiImportElapsedSec, setAiImportElapsedSec] = useState(0);
    const [aiImportFileName, setAiImportFileName] = useState("");
    const [aiImportFileSizeMb, setAiImportFileSizeMb] = useState(0);

    // Choice screen state
    const [importChoice, setImportChoice] = useState<"choice" | "catalog">("choice");
    //const [isPending, startTransition] = useTransition(); // Using local isImporting instead for now or need wrapping
    const [, startTransition] = useTransition();

    const aiImportIntervalsRef = useRef<NodeJS.Timeout[]>([]);
    const aiImportCancelledRef = useRef(false);

    const resetDiagnosticsState = () => {
        setDiagnosticsModalOpen(false);
        setPendingScriptForSave(null);
        setDiagnosticsResult(null);
        setDiagnosticsDecisions({});
        setAliasTargetsById({});
        setCollectiveResolutionsById({});
    };

    const prepareDiagnosticsValidation = async (parsedScript: ParsedScript, finalTitle: string, useLegacyProgress = true) => {
        let diagnosticsProgressInterval: NodeJS.Timeout | null = null;

        if (useLegacyProgress) {
            setIsImporting(true);
            setImportProgress(96);
        } else {
            const diagnosticsStartMs = Date.now();
            const baseElapsed = aiImportElapsedSec;
            setAiImportProgress((prev) => Math.max(prev, 90));
            diagnosticsProgressInterval = setInterval(() => {
                const diagnosticsElapsed = Math.floor((Date.now() - diagnosticsStartMs) / 1000);
                const totalElapsed = baseElapsed + diagnosticsElapsed;
                const stagedProgress = 90 + Math.floor(7 * (1 - Math.exp(-diagnosticsElapsed / 120)));

                setAiImportElapsedSec(totalElapsed);
                setAiImportProgress((prev) => Math.max(prev, Math.min(97, stagedProgress)));
            }, 1000);
            aiImportIntervalsRef.current.push(diagnosticsProgressInterval);
        }

        const scriptWithTitle: ParsedScript = {
            ...parsedScript,
            title: finalTitle,
        };

        const diagnostics = await runImportDiagnosticsAction(scriptWithTitle, scriptWithTitle.characters);

        if (diagnosticsProgressInterval) {
            clearInterval(diagnosticsProgressInterval);
        }

        if (useLegacyProgress) {
            setIsImporting(false);
            setImportProgress(100);
        } else {
            setAiImportProgress((prev) => Math.max(prev, 98));
        }

        if ("error" in diagnostics) {
            onError(diagnostics.error);
            return;
        }

        const decisionState: Record<string, ValidationDecision> = {};

        const aliasTargets: Record<string, string> = {};
        diagnostics.aliasSuggestions.forEach((item) => {
            aliasTargets[item.id] = item.target;
        });

        const collectiveState: Record<string, CollectiveResolutionState> = {};
        diagnostics.collectiveSuggestions.forEach((item) => {
            collectiveState[item.id] = {
                label: item.label,
                scope: item.scope,
                sceneIndex: item.sceneIndex,
                members: [...item.members],
            };
        });

        setPendingScriptForSave(scriptWithTitle);
        setDiagnosticsResult(diagnostics);
        setDiagnosticsDecisions(decisionState);
        setAliasTargetsById(aliasTargets);
        setCollectiveResolutionsById(collectiveState);
        setDiagnosticsModalOpen(true);
    };

    const diagnosticsPendingCount = useMemo(() => {
        if (!diagnosticsResult) return 0;
        return diagnosticsResult.blockingDecisions.filter((decision) => !diagnosticsDecisions[decision.id]).length;
    }, [diagnosticsResult, diagnosticsDecisions]);

    const sceneDisplayByStartIndex = useMemo(() => {
        const map = new Map<number, string>();
        const scenes = pendingScriptForSave?.scenes || [];
        scenes.forEach((scene, order) => {
            map.set(scene.index, scene.title || `Scene ${order + 1}`);
        });
        return map;
    }, [pendingScriptForSave]);

    const aiStepLabel = aiImportStep === 1
        ? "Extraction du PDF"
        : aiImportStep === 2
            ? "Formatage du texte"
            : aiImportStep === 3
                ? "Vérification finale"
                : "Import du document";

    const aiStepDescription = aiImportStep === 2
        ? "Mise en forme du PDF au format Repeto."
        : aiImportStep === 3
            ? "Préparation des suggestions de validation."
            : "Traitement du document en cours.";

    const aiStepActivity = aiImportStep === 2
        ? (aiImportElapsedSec < 20
            ? "Détection de la structure du texte..."
            : aiImportElapsedSec < 45
                ? "Normalisation des dialogues..."
                : aiImportElapsedSec < 90
                    ? "Contrôle des personnages et des scènes..."
                    : "Finalisation du format...")
        : aiImportStep === 3
            ? "Construction des suggestions de validation..."
            : "Préparation de l'import...";

    const getFormattingProgress = (elapsedSec: number) => {
        const mainCurve = 14 + (60 * (1 - Math.exp(-elapsedSec / 95))); // ~14 -> ~74
        const overtime = elapsedSec > 120 ? Math.min(14, (elapsedSec - 120) / 24) : 0; // ~74 -> ~88
        return Math.floor(Math.min(88, mainCurve + overtime));
    };

    const importTimeline = useMemo(() => {
        const isStep2 = aiImportStep === 2;
        const isStep3 = aiImportStep === 3;

        const extractionDone = isStep2 || isStep3;
        const reconstructionDone = isStep3 || (isStep2 && aiImportElapsedSec >= 60);
        const coherenceDone = isStep3;

        return [
            {
                label: "Lecture du fichier",
                status: extractionDone ? "done" : "active",
                detail: extractionDone ? "Terminé" : "En cours",
            },
            {
                label: "Extraction du texte",
                status: extractionDone ? "done" : "pending",
                detail: extractionDone ? "Terminé" : "En attente",
            },
            {
                label: "Restructuration des dialogues",
                status: reconstructionDone ? "done" : isStep2 ? "active" : "pending",
                detail: reconstructionDone ? "Terminé" : isStep2 ? "En cours" : "En attente",
            },
            {
                label: isStep3 ? "Préparation de la validation" : "Contrôle de cohérence",
                status: isStep3 ? "active" : coherenceDone ? "done" : "pending",
                detail: isStep3 ? "En cours" : coherenceDone ? "Terminé" : "En attente",
            },
        ];
    }, [aiImportStep, aiImportElapsedSec]);

    // --- HANDLERS (LEGACY / STANDARD) ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCurrentFile(file);
        const formData = new FormData();
        formData.append("file", file);

        setIsImporting(true);
        setImportProgress(20);
        setValidationMessage(null); // Reset message

        startTransition(async () => {

            const result = await detectCharactersAction(formData);
            setIsImporting(false);

            if ("error" in result) {
                onError(result.error);
            } else {
                setDetectedCharacters(result.characters || []);
                setSelectedCharacters(result.characters || []);
                setCustomTitle(result.title || file.name.replace(".pdf", ""));
                setValidationModalOpen(true);
            }
            e.target.value = "";
        });
    };

    const startDeepParsing = async () => {
        if (!currentFile || selectedCharacters.length === 0) return;

        setValidationModalOpen(false);
        setIsImporting(true); // Re-use isImporting for progress modal
        setImportProgress(0);

        // Fake progress
        const interval = setInterval(() => {
            setImportProgress((prev) => (prev < 90 ? prev + 1 : prev));
        }, 1000);

        try {
            const formData = new FormData();
            formData.append("file", currentFile);

            const result = await finalizeParsingAction(formData, selectedCharacters);

            clearInterval(interval);
            setImportProgress(100);

            if ("error" in result) {
                onError(result.error);
                setCurrentFile(null); // Reset on error to allow retry
                setIsImporting(false);
                setShowImportGuide(false);
            } else {
                // CHECK FOR NEWLY DETECTED CHARACTERS (Strict Mode)
                if (result.detectedButIgnored && result.detectedButIgnored.length > 0) {
                    // Filter out already detected ones to be sure
                    const newChars = result.detectedButIgnored.filter(c => !detectedCharacters.includes(c));

                    if (newChars.length > 0) {
                        // WE NEED CONFIRMATION
                        setIsImporting(false); // Stop progress modal

                        // Add new characters to the list AND select them
                        setDetectedCharacters(prev => [...prev, ...newChars]);
                        setSelectedCharacters(prev => [...prev, ...newChars]);

                        setValidationMessage(`⚠️ L'analyse approfondie a détecté ${newChars.length} personnage(s) supplémentaire(s). Veuillez confirmer.`);
                        setValidationModalOpen(true);
                        return; // STOP HERE
                    }
                }

                await prepareDiagnosticsValidation(result, customTitle);
                setCurrentFile(null);
            }
        } catch {
            onError("Erreur lors de l'analyse approfondie.");
            setIsImporting(false);
            setCurrentFile(null);
            setShowImportGuide(false);
        }
    };


    // --- HANDLERS (AI IMPORT) ---

    const cancelAiImport = () => {
        aiImportCancelledRef.current = true;
        setIsAiImporting(false);
        setAiImportStep(0);
        setAiImportProgress(0);
        setAiImportElapsedSec(0);
        aiImportIntervalsRef.current.forEach((id) => clearInterval(id));
        aiImportIntervalsRef.current = [];
    };

    const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset State
        setIsAiImporting(true);
        aiImportCancelledRef.current = false;
        setAiImportStep(1); // Step 1: Extraction
        setAiImportProgress(0);
        setAiImportElapsedSec(0);
        setAiImportFileName(file.name || "Document");
        setAiImportFileSizeMb(Math.max(0.1, file.size / (1024 * 1024)));
        aiImportIntervalsRef.current = [];

        // Simulate extraction (Step 1)
        const extractionInterval = setInterval(() => {
            setAiImportProgress((prev) => Math.min(prev + 5, 12));
        }, 180);
        aiImportIntervalsRef.current.push(extractionInterval);

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Finish Step 1
            clearInterval(extractionInterval);
            setAiImportProgress(12);
            await new Promise((r) => setTimeout(r, 250));

            if (aiImportCancelledRef.current) return;

            // Step 2: Text formatting
            setAiImportStep(2);
            setAiImportProgress(14);
            const formattingStartMs = Date.now();

            const formattingInterval = setInterval(() => {
                const elapsedSec = Math.floor((Date.now() - formattingStartMs) / 1000);
                setAiImportElapsedSec(elapsedSec);
                setAiImportProgress(getFormattingProgress(elapsedSec));
            }, 700);
            aiImportIntervalsRef.current.push(formattingInterval);

            const result = await importScriptWithAI(formData);

            clearInterval(formattingInterval);

            if (aiImportCancelledRef.current) return;

            setAiImportProgress((prev) => Math.max(prev, 90));
            await new Promise((r) => setTimeout(r, 200));

            if ("error" in result) {
                onError(result.error);
                setIsAiImporting(false);
                setAiImportStep(0);
            } else {
                // Step 3: Final diagnostics (blocking)
                setAiImportStep(3);
                setAiImportProgress((prev) => Math.max(prev, 90));

                const finalScript = {
                    ...result,
                    title: result.title || file.name.replace(".pdf", ""),
                };

                await prepareDiagnosticsValidation(finalScript, finalScript.title || file.name.replace(".pdf", ""), false);
                setAiImportProgress(100);
                setIsAiImporting(false);
                setAiImportStep(0);
                setAiImportElapsedSec(0);
            }
        } catch (err: unknown) {
            if (!aiImportCancelledRef.current) {
                const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'import Automatique.";
                onError(errorMessage);
                setIsAiImporting(false);
                setAiImportStep(0);
                setAiImportProgress(0);
            }
        } finally {
            e.target.value = "";
            aiImportIntervalsRef.current.forEach((id) => clearInterval(id));
            aiImportIntervalsRef.current = [];
        }
    };

    // --- UI HELPERS ---

    const addCharacter = () => {
        if (!newCharName.trim()) return;
        const name = newCharName.trim().toUpperCase();
        if (!detectedCharacters.includes(name)) {
            setDetectedCharacters((prev) => [...prev, name]);
            setSelectedCharacters((prev) => [...prev, name]);
        }
        setNewCharName("");
    };

    const handleRenameCharacter = (oldName: string) => {
        const finalNewName = tempCharName.trim().toUpperCase();
        if (!finalNewName || finalNewName === oldName) {
            setEditingChar(null);
            return;
        }
        setDetectedCharacters((prev) =>
            prev.map((c) => (c === oldName ? finalNewName : c))
        );
        setSelectedCharacters((prev) =>
            prev.map((c) => (c === oldName ? finalNewName : c))
        );
        setEditingChar(null);
    };

    const toggleCharacter = (char: string) => {
        setSelectedCharacters((prev) =>
            prev.includes(char)
                ? prev.filter((c) => c !== char)
                : [...prev, char]
        );
    };

    const setDiagnosticsDecision = (id: string, decision: ValidationDecision) => {
        setDiagnosticsDecisions((prev) => ({ ...prev, [id]: decision }));
    };

    const toggleCollectiveMember = (collectiveId: string, member: string) => {
        setCollectiveResolutionsById((prev) => {
            const current = prev[collectiveId];
            if (!current) return prev;

            const normalized = member.toUpperCase().trim();
            const hasMember = current.members.includes(normalized);

            return {
                ...prev,
                [collectiveId]: {
                    ...current,
                    members: hasMember
                        ? current.members.filter((m) => m !== normalized)
                        : [...current.members, normalized],
                },
            };
        });
    };

    const finalizeImportWithDiagnostics = async () => {
        if (!pendingScriptForSave || !diagnosticsResult) return;

        const missingDecision = diagnosticsResult.blockingDecisions.find((item) => !diagnosticsDecisions[item.id]);
        if (missingDecision) {
            onError("Veuillez traiter toutes les suggestions avant de sauvegarder.");
            return;
        }

        const acceptedAliases = diagnosticsResult.aliasSuggestions.filter((item) => diagnosticsDecisions[item.id] === "accept");
        const acceptedCollectives = diagnosticsResult.collectiveSuggestions.filter((item) => diagnosticsDecisions[item.id] === "accept");

        const aliases: Record<string, string> = {};
        acceptedAliases.forEach((alias) => {
            const selectedTarget = (aliasTargetsById[alias.id] || alias.target || "").toUpperCase().trim();
            if (selectedTarget) {
                aliases[alias.source] = selectedTarget;
            }
        });

        const globalCollectives: ScriptMappings["collectives"]["global"] = [];
        const bySceneCollectives: ScriptMappings["collectives"]["by_scene"] = [];

        acceptedCollectives.forEach((collective) => {
            const resolution = collectiveResolutionsById[collective.id] || {
                label: collective.label,
                scope: collective.scope,
                sceneIndex: collective.sceneIndex,
                members: collective.members,
            };

            const members = Array.from(new Set((resolution.members || []).map((member) => member.toUpperCase().trim()).filter(Boolean)));
            if (members.length === 0) return;

            if (resolution.scope === "scene" && typeof resolution.sceneIndex === "number") {
                bySceneCollectives.push({
                    scene_index: resolution.sceneIndex,
                    label: resolution.label,
                    members,
                });
                return;
            }

            globalCollectives.push({
                label: resolution.label,
                members,
            });
        });

        const canonicalCharacters = diagnosticsResult.canonicalCharacters.map((c) => c.toUpperCase().trim()).filter(Boolean);
        const mappings: ScriptMappings = {
            canonical_characters: canonicalCharacters,
            aliases,
            collectives: {
                global: globalCollectives,
                by_scene: bySceneCollectives,
            },
        };

        const submission: ImportValidationSubmission = {
            diagnostics: diagnosticsResult,
            decisions: diagnosticsDecisions,
            mappings,
        };

        setIsImporting(true);
        setImportProgress(100);

        const saveResult = await saveScriptWithImportValidation(pendingScriptForSave, submission);
        setIsImporting(false);

        if ("error" in saveResult) {
            onError(saveResult.error);
            return;
        }

        await onImportComplete();
        resetDiagnosticsState();
        setValidationModalOpen(false);
        setShowImportGuide(false);
    };

    // --- RENDER ---

    if (!showImportGuide) {
        // Still show progress modals if working
        if (!isImporting && !isAiImporting && !validationModalOpen && !diagnosticsModalOpen) return null;
    }

    return (
        <>
            {/* 1. PROGRESS MODAL (LEGACY / DEEP PARSING) */}
            {isImporting && !isAiImporting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    {/* Same style as previous modal */}
                    <div className="bg-popover border border-primary/20 p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(124,58,237,0.3)] animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto skeleton-shimmer">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Analyse approfondie...</h3>
                                <p className="text-muted-foreground text-sm">Repeto relie chaque réplique à son personnage</p>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.min(importProgress, 100)}%` }} />
                                </div>
                                <p className="text-primary font-bold text-lg">{Math.round(importProgress)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 1bis. PROGRESS MODAL (AI IMPORT) */}
            {isAiImporting && (
                <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-popover border border-emerald-500/30 p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(16,185,129,0.25)] animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">{aiStepLabel}</h3>
                                <p className="text-muted-foreground text-sm">{aiStepDescription}</p>
                                <p className="text-xs text-emerald-400 mt-2">{aiStepActivity}</p>
                                {aiImportStep >= 2 && (
                                    <p className="text-xs text-emerald-400/90 mt-1">
                                        Temps écoulé: {aiImportElapsedSec}s
                                    </p>
                                )}
                                {aiImportFileName && (
                                    <p className="text-[11px] text-muted-foreground mt-2">
                                        Fichier: <span className="font-medium text-foreground">{aiImportFileName}</span> ({aiImportFileSizeMb.toFixed(1)} Mo)
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${Math.min(aiImportProgress, 100)}%` }}
                                    />
                                </div>
                                <p className="text-emerald-400 font-bold text-lg">{Math.round(aiImportProgress)}%</p>
                                <p className="text-[11px] text-muted-foreground">Progression estimée</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Suivi du traitement</p>
                                <div className="space-y-2">
                                    {importTimeline.map((item) => (
                                        <div key={item.label} className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === "done" ? "bg-emerald-400" : item.status === "active" ? "bg-cyan-400 animate-pulse" : "bg-white/20"}`} />
                                                <span className={`text-xs truncate ${item.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{item.label}</span>
                                            </div>
                                            <span className={`text-[11px] shrink-0 ${item.status === "done" ? "text-emerald-400" : item.status === "active" ? "text-cyan-400" : "text-muted-foreground"}`}>
                                                {item.detail}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
                                <p className="text-[11px] text-muted-foreground">
                                    Traitement variable selon la qualité du PDF (OCR, structure, longueur). Cette jauge suit une estimation.
                                </p>
                            </div>
                            <Button variant="outline" onClick={cancelAiImport} className="w-full border-white/15 hover:bg-white/10">
                                Annuler l&apos;import
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. VALIDATION MODAL */}
            {validationModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
                    <div className="bg-card dark:bg-[#121212] border border-border/60 dark:border-white/10 p-6 rounded-3xl w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" onClick={() => setValidationModalOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-foreground">Prêt à importer ?</h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                Vérifiez la liste canonique des personnages. Ensuite, la vérification finale proposera les fusions, collectifs et scènes à valider.
                            </p>
                            {validationMessage && (
                                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-500 text-sm animate-in fade-in slide-in-from-top-2">
                                    <div className="w-5 h-5 shrink-0 mt-0.5"><Crown className="w-5 h-5" /></div>
                                    <p className="font-medium">{validationMessage}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Titre du script</label>
                                <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ex: Roméo et Juliette" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Personnages ({selectedCharacters.length})</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {detectedCharacters.map(char => (
                                        <div key={char} className="space-y-2">
                                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedCharacters.includes(char) ? 'bg-primary/20 border-primary/50 text-foreground' : 'bg-card border-white/10 text-muted-foreground hover:bg-white/10'}`}>
                                                <div onClick={() => toggleCharacter(char)} className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 cursor-pointer ${selectedCharacters.includes(char) ? 'bg-primary border-primary' : 'border-white/20'}`}>
                                                    {selectedCharacters.includes(char) && <Check className="w-3 h-3 text-foreground" />}
                                                </div>
                                                {editingChar === char ? (
                                                    <input autoFocus type="text" value={tempCharName} onChange={(e) => setTempCharName(e.target.value)} onBlur={() => handleRenameCharacter(char)} onKeyDown={(e) => e.key === 'Enter' && handleRenameCharacter(char)} className="flex-1 bg-white/10 border-none rounded px-2 py-0.5 text-foreground focus:outline-none" />
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                                        <div className="flex flex-col min-w-0" onClick={() => toggleCharacter(char)}>
                                                            <span className="font-semibold truncate cursor-pointer">{char}</span>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-foreground/30 hover:text-foreground" onClick={(e) => { e.stopPropagation(); setEditingChar(char); setTempCharName(char); }}>
                                                            <Edit3 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <input type="text" value={newCharName} onChange={(e) => setNewCharName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCharacter()} className="flex-1 bg-card border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ajouter un personnage..." />
                                    <Button variant="outline" size="icon" onClick={addCharacter} className="rounded-xl border-white/10 hover:bg-white/10">
                                        <UserPlus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <Button onClick={startDeepParsing} disabled={selectedCharacters.length === 0} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl text-lg shadow-lg mt-6">
                            Lancer l&apos;analyse finale
                        </Button>
                    </div>
                </div>
            )}

            {/* 3. IA DIAGNOSTICS MODAL (BLOQUANT) */}
            {diagnosticsModalOpen && diagnosticsResult && (
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-300 p-4">
                    <div className="bg-card dark:bg-[#121212] border border-border/60 dark:border-white/10 p-6 rounded-3xl w-full max-w-3xl shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-foreground/50 hover:text-foreground"
                            onClick={() => {
                                resetDiagnosticsState();
                                setShowImportGuide(false);
                            }}
                        >
                            <X className="w-5 h-5" />
                        </Button>

                        <div className="mb-5">
                            <h2 className="text-2xl font-bold text-foreground">Validation obligatoire</h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                L&apos;import est bloqué tant que chaque suggestion n&apos;est pas traitée (Accepter ou Rejeter).
                            </p>
                            <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${diagnosticsPendingCount > 0 ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"}`}>
                                {diagnosticsPendingCount > 0 ? `${diagnosticsPendingCount} décision(s) restante(s)` : "Toutes les décisions sont traitées"}
                            </div>
                        </div>

                        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Liste canonique ({diagnosticsResult.canonicalCharacters.length})</label>
                                <div className="flex flex-wrap gap-2">
                                    {diagnosticsResult.canonicalCharacters.map((character) => (
                                        <span key={`canonical-${character}`} className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30">
                                            {character}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Suggestions de fusion / alias ({diagnosticsResult.aliasSuggestions.length})
                                </label>
                                {diagnosticsResult.aliasSuggestions.length === 0 && (
                                    <p className="text-xs text-muted-foreground">Aucune fusion suggérée.</p>
                                )}
                                <div className="space-y-2">
                                    {diagnosticsResult.aliasSuggestions.map((alias) => {
                                        const decision = diagnosticsDecisions[alias.id];
                                        return (
                                            <div key={alias.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold">{alias.source}</span>
                                                    <span className="text-xs text-muted-foreground">→</span>
                                                    <Select
                                                        value={aliasTargetsById[alias.id] || alias.target}
                                                        onValueChange={(value) => setAliasTargetsById((prev) => ({ ...prev, [alias.id]: value }))}
                                                    >
                                                        <SelectTrigger className="h-8 w-[220px] text-xs bg-white/5 border-white/10 rounded-lg text-muted-foreground">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-popover dark:bg-[#1a1a1a] border-border dark:border-white/10">
                                                            {diagnosticsResult.canonicalCharacters
                                                                .filter((candidate) => candidate !== alias.source)
                                                                .map((candidate) => (
                                                                <SelectItem key={`${alias.id}-${candidate}`} value={candidate} className="text-xs uppercase">
                                                                    {candidate}
                                                                </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <span className="text-[10px] text-muted-foreground">Confiance {(alias.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{alias.reason}</p>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={decision === "accept" ? "default" : "outline"}
                                                        className="h-7 text-xs"
                                                        onClick={() => setDiagnosticsDecision(alias.id, "accept")}
                                                    >
                                                        Accepter
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={decision === "reject" ? "default" : "outline"}
                                                        className="h-7 text-xs"
                                                        onClick={() => setDiagnosticsDecision(alias.id, "reject")}
                                                    >
                                                        Rejeter
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Rôles collectifs ({diagnosticsResult.collectiveSuggestions.length})
                                </label>
                                {diagnosticsResult.collectiveSuggestions.length === 0 && (
                                    <p className="text-xs text-muted-foreground">Aucun rôle collectif suggéré.</p>
                                )}
                                <div className="space-y-2">
                                    {diagnosticsResult.collectiveSuggestions.map((collective) => {
                                        const decision = diagnosticsDecisions[collective.id];
                                        const state = collectiveResolutionsById[collective.id];
                                        const members = state?.members || [];
                                        return (
                                            <div key={collective.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold">{collective.label}</span>
                                                    <span className="text-[10px] uppercase text-muted-foreground px-2 py-0.5 rounded bg-white/10 border border-white/10">
                                                        {collective.scope === "scene"
                                                            ? (sceneDisplayByStartIndex.get(collective.sceneIndex ?? -1) || `Scene ${collective.sceneIndex}`)
                                                            : "Global"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">Confiance {(collective.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{collective.reason}</p>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {diagnosticsResult.canonicalCharacters.map((candidate) => {
                                                        const selected = members.includes(candidate);
                                                        return (
                                                            <button
                                                                key={`${collective.id}-${candidate}`}
                                                                type="button"
                                                                onClick={() => toggleCollectiveMember(collective.id, candidate)}
                                                                className={`text-left text-xs px-2 py-1 rounded-lg border transition-colors ${selected ? "bg-primary/20 border-primary/40 text-foreground" : "bg-card border-white/10 text-muted-foreground hover:bg-white/10"}`}
                                                            >
                                                                {candidate}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={decision === "accept" ? "default" : "outline"}
                                                        className="h-7 text-xs"
                                                        disabled={members.length === 0}
                                                        onClick={() => setDiagnosticsDecision(collective.id, "accept")}
                                                    >
                                                        Accepter
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={decision === "reject" ? "default" : "outline"}
                                                        className="h-7 text-xs"
                                                        onClick={() => setDiagnosticsDecision(collective.id, "reject")}
                                                    >
                                                        Rejeter
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Scènes à confirmer ({diagnosticsResult.sceneDiagnostics.length})
                                </label>
                                {diagnosticsResult.sceneDiagnostics.length === 0 && (
                                    <p className="text-xs text-muted-foreground">Aucune ambiguïté de scène détectée.</p>
                                )}
                                <div className="space-y-2">
                                    {diagnosticsResult.sceneDiagnostics.map((sceneItem) => {
                                        const decision = diagnosticsDecisions[sceneItem.id];
                                        return (
                                            <div key={sceneItem.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold">
                                                        {sceneDisplayByStartIndex.get(sceneItem.sceneIndex) || `Scene ${sceneItem.sceneIndex}`}
                                                    </span>
                                                    <span className="text-[10px] uppercase text-muted-foreground px-2 py-0.5 rounded bg-white/10 border border-white/10">
                                                        {sceneItem.issue}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">Confiance {(sceneItem.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{sceneItem.reason}</p>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={decision === "accept" ? "default" : "outline"}
                                                        className="h-7 text-xs"
                                                        onClick={() => setDiagnosticsDecision(sceneItem.id, "accept")}
                                                    >
                                                        Confirmer
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={decision === "reject" ? "default" : "outline"}
                                                        className="h-7 text-xs"
                                                        onClick={() => setDiagnosticsDecision(sceneItem.id, "reject")}
                                                    >
                                                        Rejeter
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={finalizeImportWithDiagnostics}
                            disabled={diagnosticsPendingCount > 0}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl text-lg shadow-lg mt-6"
                        >
                            Valider et sauvegarder le script
                        </Button>
                    </div>
                </div>
            )}

            {/* 4. IMPORT CHOICE SCREEN (NEW 3-COLUMN LAYOUT) */}
            {showImportGuide && importChoice === "choice" && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => { setShowImportGuide(false); }}>
                    <div className="bg-card border border-border p-8 rounded-3xl w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setShowImportGuide(false); }} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted z-10"><X className="w-5 h-5" /></button>

                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Importer une pièce</h2>
                            <p className="text-muted-foreground mt-2 text-lg">Choisissez votre méthode d&apos;import</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 1. Catalog Import */}
                            <button
                                onClick={() => setImportChoice("catalog")}
                                className="cursor-pointer group relative flex flex-col h-full text-left"
                            >
                                <div className="absolute inset-0 bg-amber-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-amber-500/50" />
                                <div className="bg-card border border-border hover:border-amber-500/50 p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all group-hover:-translate-y-1 shadow-sm hover:shadow-xl w-full">
                                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
                                        <BookOpen className="w-10 h-10 text-amber-500" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground mb-3">Importer à partir du catalogue Repeto</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">
                                        Choisissez une pièce de théâtre directement depuis notre catalogue.
                                    </p>
                                    <div className="w-full py-3 rounded-xl bg-amber-500/10 text-amber-600 font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                        Parcourir le catalogue
                                    </div>
                                </div>
                            </button>

                            {/* 2. Format Repeto Import (Classic) */}
                            <label className="cursor-pointer group relative flex flex-col h-full">
                                <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-primary/50" />
                                <div className="bg-card border border-border hover:border-primary/50 p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all group-hover:-translate-y-1 shadow-sm hover:shadow-xl">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                        <Upload className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground mb-3">Importer votre texte au format Repeto</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">
                                        Pour les PDF déjà bien formatés (standard Repeto).
                                        <br />
                                        <span className="font-mono text-xs opacity-70 mt-2 block">[NOM] + Réplique</span>
                                    </p>
                                    <div className="w-full py-3 rounded-xl bg-primary/10 text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        Importer mon PDF
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => { setShowImportGuide(false); handleFileChange(e); }}
                                />
                            </label>

                            {/* 3. Assistant Repeto Import (AI) */}
                            <label className="cursor-pointer group relative flex flex-col h-full">
                                <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-emerald-500/50" />
                                <div className="bg-card border border-border hover:border-emerald-500/50 p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all group-hover:-translate-y-1 shadow-sm hover:shadow-xl">
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                                        <Sparkles className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground mb-3">Importer votre texte avec l&apos;assistant Repeto</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">
                                        Pour les PDF bruts. Converti en <span className="font-semibold">standard Repeto</span>.
                                        <br />
                                        <span className="text-emerald-500 text-xs font-semibold mt-2 block">L&apos;assistant détecte et aide à gérer les répliques.</span>
                                    </p>
                                    <div className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        PDF + Assistant Repeto
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleAiFileChange}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. CATALOG BROWSER */}
            {showImportGuide && importChoice === "catalog" && (
                <CatalogBrowser
                    onClose={() => { setImportChoice("choice"); }}
                    onImportComplete={async () => {
                        await onImportComplete();
                        setShowImportGuide(false);
                        setImportChoice("choice");
                    }}
                    onError={onError}
                />
            )}
        </>
    );
}
