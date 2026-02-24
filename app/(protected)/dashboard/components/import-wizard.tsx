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
    prepareThirdImportAction,
    runImportDiagnosticsAction,
    saveScriptWithImportValidation,
    type ImportDiagnosticsResult,
    type ThirdImportPreparation,
    type ImportValidationSubmission,
} from "../actions";
import type { ParsedScript, ScriptMappings } from "@/lib/types";
import { WizardStepAlias } from "./wizard-step-alias";
import { WizardStepCollectives } from "./wizard-step-collectives";
import { WizardStepScenes } from "./wizard-step-scenes";
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
    ValidationDecision, ValidationStep, ThirdImportStep, ClassicImportStage,
    CollectiveResolutionState, ThirdCollectiveCandidate, ThirdSceneWindow,
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
    const [isThirdImporting, setIsThirdImporting] = useState(false);
    const [thirdImportReviewOpen, setThirdImportReviewOpen] = useState(false);
    const [thirdImportPreview, setThirdImportPreview] = useState<ThirdImportPreparation | null>(null);
    const [thirdImportPdfUrl, setThirdImportPdfUrl] = useState<string | null>(null);
    const [thirdImportStep, setThirdImportStep] = useState<ThirdImportStep>(1);
    const [thirdCharacterLabels, setThirdCharacterLabels] = useState<string[]>([]);
    const [thirdCharacterCountByLabel, setThirdCharacterCountByLabel] = useState<Record<string, number>>({});
    const [thirdCharacterTargetByLabel, setThirdCharacterTargetByLabel] = useState<Record<string, string>>({});
    const [thirdLabelSceneOrdersByLabel, setThirdLabelSceneOrdersByLabel] = useState<Record<string, number[]>>({});
    const [thirdCollectiveCandidates, setThirdCollectiveCandidates] = useState<ThirdCollectiveCandidate[]>([]);
    const [thirdCollectiveMembersById, setThirdCollectiveMembersById] = useState<Record<string, string[]>>({});
    const [thirdCollectiveScopeById, setThirdCollectiveScopeById] = useState<Record<string, "global" | "scene">>({});
    const [thirdCollectiveSceneOrderById, setThirdCollectiveSceneOrderById] = useState<Record<string, number>>({});
    const [thirdContextCandidateId, setThirdContextCandidateId] = useState<string | null>(null);
    const [thirdSceneTitles, setThirdSceneTitles] = useState<string[]>([]);
    const [thirdSceneStarts, setThirdSceneStarts] = useState<number[]>([]);
    const [thirdSceneCursor, setThirdSceneCursor] = useState(0);
    const [thirdSceneReviewedByOrder, setThirdSceneReviewedByOrder] = useState<Record<number, boolean>>({});
    const [thirdVoiceAssignments, setThirdVoiceAssignments] = useState<VoiceAssignment[] | null>(null);
    const [isThirdSaving, setIsThirdSaving] = useState(false);

    // Choice screen state
    const [importChoice, setImportChoice] = useState<"choice" | "catalog">("choice");

    const aiImportIntervalsRef = useRef<NodeJS.Timeout[]>([]);
    const aiImportCancelledRef = useRef(false);
    const classicImportStartedAtRef = useRef<number | null>(null);
    const classicImportTimerRef = useRef<NodeJS.Timeout | null>(null);
    const classicCurrentStageRef = useRef<ClassicImportStage | null>(null);
    const classicHeartbeatAtSecRef = useRef<number>(-1);
    const scriptViewerRef = useRef<HTMLDivElement>(null);

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
            if (thirdImportPdfUrl) {
                URL.revokeObjectURL(thirdImportPdfUrl);
            }
        };
    }, [thirdImportPdfUrl]);

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

    // --- THIRD IMPORT (NO AI) ---

    const thirdCharacterOptions = useMemo(() => {
        const set = new Set<string>();
        thirdCharacterLabels.forEach((label) => set.add(label));
        Object.values(thirdCharacterTargetByLabel).forEach((target) => {
            const normalized = normalizeImportLabel(target);
            if (normalized === THIRD_MULTI_TARGET) return;
            if (normalized) set.add(normalized);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
    }, [thirdCharacterLabels, thirdCharacterTargetByLabel]);

    const thirdCanonicalCharacters = useMemo(() => {
        const set = new Set<string>();
        thirdCharacterLabels.forEach((label) => {
            const target = normalizeImportLabel(thirdCharacterTargetByLabel[label] || label);
            if (target === THIRD_MULTI_TARGET) return;
            if (target) set.add(target);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
    }, [thirdCharacterLabels, thirdCharacterTargetByLabel]);

    const thirdAliasMappings = useMemo(() => {
        const aliases: Record<string, string> = {};
        thirdCharacterLabels.forEach((label) => {
            const source = normalizeImportLabel(label);
            const target = normalizeImportLabel(thirdCharacterTargetByLabel[label] || label);
            if (target === THIRD_MULTI_TARGET) return;
            if (source && target && source !== target) {
                aliases[source] = target;
            }
        });
        return aliases;
    }, [thirdCharacterLabels, thirdCharacterTargetByLabel]);

    const thirdCharacterPendingCount = useMemo(() => (
        thirdCharacterLabels.filter((label) => !normalizeImportLabel(thirdCharacterTargetByLabel[label] || "")).length
    ), [thirdCharacterLabels, thirdCharacterTargetByLabel]);

    const thirdLineCount = thirdImportPreview?.parsedScript.lines.length || 0;

    const thirdSceneWindows = useMemo(() => {
        if (thirdLineCount === 0) return [] as ThirdSceneWindow[];

        const starts = [...thirdSceneStarts]
            .map((value) => Math.max(0, Math.min(Math.floor(value), Math.max(0, thirdLineCount - 1))))
            .sort((a, b) => a - b)
            .filter((value, index, arr) => index === 0 || value !== arr[index - 1]);

        if (starts.length === 0) starts.push(0);

        return starts.map((start, order) => ({
            order,
            title: thirdSceneTitles[order] || `Scène ${order + 1}`,
            start,
            end: order + 1 < starts.length ? starts[order + 1] : thirdLineCount,
        }));
    }, [thirdLineCount, thirdSceneStarts, thirdSceneTitles]);

    const thirdCurrentScene = useMemo(() => {
        if (thirdSceneWindows.length === 0) return null;
        const index = clamp(thirdSceneCursor, 0, thirdSceneWindows.length - 1);
        return thirdSceneWindows[index];
    }, [thirdSceneCursor, thirdSceneWindows]);

    const thirdCurrentSceneLines = useMemo(() => {
        if (!thirdImportPreview || !thirdCurrentScene) return [] as ParsedScript["lines"];
        return (thirdImportPreview.parsedScript.lines || []).slice(thirdCurrentScene.start, thirdCurrentScene.end);
    }, [thirdImportPreview, thirdCurrentScene]);

    const thirdBoundaryControl = useMemo(() => {
        if (!thirdImportPreview || !thirdCurrentScene) return null;
        if (thirdCurrentScene.order >= thirdSceneWindows.length - 1) return null;

        const nextScene = thirdSceneWindows[thirdCurrentScene.order + 1];
        const sceneAfterNext = thirdSceneWindows[thirdCurrentScene.order + 2];
        const min = thirdCurrentScene.start + 1;
        const max = sceneAfterNext ? sceneAfterNext.start - 1 : Math.max(min, thirdLineCount - 1);
        const value = nextScene.start;
        const lines = thirdImportPreview.parsedScript.lines || [];

        const before = lines[Math.max(0, value - 1)] || null;
        const after = lines[Math.min(lines.length - 1, value)] || null;

        return {
            min,
            max,
            value,
            before,
            after,
            nextSceneTitle: nextScene.title,
        };
    }, [thirdImportPreview, thirdCurrentScene, thirdSceneWindows, thirdLineCount]);

    const thirdSceneReviewedCount = useMemo(() => (
        thirdSceneWindows.filter((scene) => thirdSceneReviewedByOrder[scene.order]).length
    ), [thirdSceneWindows, thirdSceneReviewedByOrder]);

    // Auto-scroll: sync text viewer to current scene
    useEffect(() => {
        if (!thirdCurrentScene || thirdImportStep !== 3) return;

        // Scroll the text viewer to the scene marker
        const marker = document.getElementById(`v3-scene-marker-${thirdCurrentScene.order}`);
        if (marker && scriptViewerRef.current) {
            marker.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [thirdSceneCursor, thirdCurrentScene, thirdImportStep]);

    // Compute PDF page for current scene
    const pdfPageForCurrentScene = useMemo(() => {
        if (!thirdCurrentScene || !thirdImportPreview?.scenePageMap) return 1;
        return thirdImportPreview.scenePageMap[thirdCurrentScene.order] ?? 1;
    }, [thirdCurrentScene, thirdImportPreview]);

    const thirdEffectiveCollectiveCandidates = useMemo(() => {
        const map = new Map<string, ThirdCollectiveCandidate>();
        thirdCollectiveCandidates.forEach((candidate) => {
            map.set(candidate.id, {
                ...candidate,
                sceneOrders: [...candidate.sceneOrders],
            });
        });

        thirdCharacterLabels.forEach((label) => {
            const target = normalizeImportLabel(thirdCharacterTargetByLabel[label] || "");
            if (target !== THIRD_MULTI_TARGET) return;

            const normalizedLabel = normalizeImportLabel(label);
            const alreadyExists = Array.from(map.values()).some((candidate) => candidate.label === normalizedLabel);
            if (alreadyExists) return;

            const sceneOrders = (thirdLabelSceneOrdersByLabel[normalizedLabel] || []).slice().sort((a, b) => a - b);
            const defaultScope: "global" | "scene" = (
                isSceneScopedCollectiveLabel(normalizedLabel)
                || sceneOrders.length <= 1
            ) ? "scene" : "global";

            map.set(`manual:${normalizedLabel}`, {
                id: `manual:${normalizedLabel}`,
                label: normalizedLabel,
                scope: defaultScope,
                sceneOrder: sceneOrders[0] ?? 0,
                sceneOrders,
                count: thirdCharacterCountByLabel[normalizedLabel] || 0,
            });
        });

        return Array.from(map.values()).sort((a, b) => {
            const byCount = b.count - a.count;
            if (byCount !== 0) return byCount;
            return a.label.localeCompare(b.label, "fr");
        });
    }, [
        thirdCollectiveCandidates,
        thirdCharacterLabels,
        thirdCharacterTargetByLabel,
        thirdLabelSceneOrdersByLabel,
        thirdCharacterCountByLabel,
    ]);

    useEffect(() => {
        if (thirdEffectiveCollectiveCandidates.length === 0) return;

        setThirdCollectiveScopeById((prev) => {
            const next = { ...prev };
            let changed = false;
            thirdEffectiveCollectiveCandidates.forEach((candidate) => {
                if (!next[candidate.id]) {
                    next[candidate.id] = candidate.scope;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        setThirdCollectiveSceneOrderById((prev) => {
            const next = { ...prev };
            let changed = false;
            thirdEffectiveCollectiveCandidates.forEach((candidate) => {
                const allowed = candidate.sceneOrders.length > 0
                    ? candidate.sceneOrders
                    : thirdSceneWindows.map((scene) => scene.order);
                if (allowed.length === 0) return;

                const preferred = next[candidate.id] ?? candidate.sceneOrder ?? allowed[0];
                const resolved = allowed.includes(preferred) ? preferred : allowed[0];
                if (next[candidate.id] !== resolved) {
                    next[candidate.id] = resolved;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        setThirdCollectiveMembersById((prev) => {
            const next = { ...prev };
            let changed = false;
            const canonicalSet = new Set(thirdCanonicalCharacters.map((item) => normalizeImportLabel(item)));

            thirdEffectiveCollectiveCandidates.forEach((candidate) => {
                if (next[candidate.id]) return;

                if (isSceneScopedCollectiveLabel(candidate.label)) {
                    next[candidate.id] = [...thirdCanonicalCharacters];
                    changed = true;
                    return;
                }

                const tokens = candidate.label
                    .split(/\bET\b|,|\/|&/g)
                    .map((value) => normalizeImportLabel(value))
                    .filter(Boolean);

                next[candidate.id] = Array.from(new Set(
                    tokens.filter((token) => canonicalSet.has(token))
                ));
                changed = true;
            });

            return changed ? next : prev;
        });
    }, [thirdEffectiveCollectiveCandidates, thirdCanonicalCharacters, thirdSceneWindows]);

    const thirdCollectivePendingCount = useMemo(() => {
        const canonicalSet = new Set(thirdCanonicalCharacters.map((item) => normalizeImportLabel(item)));
        return thirdEffectiveCollectiveCandidates.filter((candidate) => {
            const members = Array.from(new Set(
                (thirdCollectiveMembersById[candidate.id] || [])
                    .map((value) => normalizeImportLabel(value))
                    .filter((value) => canonicalSet.has(value))
            ));
            return members.length === 0;
        }).length;
    }, [thirdCanonicalCharacters, thirdEffectiveCollectiveCandidates, thirdCollectiveMembersById]);

    const thirdCollectiveContextById = useMemo(() => {
        const byId: Record<string, { sceneOrder: number; sceneTitle: string; lines: ParsedScript["lines"] }> = {};
        if (!thirdImportPreview || thirdEffectiveCollectiveCandidates.length === 0) return byId;

        const lines = thirdImportPreview.parsedScript.lines || [];

        thirdEffectiveCollectiveCandidates.forEach((candidate) => {
            const allowedSceneOrders = (candidate.sceneOrders || []).length > 0
                ? candidate.sceneOrders
                : thirdSceneWindows.map((scene) => scene.order);
            if (allowedSceneOrders.length === 0) return;

            const preferredSceneOrder = thirdCollectiveSceneOrderById[candidate.id] ?? candidate.sceneOrder ?? allowedSceneOrders[0];
            const sceneOrder = allowedSceneOrders.includes(preferredSceneOrder)
                ? preferredSceneOrder
                : allowedSceneOrders[0];
            const sceneWindow = thirdSceneWindows.find((scene) => scene.order === sceneOrder);
            if (!sceneWindow) return;

            byId[candidate.id] = {
                sceneOrder,
                sceneTitle: sceneWindow.title,
                lines: lines.slice(sceneWindow.start, sceneWindow.end),
            };
        });

        return byId;
    }, [thirdImportPreview, thirdEffectiveCollectiveCandidates, thirdCollectiveSceneOrderById, thirdSceneWindows]);

    const thirdFinalOutput = useMemo(() => {
        if (!thirdImportPreview) return null;

        const baseScript = thirdImportPreview.parsedScript;
        const canonical = thirdCanonicalCharacters.map((item) => normalizeImportLabel(item)).filter(Boolean);
        const canonicalSet = new Set(canonical);
        const aliasMap = { ...thirdAliasMappings };

        const lines = (baseScript.lines || []).map((line) => {
            if (line.type !== "dialogue") return line;
            const source = normalizeImportLabel(line.character);
            const mapped = normalizeImportLabel(aliasMap[source] || source);
            return {
                ...line,
                character: mapped || source,
            };
        });

        const sceneStarts = thirdSceneWindows.map((scene) => scene.start);
        const scenes = thirdSceneWindows.map((scene) => ({
            title: scene.title,
            index: scene.start,
        }));

        const globalCollectives: ScriptMappings["collectives"]["global"] = [];
        const bySceneCollectives: ScriptMappings["collectives"]["by_scene"] = [];
        const globalCollectiveLabels = new Set<string>();
        const sceneCollectiveLabels = new Set<string>();

        thirdEffectiveCollectiveCandidates.forEach((candidate) => {
            const resolvedMembers = Array.from(new Set(
                (thirdCollectiveMembersById[candidate.id] || [])
                    .map((member) => normalizeImportLabel(member))
                    .filter((member) => canonicalSet.has(member))
            ));
            if (resolvedMembers.length === 0) return;

            const scope = thirdCollectiveScopeById[candidate.id] || candidate.scope;
            const label = normalizeImportLabel(candidate.label);
            if (!label) return;

            if (scope === "scene") {
                const allowedSceneOrders = candidate.sceneOrders.length > 0
                    ? candidate.sceneOrders
                    : sceneStarts.map((_, order) => order);
                if (allowedSceneOrders.length === 0) return;

                const preferredSceneOrder = thirdCollectiveSceneOrderById[candidate.id] ?? candidate.sceneOrder ?? allowedSceneOrders[0];
                const sceneOrder = allowedSceneOrders.includes(preferredSceneOrder)
                    ? preferredSceneOrder
                    : allowedSceneOrders[0];
                const sceneIndex = sceneStarts[sceneOrder] ?? 0;
                bySceneCollectives.push({
                    scene_index: sceneIndex,
                    label,
                    members: resolvedMembers,
                });
                sceneCollectiveLabels.add(`${sceneIndex}|${label}`);
                return;
            }

            globalCollectives.push({
                label,
                members: resolvedMembers,
            });
            globalCollectiveLabels.add(label);
        });

        const mappings: ScriptMappings = {
            canonical_characters: canonical,
            aliases: aliasMap,
            collectives: {
                global: globalCollectives,
                by_scene: bySceneCollectives,
            },
        };

        const unresolved = new Set<string>();
        lines.forEach((line, lineIndex) => {
            if (line.type !== "dialogue") return;

            const rawLabel = normalizeImportLabel(line.character);
            const mappedLabel = normalizeImportLabel(aliasMap[rawLabel] || rawLabel);
            if (canonicalSet.has(mappedLabel)) return;
            if (globalCollectiveLabels.has(rawLabel) || globalCollectiveLabels.has(mappedLabel)) return;

            const sceneOrder = getSceneOrderForLine(sceneStarts, lineIndex);
            const sceneIndex = sceneStarts[sceneOrder] ?? 0;
            if (sceneCollectiveLabels.has(`${sceneIndex}|${rawLabel}`) || sceneCollectiveLabels.has(`${sceneIndex}|${mappedLabel}`)) {
                return;
            }

            unresolved.add(mappedLabel || rawLabel);
        });

        const finalScript: ParsedScript = {
            ...baseScript,
            lines,
            scenes: scenes.length > 0 ? scenes : [{ index: 0, title: "SCÈNE 1" }],
            characters: canonical,
            mappings,
            schema_version: 2,
        };

        return {
            finalScript,
            mappings,
            unresolvedLabels: Array.from(unresolved).sort((a, b) => a.localeCompare(b, "fr")),
        };
    }, [
        thirdImportPreview,
        thirdCanonicalCharacters,
        thirdAliasMappings,
        thirdSceneWindows,
        thirdEffectiveCollectiveCandidates,
        thirdCollectiveMembersById,
        thirdCollectiveScopeById,
        thirdCollectiveSceneOrderById,
    ]);

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

    const initializeThirdImportWorkflow = (result: ThirdImportPreparation) => {
        const lines = result.parsedScript.lines || [];
        const labelCounts = new Map<string, number>();
        lines.forEach((line) => {
            if (line.type !== "dialogue") return;
            const label = normalizeImportLabel(line.character);
            if (!label) return;
            labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        });

        const allDialogueLabels = Array.from(labelCounts.keys());
        const characterLabels = allDialogueLabels
            .filter((label) => !isCollectiveLabel(label))
            .sort((a, b) => {
                const byCount = (labelCounts.get(b) || 0) - (labelCounts.get(a) || 0);
                return byCount !== 0 ? byCount : a.localeCompare(b, "fr");
            });

        const characterTargets: Record<string, string> = {};
        characterLabels.forEach((label) => {
            const bestAliasTarget = findBestAliasTarget(label, characterLabels, labelCounts);
            characterTargets[label] = bestAliasTarget || label;
        });

        const countByLabel = Object.fromEntries(
            characterLabels.map((label) => [label, labelCounts.get(label) || 0])
        );

        const orderedScenes = [...(result.parsedScript.scenes || [])].sort((a, b) => a.index - b.index);
        let sceneStarts = orderedScenes.map((scene) => Math.max(0, Math.floor(scene.index)));
        let sceneTitles = orderedScenes.map((scene, idx) => scene.title || `Scène ${idx + 1}`);
        if (sceneStarts.length === 0) {
            sceneStarts = [0];
            sceneTitles = ["SCÈNE 1"];
        }

        const labelSceneOrdersMap = new Map<string, Set<number>>();
        lines.forEach((line, lineIndex) => {
            if (line.type !== "dialogue") return;
            const label = normalizeImportLabel(line.character);
            if (!label) return;
            const sceneOrder = getSceneOrderForLine(sceneStarts, lineIndex);
            if (!labelSceneOrdersMap.has(label)) {
                labelSceneOrdersMap.set(label, new Set<number>());
            }
            labelSceneOrdersMap.get(label)?.add(sceneOrder);
        });

        const labelSceneOrdersByLabel = Object.fromEntries(
            Array.from(labelSceneOrdersMap.entries()).map(([label, orders]) => [
                label,
                Array.from(orders).sort((a, b) => a - b),
            ])
        );

        const collectiveCandidateMap = new Map<string, ThirdCollectiveCandidate>();
        lines.forEach((line, lineIndex) => {
            if (line.type !== "dialogue") return;
            const label = normalizeImportLabel(line.character);
            if (!isCollectiveLabel(label)) return;

            const defaultScope: "global" | "scene" = isSceneScopedCollectiveLabel(label) ? "scene" : "global";
            const sceneOrder = getSceneOrderForLine(sceneStarts, lineIndex);
            const key = defaultScope === "scene"
                ? `scene:${sceneOrder}:${label}`
                : `global:${label}`;

            const existing = collectiveCandidateMap.get(key);
            if (existing) {
                existing.count += 1;
                if (!existing.sceneOrders.includes(sceneOrder)) {
                    existing.sceneOrders.push(sceneOrder);
                    existing.sceneOrders.sort((a, b) => a - b);
                }
                return;
            }

            collectiveCandidateMap.set(key, {
                id: key,
                label,
                scope: defaultScope,
                sceneOrder: defaultScope === "scene" ? sceneOrder : undefined,
                sceneOrders: [sceneOrder],
                count: 1,
            });
        });

        const collectiveCandidates = Array.from(collectiveCandidateMap.values()).sort((a, b) => {
            const byCount = b.count - a.count;
            if (byCount !== 0) return byCount;
            return a.label.localeCompare(b.label, "fr");
        });

        const initialCanonical = Array.from(new Set(
            characterLabels
                .map((label) => normalizeImportLabel(characterTargets[label] || label))
                .filter(Boolean)
        ));
        const initialCanonicalSet = new Set(initialCanonical);

        const collectiveMembersById: Record<string, string[]> = {};
        const collectiveScopeById: Record<string, "global" | "scene"> = {};
        const collectiveSceneById: Record<string, number> = {};

        collectiveCandidates.forEach((candidate) => {
            collectiveScopeById[candidate.id] = candidate.scope;
            collectiveSceneById[candidate.id] = candidate.sceneOrders[0] ?? candidate.sceneOrder ?? 0;

            if (isSceneScopedCollectiveLabel(candidate.label)) {
                collectiveMembersById[candidate.id] = [...initialCanonical];
                return;
            }

            const tokens = candidate.label
                .split(/\bET\b|,|\/|&/g)
                .map((value) => normalizeImportLabel(value))
                .filter(Boolean);

            collectiveMembersById[candidate.id] = Array.from(new Set(
                tokens.filter((token) => initialCanonicalSet.has(token))
            ));
        });

        setThirdImportStep(1);
        setThirdCharacterLabels(characterLabels);
        setThirdCharacterCountByLabel(countByLabel);
        setThirdCharacterTargetByLabel(characterTargets);
        setThirdLabelSceneOrdersByLabel(labelSceneOrdersByLabel);
        setThirdCollectiveCandidates(collectiveCandidates);
        setThirdCollectiveMembersById(collectiveMembersById);
        setThirdCollectiveScopeById(collectiveScopeById);
        setThirdCollectiveSceneOrderById(collectiveSceneById);
        setThirdContextCandidateId(null);
        setThirdSceneTitles(sceneTitles);
        setThirdSceneStarts(sceneStarts);
        setThirdSceneCursor(0);
        setThirdSceneReviewedByOrder({});
        setIsThirdSaving(false);
    };

    const closeThirdImportReview = () => {
        setThirdImportReviewOpen(false);
        setThirdImportPreview(null);
        setThirdImportStep(1);
        setThirdCharacterLabels([]);
        setThirdCharacterCountByLabel({});
        setThirdCharacterTargetByLabel({});
        setThirdLabelSceneOrdersByLabel({});
        setThirdCollectiveCandidates([]);
        setThirdCollectiveMembersById({});
        setThirdCollectiveScopeById({});
        setThirdCollectiveSceneOrderById({});
        setThirdContextCandidateId(null);
        setThirdSceneTitles([]);
        setThirdSceneStarts([]);
        setThirdSceneCursor(0);
        setThirdSceneReviewedByOrder({});
        setIsThirdSaving(false);
        if (thirdImportPdfUrl) {
            URL.revokeObjectURL(thirdImportPdfUrl);
            setThirdImportPdfUrl(null);
        }
    };

    const handleThirdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setIsThirdImporting(true);
        setShowImportGuide(false);

        if (thirdImportPdfUrl) {
            URL.revokeObjectURL(thirdImportPdfUrl);
            setThirdImportPdfUrl(null);
        }

        const localPdfUrl = URL.createObjectURL(file);
        setThirdImportPdfUrl(localPdfUrl);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await prepareThirdImportAction(formData);
            if ("error" in result) {
                onError(result.error);
                URL.revokeObjectURL(localPdfUrl);
                setThirdImportPdfUrl(null);
                return;
            }

            setThirdImportPreview(result);
            initializeThirdImportWorkflow(result);
            setThirdImportReviewOpen(true);
        } catch (err: unknown) {
            URL.revokeObjectURL(localPdfUrl);
            setThirdImportPdfUrl(null);
            onError(err instanceof Error ? err.message : "Erreur lors de l'import beta.");
        } finally {
            setIsThirdImporting(false);
        }
    };

    const toggleThirdCollectiveMember = (collectiveId: string, member: string) => {
        const normalizedMember = normalizeImportLabel(member);
        setThirdCollectiveMembersById((prev) => {
            const current = Array.from(new Set((prev[collectiveId] || []).map((value) => normalizeImportLabel(value))));
            const hasMember = current.includes(normalizedMember);
            return {
                ...prev,
                [collectiveId]: hasMember
                    ? current.filter((value) => value !== normalizedMember)
                    : [...current, normalizedMember],
            };
        });
    };

    const setThirdSceneBoundary = (sceneOrder: number, nextSceneStart: number) => {
        setThirdSceneStarts((prev) => {
            if (sceneOrder < 0 || sceneOrder >= prev.length - 1) return prev;
            const next = [...prev];
            const boundaryIndex = sceneOrder + 1;
            const minNextStart = next[sceneOrder] + 1;
            const maxNextStart = boundaryIndex === next.length - 1
                ? Math.max(minNextStart, thirdLineCount - 1)
                : next[boundaryIndex + 1] - 1;
            const candidate = clamp(nextSceneStart, minNextStart, maxNextStart);
            if (candidate === next[boundaryIndex]) return prev;
            next[boundaryIndex] = candidate;
            return next;
        });
        setThirdSceneReviewedByOrder((prev) => ({
            ...prev,
            [sceneOrder]: false,
            [sceneOrder + 1]: false,
        }));
    };

    const goToThirdStep = (step: ThirdImportStep) => {
        if (step === 2) {
            if (thirdCharacterPendingCount > 0 || thirdCanonicalCharacters.length === 0) {
                onError("Complétez d'abord la liaison des personnages.");
                return;
            }
        }

        if (step === 3) {
            if (thirdCharacterPendingCount > 0 || thirdCanonicalCharacters.length === 0) {
                onError("Complétez d'abord la liaison des personnages.");
                return;
            }
            if (thirdCollectivePendingCount > 0) {
                onError("Renseignez les multi-personnages avant de passer aux scènes.");
                return;
            }
        }

        setThirdImportStep(step);
    };

    const finalizeThirdImport = async () => {
        if (!thirdFinalOutput) return;
        if (thirdSceneReviewedCount < thirdSceneWindows.length) {
            onError(`Validez toutes les scènes (${thirdSceneReviewedCount}/${thirdSceneWindows.length}) avant sauvegarde.`);
            return;
        }
        if (thirdFinalOutput.unresolvedLabels.length > 0) {
            onError(`Des libellés ne sont pas résolus: ${thirdFinalOutput.unresolvedLabels.slice(0, 6).join(", ")}`);
            return;
        }

        const diagnostics: ImportDiagnosticsResult = {
            canonicalCharacters: thirdFinalOutput.mappings.canonical_characters,
            aliasSuggestions: [],
            collectiveSuggestions: [],
            sceneDiagnostics: [],
            blockingDecisions: [],
        };

        const submission: ImportValidationSubmission = {
            diagnostics,
            decisions: {},
            mappings: thirdFinalOutput.mappings,
            voiceAssignments: thirdVoiceAssignments || undefined,
        };

        setIsThirdSaving(true);
        const saveResult = await saveScriptWithImportValidation(thirdFinalOutput.finalScript, submission);
        setIsThirdSaving(false);

        if ("error" in saveResult) {
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
        closeThirdImportReview();
        setShowImportGuide(false);
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
        if (!isImporting && !isAiImporting && !isThirdImporting && !diagnosticsModalOpen && !thirdImportReviewOpen) return null;
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

            {/* 1ter. PROGRESS MODAL (BETA IMPORT V3) */}
            {isThirdImporting && (
                <div className="fixed inset-0 z-[107] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-popover border border-cyan-500/30 p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(34,211,238,0.25)] animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-5">
                            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto">
                                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Import Beta (V3)</h3>
                                <p className="text-sm text-muted-foreground">
                                    Analyse du PDF brut, normalisation en format script, préparation du contrôle.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 1quater. REVIEW MODAL (BETA IMPORT V3 - SANS IA) */}
            {thirdImportReviewOpen && thirdImportPreview && (
                <div className="fixed inset-0 z-[108] bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="mx-auto h-full max-h-[94vh] w-full max-w-7xl rounded-3xl border border-white/10 bg-card shadow-2xl flex flex-col">
                        {/* --- PREMIUM HEADER --- */}
                        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4 bg-gradient-to-r from-cyan-500/5 via-transparent to-emerald-500/5 rounded-t-3xl">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <FileText className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">Import Beta (V3) - Validation sans IA</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Étape 1 personnages, étape 2 multi-personnages, étape 3 découpage des scènes, étape 4 re-scan final.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium flex items-center gap-1.5 transition-all">
                                            <Users className="w-3 h-3" />
                                            {thirdCanonicalCharacters.length} personnages canoniques
                                        </span>
                                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium flex items-center gap-1.5 transition-all">
                                            <Link className="w-3 h-3" />
                                            {thirdEffectiveCollectiveCandidates.length} multi-personnages
                                        </span>
                                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium flex items-center gap-1.5 transition-all">
                                            <Layers className="w-3 h-3" />
                                            {thirdSceneReviewedCount}/{thirdSceneWindows.length} scènes validées
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeThirdImportReview} className="hover:bg-white/10 rounded-xl">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* --- CONNECTED STEPPER --- */}
                        <div className="px-6 py-4 border-b border-white/10">
                            <div className="flex items-center justify-between gap-1">
                                {([
                                    { step: 1 as const, label: "Personnages", sub: `${thirdCharacterPendingCount} à lier` },
                                    { step: 2 as const, label: "Multi-persos", sub: `${thirdCollectivePendingCount} à résoudre` },
                                    { step: 3 as const, label: "Scènes", sub: `${thirdSceneReviewedCount}/${thirdSceneWindows.length} vérifiées` },
                                    { step: 4 as const, label: "Re-scan final", sub: (thirdFinalOutput?.unresolvedLabels.length || 0) === 0 ? "OK" : `${thirdFinalOutput?.unresolvedLabels.length || 0} libellé(s)` },
                                ] as const).map((item, idx) => {
                                    const isActive = thirdImportStep === item.step;
                                    const isCompleted = thirdImportStep > item.step;
                                    return (
                                        <div key={item.step} className="flex items-center flex-1">
                                            <button
                                                type="button"
                                                onClick={() => goToThirdStep(item.step)}
                                                className="flex items-center gap-2.5 group"
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${isCompleted
                                                    ? "bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400"
                                                    : isActive
                                                        ? "bg-cyan-500/20 border-2 border-cyan-500/60 text-cyan-400 animate-ring-pulse"
                                                        : "bg-white/5 border-2 border-white/15 text-muted-foreground"
                                                    }`}>
                                                    {isCompleted ? (
                                                        <Check className="w-4 h-4 animate-check-pop" />
                                                    ) : (
                                                        item.step
                                                    )}
                                                </div>
                                                <div className="text-left hidden md:block">
                                                    <p className={`text-xs font-semibold transition-colors ${isActive ? "text-cyan-400" : isCompleted ? "text-emerald-400" : "text-foreground"}`}>
                                                        {item.label}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                                                </div>
                                            </button>
                                            {idx < 3 && (
                                                <div className="flex-1 h-0.5 mx-3 rounded-full bg-white/10 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-emerald-500/60 w-full" : isActive ? "bg-cyan-500/40 w-1/2" : "w-0"
                                                            }`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-4">

                            {thirdImportStep === 1 && (
                                <WizardStepAlias
                                    labels={thirdCharacterLabels}
                                    targetByLabel={thirdCharacterTargetByLabel}
                                    setTargetByLabel={setThirdCharacterTargetByLabel}
                                    countByLabel={thirdCharacterCountByLabel}
                                    options={thirdCharacterOptions}
                                    normalizeLabel={normalizeImportLabel}
                                    multiTargetConstant={THIRD_MULTI_TARGET}
                                />
                            )}

                            {thirdImportStep === 2 && (
                                <WizardStepCollectives
                                    candidates={thirdEffectiveCollectiveCandidates}
                                    scopeById={thirdCollectiveScopeById as Record<string, "global" | "scene">}
                                    setScopeById={setThirdCollectiveScopeById as React.Dispatch<React.SetStateAction<Record<string, "global" | "scene">>>}
                                    sceneOrderById={thirdCollectiveSceneOrderById}
                                    setSceneOrderById={setThirdCollectiveSceneOrderById}
                                    membersById={thirdCollectiveMembersById}
                                    sceneWindows={thirdSceneWindows}
                                    canonicalCharacters={thirdCanonicalCharacters}
                                    contextCandidateId={thirdContextCandidateId}
                                    setContextCandidateId={setThirdContextCandidateId as React.Dispatch<React.SetStateAction<string | null>>}
                                    contextById={thirdCollectiveContextById as any}
                                    toggleMember={toggleThirdCollectiveMember}
                                />
                            )}

                            {thirdImportStep === 3 && (
                                <WizardStepScenes
                                    importPreview={thirdImportPreview}
                                    sceneWindows={thirdSceneWindows}
                                    boundaryControl={thirdBoundaryControl as any}
                                    currentScene={thirdCurrentScene || null}
                                    pdfPageForCurrentScene={pdfPageForCurrentScene}
                                    importPdfUrl={thirdImportPdfUrl}
                                    scriptViewerRef={scriptViewerRef}
                                    sceneCursor={thirdSceneCursor}
                                    setSceneCursor={setThirdSceneCursor}
                                    setSceneBoundary={setThirdSceneBoundary}
                                    setThirdSceneReviewedByOrder={setThirdSceneReviewedByOrder}
                                    currentSceneLines={thirdCurrentSceneLines}
                                />
                            )}

                            {/* ======= SCREEN 4: RE-SCAN FINAL DASHBOARD ======= */}
                            {thirdImportStep === 4 && (
                                <WizardStepCasting
                                    characters={thirdCanonicalCharacters}
                                    assignments={thirdVoiceAssignments}
                                    setAssignments={setThirdVoiceAssignments}
                                    script={thirdImportPreview?.parsedScript || null}
                                />
                            )}
                        </div>

                        {/* ======= FOOTER WITH ICON BUTTONS ======= */}
                        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3">
                            {thirdImportStep === 1 ? (
                                <Button variant="outline" onClick={closeThirdImportReview} className="rounded-lg">
                                    Annuler
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="gap-1.5 rounded-lg"
                                    onClick={() => setThirdImportStep((prev) => Math.max(1, prev - 1) as ThirdImportStep)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Étape précédente
                                </Button>
                            )}

                            {thirdImportStep < 4 ? (
                                <Button
                                    className="gap-1.5 bg-cyan-500 hover:bg-cyan-500/90 text-black font-semibold rounded-lg"
                                    onClick={() => goToThirdStep((thirdImportStep + 1) as ThirdImportStep)}
                                >
                                    {thirdImportStep === 3
                                        ? `Continuer vers l'étape 4 (${thirdSceneReviewedCount}/${thirdSceneWindows.length} scènes validées)`
                                        : `Continuer vers l'étape ${thirdImportStep + 1}`}
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    className="v3-cta-gradient text-black font-bold rounded-lg gap-1.5 px-6 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/20"
                                    onClick={finalizeThirdImport}
                                    disabled={
                                        isThirdSaving
                                        || thirdSceneReviewedCount < thirdSceneWindows.length
                                        || (thirdFinalOutput?.unresolvedLabels.length || 0) > 0
                                    }
                                >
                                    {isThirdSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                                    <CheckCircle2 className="w-4 h-4" />
                                    Valider et sauvegarder
                                </Button>
                            )}
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
                    <div className="bg-card border border-border p-8 rounded-3xl w-full max-w-6xl shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setShowImportGuide(false); }} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted z-10"><X className="w-5 h-5" /></button>

                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Importer une pièce</h2>
                            <p className="text-muted-foreground mt-2 text-lg">Choisissez votre méthode d&apos;import</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

                            {/* 3. Import Beta V3 (No Full AI Rewrite) */}
                            <label className="cursor-pointer group relative flex flex-col h-full">
                                <div className="absolute inset-0 bg-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-cyan-500/50" />
                                <div className="bg-card border border-border hover:border-cyan-500/50 p-6 rounded-2xl flex flex-col items-center text-center h-full transition-all group-hover:-translate-y-1 shadow-sm hover:shadow-xl">
                                    <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                                        <Upload className="w-10 h-10 text-cyan-400" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground mb-3">Import Beta (V3)</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">
                                        PDF brut + normalisation déterministe.
                                        <br />
                                        <span className="text-cyan-400 text-xs font-semibold mt-2 block">Contrôle visuel PDF vs texte avant validation.</span>
                                    </p>
                                    <div className="w-full py-3 rounded-xl bg-cyan-500/10 text-cyan-500 font-bold group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                                        Tester Import Beta
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleThirdFileChange}
                                />
                            </label>

                            {/* 4. Assistant Repeto Import (AI) */}
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
