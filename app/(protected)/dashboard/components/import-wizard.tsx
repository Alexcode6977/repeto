"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Upload,
    X,
    BookOpen,
    Sparkles,
    User,
    Users,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Check,
    AlertTriangle,
    FileText,
    Link,
    Layers,
    CheckCircle2,
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
import { WizardStepAlias } from "./wizard-step-alias";
import { WizardStepCollectives } from "./wizard-step-collectives";
import { WizardStepCasting, VoiceAssignment } from "./wizard-step-casting";
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

import {
    ValidationDecision, ValidationStep, ClassicImportStage,
    CollectiveResolutionState,
    CLASSIC_IMPORT_STAGE_ORDER, CLASSIC_IMPORT_STAGE_LABELS, THIRD_MULTI_TARGET,
    normalizeImportLabel, foldForComparison, isCollectiveLabel, isSceneScopedCollectiveLabel,
    splitCollectiveTokens, isExplicitNamedCollectiveLabel, levenshteinDistance, findBestAliasTarget,
    formatSceneLineForReview, getSceneOrderForLine, clamp
} from "./import-wizard-types";
export function ImportWizard({
    showImportGuide,
    setShowImportGuide,
    onImportComplete,
    onError,
}: ImportWizardProps) {
    // --- STATE ---
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [classicCurrentStage, setClassicCurrentStage] = useState<ClassicImportStage | null>(null);
    const [classicCompletedStages, setClassicCompletedStages] = useState<ClassicImportStage[]>([]);
    const [classicSkippedStages, setClassicSkippedStages] = useState<ClassicImportStage[]>([]);
    const [classicImportActivity, setClassicImportActivity] = useState("Préparation...");
    const [classicImportLogs, setClassicImportLogs] = useState<string[]>([]);
    const [classicImportElapsedSec, setClassicImportElapsedSec] = useState(0);

    // Final IA diagnostics validation (shared by classic + IA import)
    const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
    const [pendingScriptForSave, setPendingScriptForSave] = useState<ParsedScript | null>(null);
    const [diagnosticsResult, setDiagnosticsResult] = useState<ImportDiagnosticsResult | null>(null);
    const [diagnosticsDecisions, setDiagnosticsDecisions] = useState<Record<string, ValidationDecision>>({});
    const [classicCharacterLabels, setClassicCharacterLabels] = useState<string[]>([]);
    const [classicCharacterCountByLabel, setClassicCharacterCountByLabel] = useState<Record<string, number>>({});
    const [classicCharacterTargetByLabel, setClassicCharacterTargetByLabel] = useState<Record<string, string>>({});
    const [collectiveResolutionsById, setCollectiveResolutionsById] = useState<Record<string, CollectiveResolutionState>>({});
    const [validationStep, setValidationStep] = useState<ValidationStep>(1);
    const [collectivePreviewIndexById, setCollectivePreviewIndexById] = useState<Record<string, number>>({});
    const [collectiveContextCandidateId, setCollectiveContextCandidateId] = useState<string | null>(null);
    const [diagnosticsVoiceAssignments, setDiagnosticsVoiceAssignments] = useState<VoiceAssignment[] | null>(null);
    const [isSavingValidation, setIsSavingValidation] = useState(false);
    const [validationSaveError, setValidationSaveError] = useState<string | null>(null);

    // AI Import State
    const [isAiImporting, setIsAiImporting] = useState(false);
    const [aiImportStep, setAiImportStep] = useState(0);
    const [aiImportProgress, setAiImportProgress] = useState(0);
    const [aiImportElapsedSec, setAiImportElapsedSec] = useState(0);
    const [aiImportFileName, setAiImportFileName] = useState("");
    const [aiImportFileSizeMb, setAiImportFileSizeMb] = useState(0);

    // Choice screen state
    const [importChoice, setImportChoice] = useState<"choice" | "catalog">("choice");

    const aiImportIntervalsRef = useRef<NodeJS.Timeout[]>([]);
    const aiImportCancelledRef = useRef(false);
    const classicImportStartedAtRef = useRef<number | null>(null);
    const classicImportTimerRef = useRef<NodeJS.Timeout | null>(null);
    const classicCurrentStageRef = useRef<ClassicImportStage | null>(null);
    const classicHeartbeatAtSecRef = useRef<number>(-1);

    const resetDiagnosticsState = () => {
        setDiagnosticsModalOpen(false);
        setPendingScriptForSave(null);
        setDiagnosticsResult(null);
        setDiagnosticsDecisions({});
        setClassicCharacterLabels([]);
        setClassicCharacterCountByLabel({});
        setClassicCharacterTargetByLabel({});
        setCollectiveResolutionsById({});
        setValidationStep(1);
        setCollectivePreviewIndexById({});
        setCollectiveContextCandidateId(null);
        setDiagnosticsVoiceAssignments(null);
        setIsSavingValidation(false);
        setValidationSaveError(null);
    };

    const stopClassicImportTimer = () => {
        if (classicImportTimerRef.current) {
            clearInterval(classicImportTimerRef.current);
            classicImportTimerRef.current = null;
        }
    };

    const resetClassicImportUI = () => {
        stopClassicImportTimer();
        classicImportStartedAtRef.current = null;
        classicCurrentStageRef.current = null;
        classicHeartbeatAtSecRef.current = -1;
        setClassicCurrentStage(null);
        setClassicCompletedStages([]);
        setClassicSkippedStages([]);
        setClassicImportActivity("Préparation...");
        setClassicImportLogs([]);
        setClassicImportElapsedSec(0);
        setImportProgress(0);
    };

    const startClassicImportTimer = () => {
        stopClassicImportTimer();
        classicImportStartedAtRef.current = Date.now();
        classicHeartbeatAtSecRef.current = -1;
        setClassicImportElapsedSec(0);
        classicImportTimerRef.current = setInterval(() => {
            if (!classicImportStartedAtRef.current) return;
            const elapsed = Math.max(0, Math.floor((Date.now() - classicImportStartedAtRef.current) / 1000));
            setClassicImportElapsedSec(elapsed);
            if (
                elapsed > 0
                && elapsed % 8 === 0
                && elapsed !== classicHeartbeatAtSecRef.current
                && classicCurrentStageRef.current
            ) {
                classicHeartbeatAtSecRef.current = elapsed;
                const stageLabel = CLASSIC_IMPORT_STAGE_LABELS[classicCurrentStageRef.current];
                pushClassicImportLog(`${stageLabel} toujours en cours...`);
            }
        }, 1000);
    };

    const pushClassicImportLog = (message: string) => {
        setClassicImportLogs((prev) => {
            const elapsed = classicImportStartedAtRef.current
                ? Math.max(0, Math.floor((Date.now() - classicImportStartedAtRef.current) / 1000))
                : 0;
            const stamp = `[${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}]`;
            return [...prev, `${stamp} ${message}`].slice(-8);
        });
    };

    useEffect(() => {
        return () => {
            stopClassicImportTimer();
            aiImportIntervalsRef.current.forEach((id) => clearInterval(id));
            aiImportIntervalsRef.current = [];
        };
    }, []);

    useEffect(() => {
        classicCurrentStageRef.current = classicCurrentStage;
    }, [classicCurrentStage]);

    const prepareDiagnosticsValidation = async (
        parsedScript: ParsedScript,
        finalTitle: string,
        useLegacyProgress = true
    ): Promise<boolean> => {
        let diagnosticsProgressInterval: NodeJS.Timeout | null = null;

        if (!useLegacyProgress) {
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

        try {
            const scriptWithTitle: ParsedScript = {
                ...parsedScript,
                title: finalTitle,
            };

            const diagnostics = await runImportDiagnosticsAction(scriptWithTitle);

            if (!useLegacyProgress) {
                setAiImportProgress((prev) => Math.max(prev, 98));
            }

            if ("error" in diagnostics) {
                onError(diagnostics.error);
                return false;
            }

            const decisionState: Record<string, ValidationDecision> = {};

            const labelsMap = new Map<string, number>();
            (scriptWithTitle.lines || []).forEach((line) => {
                if (line.type !== "dialogue") return;
                const char = normalizeImportLabel(line.character || "");
                if (char) {
                    labelsMap.set(char, (labelsMap.get(char) || 0) + 1);
                }
            });
            const allLabels = Array.from(labelsMap.keys()).sort((a, b) => a.localeCompare(b, "fr"));
            const countByLabel = Object.fromEntries(labelsMap.entries());

            const targetByLabel: Record<string, string> = {};
            allLabels.forEach(label => { targetByLabel[label] = label; });
            diagnostics.aliasSuggestions.forEach(sug => {
                const targetCanon = normalizeImportLabel(sug.target || "");
                if (sug.confidence >= 0.45 && targetByLabel[sug.source] && targetCanon) {
                    targetByLabel[sug.source] = targetCanon;
                }
            });

            const collectiveState: Record<string, CollectiveResolutionState> = {};
            const collectivePreviewIndexes: Record<string, number> = {};
            diagnostics.collectiveSuggestions.forEach((item) => {
                collectiveState[item.id] = {
                    label: item.label,
                    scope: item.scope,
                    sceneIndex: item.sceneIndex,
                    members: [...item.members],
                };
                collectivePreviewIndexes[item.id] = 0;

                // Pre-mark them as collectives in the Alias step
                if (targetByLabel[item.label]) {
                    targetByLabel[item.label] = THIRD_MULTI_TARGET;
                }
            });

            setPendingScriptForSave(scriptWithTitle);
            setDiagnosticsResult(diagnostics);
            setDiagnosticsDecisions(decisionState);
            setClassicCharacterLabels(allLabels);
            setClassicCharacterCountByLabel(countByLabel);
            setClassicCharacterTargetByLabel(targetByLabel);
            setCollectiveResolutionsById(collectiveState);
            setCollectivePreviewIndexById(collectivePreviewIndexes);
            setValidationStep(1);
            setDiagnosticsModalOpen(true);
            return true;
        } finally {
            if (diagnosticsProgressInterval) {
                clearInterval(diagnosticsProgressInterval);
            }
        }
    };

    const diagnosticsPendingCount = useMemo(() => {
        if (!diagnosticsResult) return 0;
        return diagnosticsResult.blockingDecisions.filter((decision) => {
            if (decision.kind === "alias") return false;
            if (decision.kind === "collective") return false;
            return !diagnosticsDecisions[decision.id];
        }).length;
    }, [diagnosticsResult, diagnosticsDecisions]);

    const aliasPendingCount = 0;
    const collectivePendingCount = 0;

    const scenePendingCount = useMemo(() => {
        if (!diagnosticsResult) return 0;
        return diagnosticsResult.sceneDiagnostics.filter((item) => !diagnosticsDecisions[item.id]).length;
    }, [diagnosticsResult, diagnosticsDecisions]);

    const frozenCanonicalCharacters = useMemo(() => {
        const canonicalSet = new Set<string>();

        Object.values(classicCharacterTargetByLabel).forEach((target) => {
            const normalized = normalizeImportLabel(target || "");
            if (normalized && normalized !== normalizeImportLabel(THIRD_MULTI_TARGET)) {
                canonicalSet.add(normalized);
            }
        });

        return Array.from(canonicalSet).sort((a, b) => a.localeCompare(b, "fr"));
    }, [classicCharacterTargetByLabel]);

    const sceneDisplayByStartIndex = useMemo(() => {
        const map = new Map<number, string>();
        const scenes = pendingScriptForSave?.scenes || [];
        scenes.forEach((scene, order) => {
            map.set(scene.index, scene.title || `Scène ${order + 1}`);
        });
        return map;
    }, [pendingScriptForSave]);

    const sceneIssueLabel = (issue: "uncertain_boundary" | "ambiguous_label" | "other") => {
        if (issue === "ambiguous_label") return "Libellé ambigu";
        if (issue === "uncertain_boundary") return "Limite de scène incertaine";
        return "Point de contrôle";
    };

    const collectivePreviewById = useMemo(() => {
        const previews: Record<string, { samples: string[]; rationale: string; sceneCharacters: string[] }> = {};
        if (!diagnosticsResult || !pendingScriptForSave) return previews;

        const canonicalSet = new Set(frozenCanonicalCharacters);
        const lines = pendingScriptForSave.lines || [];
        const scenes = pendingScriptForSave.scenes || [];

        const orderedScenes = [...scenes].sort((a, b) => a.index - b.index);
        const getSceneBounds = (sceneIndex?: number) => {
            if (typeof sceneIndex !== "number") return { start: 0, end: lines.length };
            const currentIdx = orderedScenes.findIndex((scene) => scene.index === sceneIndex);
            if (currentIdx === -1) return { start: 0, end: lines.length };
            const start = orderedScenes[currentIdx].index;
            const end = currentIdx + 1 < orderedScenes.length ? orderedScenes[currentIdx + 1].index : lines.length;
            return { start, end };
        };

        diagnosticsResult.collectiveSuggestions.forEach((collective) => {
            const { start, end } = getSceneBounds(collective.scope === "scene" ? collective.sceneIndex : undefined);
            const scopeLines = lines.slice(start, end);
            const label = (collective.label || "").toUpperCase().trim();

            const sceneCharacters = Array.from(new Set(
                scopeLines
                    .filter((line) => line.type === "dialogue")
                    .map((line) => (line.character || "").toUpperCase().trim())
                    .filter((character) => canonicalSet.has(character))
            ));

            const directMatches = scopeLines
                .filter((line) => line.type === "dialogue" && (line.character || "").toUpperCase().trim() === label)
                .slice(0, 5);

            const fallback = scopeLines
                .filter((line) => line.type === "dialogue")
                .slice(0, 5);

            const samples = (directMatches.length > 0 ? directMatches : fallback).map((line) => {
                const text = (line.text || "").replace(/\s+/g, " ").trim();
                const cropped = text.length > 180 ? `${text.slice(0, 177)}...` : text;
                return `${line.character}: ${cropped}`;
            });

            const memberCount = (collective.members || []).length;
            const sceneCharacterCount = sceneCharacters.length;
            const rationale = collective.scope === "scene"
                ? `Suggestion: ${memberCount} membre(s) proposé(s). Dans cette scène, ${sceneCharacterCount} personnage(s) canonique(s) parlent. Je propose cette liaison car ce collectif apparaît dans ce contexte de scène.`
                : `Suggestion globale: ${memberCount} membre(s) proposé(s). Le libellé collectif réapparaît à plusieurs endroits du script avec ce groupe.`;

            previews[collective.id] = {
                samples,
                rationale,
                sceneCharacters,
            };
        });

        return previews;
    }, [diagnosticsResult, pendingScriptForSave, frozenCanonicalCharacters]);

    const scenePreviewById = useMemo(() => {
        const previews: Record<string, { suggestion: string; checks: string[]; samples: string[] }> = {};
        if (!diagnosticsResult || !pendingScriptForSave) return previews;

        const lines = pendingScriptForSave.lines || [];
        const scenes = [...(pendingScriptForSave.scenes || [])].sort((a, b) => a.index - b.index);
        const canonicalSet = new Set(frozenCanonicalCharacters);

        const getSceneBounds = (sceneIndex: number) => {
            const currentIdx = scenes.findIndex((scene) => scene.index === sceneIndex);
            if (currentIdx === -1) return { start: 0, end: lines.length };
            const start = scenes[currentIdx].index;
            const end = currentIdx + 1 < scenes.length ? scenes[currentIdx + 1].index : lines.length;
            return { start, end };
        };

        diagnosticsResult.sceneDiagnostics.forEach((sceneDiagnostic) => {
            const { start, end } = getSceneBounds(sceneDiagnostic.sceneIndex);
            const sceneLines = lines.slice(start, end).filter((line) => line.type === "dialogue");

            const unknownLabels = Array.from(new Set(sceneLines
                .map((line) => (line.character || "").toUpperCase().trim())
                .filter((label) => label && !canonicalSet.has(label))
            ));

            const samples = sceneLines
                .slice(0, 4)
                .map((line) => {
                    const text = (line.text || "").replace(/\s+/g, " ").trim();
                    const cropped = text.length > 180 ? `${text.slice(0, 177)}...` : text;
                    return `${line.character}: ${cropped}`;
                });

            const suggestion = sceneDiagnostic.issue === "ambiguous_label"
                ? `Suggestion: conserver la scène telle quelle, puis vérifier que les libellés non canoniques (${unknownLabels.join(", ") || "aucun"}) sont bien traités en alias ou collectif.`
                : `Suggestion: conserver ce découpage si les premières répliques de la scène forment un bloc cohérent.`;

            const checks = sceneDiagnostic.issue === "ambiguous_label"
                ? [
                    "Vérifier que chaque libellé de locuteur est mappé ou rejeté.",
                    "Confirmer que les premières répliques appartiennent bien à cette scène.",
                ]
                : [
                    "Comparer les 2 à 4 premières répliques avec la scène précédente.",
                    "Confirmer qu’un changement de contexte justifie la coupe.",
                ];

            previews[sceneDiagnostic.id] = {
                suggestion,
                checks,
                samples,
            };
        });

        return previews;
    }, [diagnosticsResult, pendingScriptForSave, frozenCanonicalCharacters]);


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

    const classicImportTimeline = useMemo(() => {
        const doneSet = new Set(classicCompletedStages);
        const skippedSet = new Set(classicSkippedStages);
        return CLASSIC_IMPORT_STAGE_ORDER.map((stage) => {
            const isDone = doneSet.has(stage);
            const isSkipped = skippedSet.has(stage);
            const isActive = classicCurrentStage === stage && !isDone;
            return {
                stage,
                label: CLASSIC_IMPORT_STAGE_LABELS[stage],
                status: isDone ? (isSkipped ? "skipped" : "done") : isActive ? "active" : "pending",
                detail: isDone ? (isSkipped ? "Ignoré" : "Terminé") : isActive ? "En cours" : "En attente",
            };
        });
    }, [classicCompletedStages, classicSkippedStages, classicCurrentStage]);

    // --- HANDLERS (LEGACY / STANDARD) ---

    const runClassicImportFlow = async (file: File) => {
        const completedStages = new Set<ClassicImportStage>();
        const skippedStages = new Set<ClassicImportStage>();

        const setClassicStageActive = (stage: ClassicImportStage, activity: string, log?: string) => {
            setClassicCurrentStage(stage);
            setClassicImportActivity(activity);
            if (log) pushClassicImportLog(log);
        };

        const markClassicStageDone = (stage: ClassicImportStage, log?: string) => {
            if (!completedStages.has(stage)) {
                completedStages.add(stage);
                const nextCompleted = Array.from(completedStages);
                setClassicCompletedStages(nextCompleted);
                setImportProgress(Math.round((nextCompleted.length / CLASSIC_IMPORT_STAGE_ORDER.length) * 100));
            }
            if (log) pushClassicImportLog(log);
        };

        const markClassicStageSkipped = (stage: ClassicImportStage, log?: string) => {
            if (!skippedStages.has(stage)) {
                skippedStages.add(stage);
                setClassicSkippedStages(Array.from(skippedStages));
            }
            markClassicStageDone(stage, log);
        };

        resetClassicImportUI();
        setIsImporting(true);
        startClassicImportTimer();
        setClassicStageActive("read", "Lecture du fichier PDF...", `Fichier reçu: ${file.name}`);
        markClassicStageDone("read", "Lecture du fichier terminée.");
        setClassicStageActive("detect", "Détection des personnages en cours...", "Détection automatique des personnages lancée.");

        try {
            const detectFormData = new FormData();
            detectFormData.append("file", file);

            const detected = await detectCharactersAction(detectFormData);
            if ("error" in detected) {
                onError(detected.error);
                return;
            }

            const normalizedCharacters = Array.from(
                new Set((detected.characters || []).map((item) => item.toUpperCase().trim()).filter(Boolean))
            );

            if (normalizedCharacters.length === 0) {
                onError("Aucun personnage n'a été détecté automatiquement.");
                return;
            }
            markClassicStageDone("detect", `${normalizedCharacters.length} personnage(s) détecté(s).`);

            let whitelist = [...normalizedCharacters];
            let finalResult: ParsedScript | null = null;

            for (let pass = 0; pass < 3; pass += 1) {
                const stage = (["parse_pass_1", "parse_pass_2", "parse_pass_3"][pass] as ClassicImportStage);
                setClassicStageActive(
                    stage,
                    `Parsing en cours (passe ${pass + 1}/3)...`,
                    `Parsing passe ${pass + 1} démarrée.`
                );

                const parseFormData = new FormData();
                parseFormData.append("file", file);
                const parsed = await finalizeParsingAction(parseFormData, whitelist);

                if ("error" in parsed) {
                    onError(parsed.error);
                    return;
                }

                finalResult = parsed;
                const lineCount = parsed.lines?.length || 0;
                const extraCharacters = (parsed.detectedButIgnored || [])
                    .map((item) => item.toUpperCase().trim())
                    .filter((item) => item.length > 0 && !whitelist.includes(item));

                if (extraCharacters.length === 0) {
                    markClassicStageDone(stage, `Passe ${pass + 1} terminée (${lineCount} répliques).`);
                    for (let skippedPass = pass + 1; skippedPass < 3; skippedPass += 1) {
                        const skippedStage = (["parse_pass_1", "parse_pass_2", "parse_pass_3"][skippedPass] as ClassicImportStage);
                        markClassicStageSkipped(skippedStage, `Passe ${skippedPass + 1} non nécessaire.`);
                    }
                    break;
                }

                markClassicStageDone(
                    stage,
                    `Passe ${pass + 1} terminée (${lineCount} répliques). ${extraCharacters.length} libellé(s) supplémentaire(s) détecté(s).`
                );
                whitelist = [...whitelist, ...extraCharacters];
            }

            if (!finalResult) {
                onError("Impossible de finaliser le parsing du script.");
                return;
            }

            setClassicStageActive("diagnostics", "Vérification finale en cours...", "Analyse finale lancée (alias, collectifs, scènes).");
            const finalTitle = detected.title || file.name.replace(".pdf", "");
            const diagnosticsReady = await prepareDiagnosticsValidation(finalResult, finalTitle);
            if (!diagnosticsReady) return;

            markClassicStageDone("diagnostics", "Vérification finale terminée.");
            setClassicImportActivity("Analyse terminée. Ouverture de la validation...");
            setShowImportGuide(false);
        } catch (error) {
            console.error("[runClassicImportFlow] Error:", error);
            onError("Erreur lors de l'import classique.");
            setShowImportGuide(false);
        } finally {
            stopClassicImportTimer();
            setIsImporting(false);
            setImportProgress(0);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        await runClassicImportFlow(file);
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

                const diagnosticsReady = await prepareDiagnosticsValidation(
                    finalScript,
                    finalScript.title || file.name.replace(".pdf", ""),
                    false
                );
                if (!diagnosticsReady) {
                    setIsAiImporting(false);
                    setAiImportStep(0);
                    setAiImportProgress(0);
                    return;
                }
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

    const setCollectivePreviewOffset = (collectiveId: string, direction: "prev" | "next") => {
        const max = (collectivePreviewById[collectiveId]?.samples.length || 0) - 1;
        if (max <= 0) return;
        setCollectivePreviewIndexById((prev) => {
            const current = prev[collectiveId] ?? 0;
            const next = direction === "next"
                ? Math.min(max, current + 1)
                : Math.max(0, current - 1);
            return { ...prev, [collectiveId]: next };
        });
    };

    const setValidationStepSafely = (nextStep: ValidationStep) => {
        if (nextStep === 2 && aliasPendingCount > 0) {
            onError("Traitez d'abord toutes les suggestions d'alias.");
            return;
        }
        if (nextStep === 3 && (aliasPendingCount > 0 || collectivePendingCount > 0)) {
            onError("Terminez d'abord les alias puis les rôles collectifs.");
            return;
        }
        if (nextStep === 4 && diagnosticsPendingCount > 0) {
            onError("Veuillez régler toutes les suggestions (y compris les scènes) avant de passer au casting vocal.");
            return;
        }
        setValidationStep(nextStep);
    };

    const finalizeImportWithDiagnostics = async () => {
        if (isSavingValidation) return;
        setValidationSaveError(null);

        if (!pendingScriptForSave || !diagnosticsResult) {
            const message = "État d'import incomplet. Fermez puis relancez l'import.";
            setValidationSaveError(message);
            onError(message);
            return;
        }

        const aliases: Record<string, string> = {};
        Object.entries(classicCharacterTargetByLabel).forEach(([source, target]) => {
            const normalizedSource = source.toUpperCase().trim();
            const normalizedTarget = (target || "").toUpperCase().trim();
            if (normalizedSource !== normalizedTarget && normalizedTarget && normalizedTarget !== THIRD_MULTI_TARGET) {
                aliases[normalizedSource] = normalizedTarget;
            }
        });

        const globalCollectives: ScriptMappings["collectives"]["global"] = [];
        const bySceneCollectives: ScriptMappings["collectives"]["by_scene"] = [];
        const frozenCanonicalSet = new Set(frozenCanonicalCharacters);

        Object.values(collectiveResolutionsById).forEach((resolution) => {
            const members = Array.from(new Set(
                (resolution.members || [])
                    .map((member) => member.toUpperCase().trim())
                    .filter((member) => member && frozenCanonicalSet.has(member))
            ));
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

        const canonicalCharacters = [...frozenCanonicalCharacters];
        const mappings: ScriptMappings = {
            canonical_characters: canonicalCharacters,
            aliases,
            collectives: {
                global: globalCollectives,
                by_scene: bySceneCollectives,
            },
        };

        const effectiveDecisions: Record<string, ValidationDecision> = { ...diagnosticsDecisions };

        // Alias decisions are inferred from user mappings in step 1.
        diagnosticsResult.aliasSuggestions.forEach((suggestion) => {
            if (effectiveDecisions[suggestion.id]) return;
            const source = normalizeImportLabel(suggestion.source || "");
            const expectedTarget = normalizeImportLabel(suggestion.target || "");
            const mappedTarget = normalizeImportLabel(aliases[source] || "");
            effectiveDecisions[suggestion.id] = mappedTarget && mappedTarget === expectedTarget ? "accept" : "reject";
        });

        // Collective decisions are inferred from user collective resolutions in step 2.
        diagnosticsResult.collectiveSuggestions.forEach((suggestion) => {
            if (effectiveDecisions[suggestion.id]) return;

            const resolution = collectiveResolutionsById[suggestion.id];
            if (!resolution) {
                effectiveDecisions[suggestion.id] = "reject";
                return;
            }

            const normalizedSuggestionLabel = normalizeImportLabel(suggestion.label || "");
            const normalizedResolutionLabel = normalizeImportLabel(resolution.label || "");
            const sameLabel = normalizedSuggestionLabel === normalizedResolutionLabel;
            const sameScope = suggestion.scope === resolution.scope;
            const sameScene = suggestion.scope === "scene"
                ? suggestion.sceneIndex === resolution.sceneIndex
                : true;

            const members = Array.from(new Set(
                (resolution.members || [])
                    .map((member) => normalizeImportLabel(member || ""))
                    .filter((member) => member && frozenCanonicalSet.has(member))
            ));
            const hasMembers = members.length > 0;

            effectiveDecisions[suggestion.id] = (sameLabel && sameScope && sameScene && hasMembers) ? "accept" : "reject";
        });

        // Only scenes still require explicit manual decision buttons.
        const missingSceneDecision = diagnosticsResult.sceneDiagnostics.find(
            (sceneItem) => !effectiveDecisions[sceneItem.id]
        );
        if (missingSceneDecision) {
            setValidationStep(3);
            const message = `Décision manquante: Scène ${missingSceneDecision.sceneIndex}. Confirmez ou rejetez cette alerte avant sauvegarde.`;
            setValidationSaveError(message);
            onError(message);
            return;
        }

        setDiagnosticsDecisions(effectiveDecisions);

        const submission: ImportValidationSubmission = {
            diagnostics: diagnosticsResult,
            decisions: effectiveDecisions,
            mappings,
            voiceAssignments: diagnosticsVoiceAssignments || [],
        };

        try {
            setIsSavingValidation(true);
            setIsImporting(true);
            setImportProgress(100);

            const saveResult = await saveScriptWithImportValidation(pendingScriptForSave, submission);

            if ("error" in saveResult) {
                setValidationSaveError(saveResult.error);
                onError(saveResult.error);
                return;
            }

            // Trigger background vocalization
            if (saveResult.scriptId) {
                fetch('/api/vocalize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scriptId: saveResult.scriptId,
                        sourceType: 'private_script'
                    })
                }).catch(err => console.error("Failed to trigger vocalization", err));
            }

            await onImportComplete();
            resetDiagnosticsState();
            setShowImportGuide(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erreur inattendue pendant la sauvegarde.";
            setValidationSaveError(message);
            onError(message);
        } finally {
            setIsSavingValidation(false);
            setIsImporting(false);
            setImportProgress(0);
        }
    };

    // --- RENDER ---

    if (!showImportGuide) {
        // Still show progress modals if working
        if (!isImporting && !isAiImporting && !diagnosticsModalOpen) return null;
    }

    return (
        <>
            {/* 1. PROGRESS MODAL (LEGACY / DEEP PARSING) */}
            {isImporting && !isAiImporting && !diagnosticsModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-popover border border-primary/20 p-8 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(124,58,237,0.3)] animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-5">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto skeleton-shimmer">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Analyse du script</h3>
                                <p className="text-muted-foreground text-sm">{classicImportActivity}</p>
                                <p className="text-xs text-primary mt-1">Temps écoulé: {classicImportElapsedSec}s</p>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-primary to-purple-400 rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.min(importProgress, 100)}%` }} />
                                </div>
                                <p className="text-primary font-bold text-lg">{Math.round(importProgress)}%</p>
                                <p className="text-[11px] text-muted-foreground">Progression réelle par étapes validées</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Étapes du traitement</p>
                                <div className="space-y-2">
                                    {classicImportTimeline.map((item) => (
                                        <div key={item.stage} className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === "done" ? "bg-emerald-400" : item.status === "skipped" ? "bg-amber-300" : item.status === "active" ? "bg-cyan-400 animate-pulse" : "bg-white/20"}`} />
                                                <span className={`text-xs truncate ${item.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            <span className={`text-[11px] shrink-0 ${item.status === "done" ? "text-emerald-400" : item.status === "skipped" ? "text-amber-300" : item.status === "active" ? "text-cyan-400" : "text-muted-foreground"}`}>
                                                {item.detail}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Journal d&apos;analyse</p>
                                {classicImportLogs.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">Initialisation...</p>
                                ) : (
                                    <div className="space-y-1">
                                        {classicImportLogs.map((entry, index) => (
                                            <p key={`${entry}-${index}`} className="text-xs text-foreground/90">
                                                {entry}
                                            </p>
                                        ))}
                                    </div>
                                )}
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


            {/* 2. DIAGNOSTICS MODAL (BLOQUANT) */}
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

                        <div className="grid grid-cols-4 gap-2 mb-5">
                            <button
                                type="button"
                                className={`rounded-lg border px-3 py-2 text-left ${validationStep === 1 ? "border-primary/60 bg-primary/10" : "border-white/10 bg-white/5"}`}
                                onClick={() => setValidationStep(1)}
                            >
                                <p className="text-xs font-semibold text-foreground">1. Alias</p>
                                <p className="text-[11px] text-muted-foreground">{aliasPendingCount} restant(s)</p>
                            </button>
                            <button
                                type="button"
                                className={`rounded-lg border px-3 py-2 text-left ${validationStep === 2 ? "border-primary/60 bg-primary/10" : "border-white/10 bg-white/5"}`}
                                onClick={() => setValidationStepSafely(2)}
                            >
                                <p className="text-xs font-semibold text-foreground">2. Collectifs</p>
                                <p className="text-[11px] text-muted-foreground">{collectivePendingCount} restant(s)</p>
                            </button>
                            <button
                                type="button"
                                className={`rounded-lg border px-3 py-2 text-left ${validationStep === 3 ? "border-primary/60 bg-primary/10" : "border-white/10 bg-white/5"}`}
                                onClick={() => setValidationStepSafely(3)}
                            >
                                <p className="text-xs font-semibold text-foreground">3. Scènes</p>
                                <p className="text-[11px] text-muted-foreground">{scenePendingCount} restant(s)</p>
                            </button>
                            <button
                                type="button"
                                className={`rounded-lg border px-3 py-2 text-left ${validationStep === 4 ? "border-primary/60 bg-primary/10" : "border-white/10 bg-white/5"}`}
                                onClick={() => setValidationStepSafely(4)}
                            >
                                <p className="text-xs font-semibold text-foreground">4. Voix IA</p>
                                <p className="text-[11px] text-muted-foreground">Optionnel</p>
                            </button>
                        </div>

                        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                            {validationStep === 1 && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Étape 1 · Liaisons et Alias ({classicCharacterLabels.length} personnages)
                                    </label>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Vérifiez les personnages détectés. Les suggestions de l'IA sont pré-remplies.
                                    </p>
                                    <WizardStepAlias
                                        options={frozenCanonicalCharacters}
                                        labels={classicCharacterLabels}
                                        targetByLabel={classicCharacterTargetByLabel}
                                        setTargetByLabel={setClassicCharacterTargetByLabel}
                                        countByLabel={classicCharacterCountByLabel}
                                        normalizeLabel={normalizeImportLabel}
                                        multiTargetConstant={THIRD_MULTI_TARGET}
                                    />
                                </div>
                            )}

                            {validationStep > 1 && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Liste canonique figée ({frozenCanonicalCharacters.length})
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {frozenCanonicalCharacters.map((character) => (
                                            <span key={`frozen-${character}`} className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30">
                                                {character}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {validationStep === 2 && (
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Étape 2 · Rôles collectifs ({diagnosticsResult.collectiveSuggestions.length})
                                    </label>
                                    <WizardStepCollectives
                                        candidates={Object.entries(collectiveResolutionsById).map(([id, s]) => ({
                                            id: id,
                                            label: s.label,
                                            scope: s.scope,
                                            sceneOrder: s.sceneIndex,
                                            sceneOrders: s.sceneIndex !== undefined ? [s.sceneIndex] : [],
                                            count: classicCharacterCountByLabel[s.label] || 1,
                                        }))}
                                        scopeById={Object.fromEntries(
                                            Object.entries(collectiveResolutionsById).map(([k, v]) => [k, v.scope])
                                        )}
                                        setScopeById={(updater) => {
                                            setCollectiveResolutionsById((prev) => {
                                                const next = typeof updater === "function"
                                                    ? updater(Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.scope as "global" | "scene"])))
                                                    : updater;
                                                const copy = { ...prev };
                                                Object.keys(next).forEach(k => {
                                                    if (copy[k]) copy[k].scope = next[k];
                                                });
                                                return copy;
                                            });
                                        }}
                                        sceneOrderById={Object.fromEntries(
                                            Object.entries(collectiveResolutionsById)
                                                .filter(([_, v]) => v.sceneIndex !== undefined)
                                                .map(([k, v]) => [k, v.sceneIndex!])
                                        )}
                                        setSceneOrderById={(updater) => {
                                            setCollectiveResolutionsById((prev) => {
                                                const next = typeof updater === "function"
                                                    ? updater(Object.fromEntries(Object.entries(prev).filter(([_, v]) => v.sceneIndex !== undefined).map(([k, v]) => [k, v.sceneIndex!])))
                                                    : updater;
                                                const copy = { ...prev };
                                                Object.keys(next).forEach(k => {
                                                    if (copy[k]) copy[k].sceneIndex = next[k];
                                                });
                                                return copy;
                                            });
                                        }}
                                        membersById={Object.fromEntries(
                                            Object.entries(collectiveResolutionsById).map(([k, v]) => [k, v.members])
                                        )}
                                        sceneWindows={(pendingScriptForSave?.scenes || []).map((s, idx) => ({
                                            order: s.index ?? idx,
                                            title: s.title || `Scène ${idx + 1}`,
                                            start: 0,
                                            end: 0
                                        }))}
                                        canonicalCharacters={frozenCanonicalCharacters}
                                        contextCandidateId={collectiveContextCandidateId}
                                        setContextCandidateId={setCollectiveContextCandidateId}
                                        contextById={Object.fromEntries(
                                            Object.entries(collectivePreviewById).filter(([id, state]) => !!state).map(([id, preview]) => {
                                                const originalSuggestion = diagnosticsResult.collectiveSuggestions.find(s => s.id === id);
                                                const sceneIndex = collectiveResolutionsById[id]?.sceneIndex ?? originalSuggestion?.sceneIndex ?? 0;
                                                return [
                                                    id,
                                                    {
                                                        sceneOrder: sceneIndex,
                                                        sceneTitle: sceneDisplayByStartIndex.get(sceneIndex) || `Scène ${sceneIndex}`,
                                                        lines: preview.samples.map((text, i) => ({
                                                            id: `sample-${i}`,
                                                            type: "dialogue",
                                                            character: originalSuggestion?.label || "",
                                                            text
                                                        }))
                                                    }
                                                ];
                                            })
                                        )}
                                        toggleMember={toggleCollectiveMember}
                                    />
                                </div>
                            )}

                            {validationStep === 3 && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Étape 3 · Scènes à confirmer ({diagnosticsResult.sceneDiagnostics.length})
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Confirmer = conserver la suggestion de découpage. Rejeter = ignorer l&apos;alerte.
                                    </p>
                                    {diagnosticsResult.sceneDiagnostics.length === 0 && (
                                        <p className="text-xs text-muted-foreground">Aucune ambiguïté de scène détectée.</p>
                                    )}
                                    <div className="space-y-2">
                                        {diagnosticsResult.sceneDiagnostics.map((sceneItem) => {
                                            const decision = diagnosticsDecisions[sceneItem.id];
                                            const preview = scenePreviewById[sceneItem.id];
                                            return (
                                                <div key={sceneItem.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                                    <div className="grid gap-3 md:grid-cols-[1fr_340px]">
                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-sm font-semibold">
                                                                    {sceneDisplayByStartIndex.get(sceneItem.sceneIndex) || `Scène ${sceneItem.sceneIndex}`}
                                                                </span>
                                                                <span className="text-[10px] uppercase text-muted-foreground px-2 py-0.5 rounded bg-white/10 border border-white/10">
                                                                    {sceneIssueLabel(sceneItem.issue)}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">Confiance {(sceneItem.confidence * 100).toFixed(0)}%</span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">{preview?.suggestion || sceneItem.reason}</p>
                                                            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                                                                <p className="text-[11px] text-muted-foreground mb-1">Vérifications proposées:</p>
                                                                <div className="space-y-1">
                                                                    {(preview?.checks || []).map((check) => (
                                                                        <p key={`${sceneItem.id}-${check}`} className="text-xs text-foreground/90">- {check}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
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
                                                        <div className="rounded-lg border border-white/10 bg-card/50 p-3">
                                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Exemples de répliques</p>
                                                            <div className="space-y-1">
                                                                {(preview?.samples || []).length === 0 && (
                                                                    <p className="text-xs text-muted-foreground">Aucun extrait disponible.</p>
                                                                )}
                                                                {(preview?.samples || []).map((sample) => (
                                                                    <p key={`${sceneItem.id}-${sample}`} className="text-xs text-foreground/90 leading-relaxed">{sample}</p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {validationStep === 4 && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Étape 4 · Casting Vocal (Optionnel)
                                    </label>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Associez des voix IA aux personnages pour générer automatiquement l'audio du script entier.
                                    </p>
                                    <WizardStepCasting
                                        characters={frozenCanonicalCharacters}
                                        assignments={diagnosticsVoiceAssignments}
                                        setAssignments={setDiagnosticsVoiceAssignments}
                                        script={pendingScriptForSave}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex items-center justify-between gap-3">
                            <Button
                                variant="outline"
                                className="h-10"
                                disabled={validationStep === 1}
                                onClick={() => setValidationStep((prev) => (Math.max(1, prev - 1) as ValidationStep))}
                            >
                                Étape précédente
                            </Button>

                            {validationStep < 4 ? (
                                <Button
                                    className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={() => {
                                        if (validationStep === 1) {
                                            setCollectiveResolutionsById(prev => {
                                                const next = { ...prev };
                                                Object.keys(next).forEach(id => {
                                                    const label = next[id].label;
                                                    if (classicCharacterTargetByLabel[label] !== THIRD_MULTI_TARGET) {
                                                        delete next[id];
                                                    }
                                                });

                                                Object.entries(classicCharacterTargetByLabel).forEach(([label, target]) => {
                                                    if (target === THIRD_MULTI_TARGET) {
                                                        const existing = Object.values(next).find(v => v.label === label);
                                                        if (!existing) {
                                                            const newId = `manual-col-${Math.random().toString(36).substr(2, 9)}`;
                                                            next[newId] = {
                                                                label,
                                                                scope: "scene",
                                                                sceneIndex: undefined, // Or we could try to infer it
                                                                members: []
                                                            };
                                                        }
                                                    }
                                                });
                                                return next;
                                            });
                                        }
                                        setValidationStepSafely((validationStep + 1) as ValidationStep);
                                    }}
                                    disabled={(validationStep === 1 && aliasPendingCount > 0) || (validationStep === 2 && collectivePendingCount > 0) || (validationStep === 3 && diagnosticsPendingCount > 0)}
                                >
                                    Continuer vers l&apos;étape {validationStep + 1}
                                </Button>
                            ) : (
                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        onClick={finalizeImportWithDiagnostics}
                                        disabled={isSavingValidation}
                                        className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                                    >
                                        {isSavingValidation ? "Sauvegarde..." : "Valider et sauvegarder le script"}
                                    </Button>
                                    {diagnosticsPendingCount > 0 && (
                                        <p className="text-xs text-amber-400">
                                            {diagnosticsPendingCount} décision(s) restante(s) à valider (étapes 1 à 3).
                                        </p>
                                    )}
                                    {validationSaveError && (
                                        <p className="text-xs text-red-400 max-w-md text-right">
                                            {validationSaveError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. IMPORT CHOICE SCREEN */}
            {showImportGuide && importChoice === "choice" && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => { setShowImportGuide(false); }}>
                    <div className="bg-card border border-border p-8 rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>
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
