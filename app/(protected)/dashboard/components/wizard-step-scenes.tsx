import React from "react";
import { FileText, ChevronLeft, ChevronRight, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParsedScript } from "@/lib/types";
import { ThirdSceneWindow, normalizeImportLabel, formatSceneLineForReview } from "./import-wizard-types";
import { ThirdImportPreparation } from "../actions";

export interface BoundaryControlData {
    value: number;
    nextSceneTitle: string;
    min: number;
    max: number;
    before: ParsedScript["lines"][number] | null;
    after: ParsedScript["lines"][number] | null;
}

export interface WizardStepScenesProps {
    importPreview: ThirdImportPreparation | null;
    sceneWindows: ThirdSceneWindow[];
    boundaryControl: BoundaryControlData | null;
    currentScene: ThirdSceneWindow | null;
    pdfPageForCurrentScene: number;
    importPdfUrl: string | null;
    scriptViewerRef: React.RefObject<HTMLDivElement | null>;
    sceneCursor: number;
    setSceneCursor: React.Dispatch<React.SetStateAction<number>>;
    setSceneBoundary: (sceneOrder: number, value: number) => void;
    setThirdSceneReviewedByOrder: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
    currentSceneLines: ParsedScript["lines"];
}

export function WizardStepScenes({
    importPreview,
    sceneWindows,
    boundaryControl,
    currentScene,
    pdfPageForCurrentScene,
    importPdfUrl,
    scriptViewerRef,
    sceneCursor,
    setSceneCursor,
    setSceneBoundary,
    setThirdSceneReviewedByOrder,
    currentSceneLines,
}: WizardStepScenesProps) {
    const allLines = importPreview?.parsedScript.lines || [];
    const sceneRanges = sceneWindows.map((sw) => ({
        order: sw.order,
        start: sw.start,
        end: sw.end,
        title: sw.title,
    }));
    const boundaryLine = boundaryControl?.value ?? -1;

    return (
        <div className="h-full min-h-[560px] grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr_1fr] gap-3">
            {/* ─── COLUMN 1: PDF SOURCE ─── */}
            <div className="min-h-0 flex flex-col rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">PDF source</p>
                    {currentScene && importPreview?.scenePageMap?.[currentScene.order] && (
                        <span className="ml-auto text-[10px] text-cyan-400 font-medium">
                            Page {importPreview.scenePageMap[currentScene.order]}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-h-0">
                    {importPdfUrl ? (
                        <iframe
                            key={`pdf-viewer-page-${pdfPageForCurrentScene}`}
                            src={`${importPdfUrl}#page=${pdfPageForCurrentScene}`}
                            className="w-full h-full bg-black"
                            title="PDF source"
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                            Aperçu PDF indisponible.
                        </div>
                    )}
                </div>
            </div>

            {/* ─── COLUMN 2: SYNCHRONIZED TEXT VIEWER ─── */}
            <div className="min-h-0 flex flex-col rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Script extrait</p>
                    <span className="ml-auto text-[10px] text-muted-foreground">{allLines.length} lignes</span>
                </div>
                <div ref={scriptViewerRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2 relative">
                    {allLines.map((line, lineIdx) => {
                        const sceneForLine = sceneRanges.find(
                            (sr) => lineIdx >= sr.start && lineIdx < sr.end
                        );
                        const isInActiveScene = sceneForLine?.order === currentScene?.order;
                        const isSceneStart = sceneRanges.some((sr) => sr.start === lineIdx);
                        const isBoundaryLine = lineIdx === boundaryLine;
                        const sceneStartMatch = isSceneStart ? sceneRanges.find((sr) => sr.start === lineIdx) : null;

                        return (
                            <div key={`v3-text-line-${lineIdx}`}>
                                {/* Scene start marker */}
                                {sceneStartMatch && (
                                    <div
                                        id={`v3-scene-marker-${sceneStartMatch.order}`}
                                        className={`sticky top-0 z-10 flex items-center gap-2 py-1.5 px-2 mt-3 mb-1 rounded-lg border text-xs font-semibold ${sceneStartMatch.order === currentScene?.order
                                            ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                                            : "bg-white/5 border-white/10 text-muted-foreground"
                                            }`}
                                    >
                                        <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[10px]">
                                            {sceneStartMatch.order + 1}
                                        </span>
                                        {sceneStartMatch.title}
                                    </div>
                                )}

                                {/* Boundary marker */}
                                {isBoundaryLine && (
                                    <div className="flex items-center gap-2 my-1.5">
                                        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/60 via-amber-400 to-amber-500/60" />
                                        <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold shrink-0">
                                            ✂ Découpe
                                        </span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/60 via-amber-400 to-amber-500/60" />
                                    </div>
                                )}

                                {/* Line content */}
                                <div
                                    className={`py-0.5 px-2 rounded transition-colors ${isInActiveScene
                                        ? "bg-cyan-500/5 border-l-2 border-cyan-500/40"
                                        : "opacity-40 border-l-2 border-transparent"
                                        }`}
                                >
                                    {line.type === "dialogue" ? (
                                        <p className="text-sm leading-relaxed text-foreground/95">
                                            <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                                {normalizeImportLabel(line.character)}
                                            </span>
                                            {line.text}
                                        </p>
                                    ) : (
                                        <p className="text-xs leading-relaxed text-muted-foreground italic border-l-2 border-muted/30 pl-2 ml-1">
                                            {line.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {allLines.length === 0 && (
                        <p className="text-xs text-muted-foreground py-4 text-center">Aucune ligne extraite.</p>
                    )}
                </div>
            </div>

            {/* ─── COLUMN 3: SCENE CONTROLS ─── */}
            <div className="min-h-0 flex flex-col rounded-xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 space-y-3">
                    {/* Scene navigation with icons */}
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 rounded-lg"
                            disabled={!currentScene || sceneCursor === 0}
                            onClick={() => setSceneCursor((prev) => Math.max(0, prev - 1))}
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Préc.
                        </Button>
                        <div className="flex-1 text-center">
                            <p className="text-sm font-semibold text-foreground">
                                {currentScene ? `${currentScene.order + 1}. ${currentScene.title}` : "Aucune scène"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {currentScene ? `Lignes ${currentScene.start} → ${currentScene.end}` : ""}
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 rounded-lg"
                            disabled={!currentScene || sceneCursor >= sceneWindows.length - 1}
                            onClick={() => setSceneCursor((prev) => Math.max(sceneWindows.length - 1, prev + 1))}
                        >
                            Suiv.
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Styled boundary slider */}
                    {boundaryControl && (
                        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent p-3 space-y-2.5">
                            <p className="text-xs font-semibold text-cyan-400">
                                Barre de découpe entre cette scène et: {boundaryControl.nextSceneTitle}
                            </p>
                            <input
                                type="range"
                                min={boundaryControl.min}
                                max={boundaryControl.max}
                                value={boundaryControl.value}
                                onChange={(event) => {
                                    if (!currentScene) return;
                                    setSceneBoundary(currentScene.order, Number(event.target.value));
                                }}
                                className="v3-range-slider"
                            />
                            <p className="text-[11px] text-cyan-300/80">
                                Position de la barre: ligne {boundaryControl.value}
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 flex items-start gap-2">
                                    <div className="w-5 h-5 rounded bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                        <ChevronLeft className="w-3 h-3 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Dernière ligne scène actuelle</p>
                                        {boundaryControl.before ? (
                                            <p className="text-xs text-foreground/90">{formatSceneLineForReview(boundaryControl.before)}</p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">Aucune</p>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 flex items-start gap-2">
                                    <div className="w-5 h-5 rounded bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                        <ChevronRight className="w-3 h-3 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Première ligne scène suivante</p>
                                        {boundaryControl.after ? (
                                            <p className="text-xs text-foreground/90">{formatSceneLineForReview(boundaryControl.after)}</p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">Aucune</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Styled validation buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-500/90 hover:to-emerald-400/90 text-black font-semibold rounded-lg transition-all hover:scale-[1.02]"
                            disabled={!currentScene}
                            onClick={() => {
                                if (!currentScene) return;
                                setThirdSceneReviewedByOrder((prev) => ({
                                    ...prev,
                                    [currentScene.order]: true,
                                }));
                                if (currentScene.order < sceneWindows.length - 1) {
                                    setSceneCursor(currentScene.order + 1);
                                }
                            }}
                        >
                            <Check className="w-3.5 h-3.5" />
                            Scène validée
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-lg"
                            disabled={!currentScene}
                            onClick={() => {
                                if (!currentScene) return;
                                setThirdSceneReviewedByOrder((prev) => ({
                                    ...prev,
                                    [currentScene.order]: false,
                                }));
                            }}
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            À revoir
                        </Button>
                    </div>
                </div>

                {/* Current scene lines summary */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Répliques de cette scène</p>
                    {currentSceneLines.filter((l) => l.type === "dialogue").slice(0, 15).map((line) => (
                        <div key={`v3-ctrl-line-${line.id}`} className="text-xs leading-relaxed py-0.5">
                            <span className="font-semibold text-cyan-400">{normalizeImportLabel(line.character)}</span>
                            <span className="text-muted-foreground ml-1">{line.text.slice(0, 80)}{line.text.length > 80 ? "…" : ""}</span>
                        </div>
                    ))}
                    {currentSceneLines.filter((l) => l.type === "dialogue").length > 15 && (
                        <p className="text-[10px] text-muted-foreground italic">
                            + {currentSceneLines.filter((l) => l.type === "dialogue").length - 15} répliques supplémentaires
                        </p>
                    )}
                    {currentSceneLines.filter((l) => l.type === "dialogue").length === 0 && (
                        <p className="text-xs text-muted-foreground">Aucune réplique dans cette scène.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
