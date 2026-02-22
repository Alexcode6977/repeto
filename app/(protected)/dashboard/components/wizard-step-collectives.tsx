import React from "react";
import { Users, Check } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    ThirdCollectiveCandidate,
    ThirdSceneWindow,
    isExplicitNamedCollectiveLabel,
    normalizeImportLabel
} from "./import-wizard-types";

// Types matching the state in import-wizard.tsx
export interface CollectiveContextData {
    sceneOrder: number;
    sceneTitle: string;
    lines: {
        id: string;
        type: "dialogue" | "stage_direction" | string;
        character: string;
        text: string;
    }[];
}

export interface WizardStepCollectivesProps {
    candidates: ThirdCollectiveCandidate[];
    scopeById: Record<string, "global" | "scene">;
    setScopeById: React.Dispatch<React.SetStateAction<Record<string, "global" | "scene">>>;
    sceneOrderById: Record<string, number>;
    setSceneOrderById: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    membersById: Record<string, string[]>;
    sceneWindows: ThirdSceneWindow[];
    canonicalCharacters: string[];
    contextCandidateId: string | null;
    setContextCandidateId: React.Dispatch<React.SetStateAction<string | null>>;
    contextById: Record<string, CollectiveContextData>;
    toggleMember: (candidateId: string, character: string) => void;
}

export function WizardStepCollectives({
    candidates,
    scopeById,
    setScopeById,
    sceneOrderById,
    setSceneOrderById,
    membersById,
    sceneWindows,
    canonicalCharacters,
    contextCandidateId,
    setContextCandidateId,
    contextById,
    toggleMember,
}: WizardStepCollectivesProps) {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Résolvez chaque multi-personnage en indiquant ses membres et son périmètre (global ou scène).
            </p>
            <div className="space-y-3">
                {candidates.map((candidate, idx) => {
                    const scope = scopeById[candidate.id] || candidate.scope;
                    const allowedSceneOrders = (candidate.sceneOrders || []).length > 0
                        ? candidate.sceneOrders
                        : sceneWindows.map((scene) => scene.order);
                    const preferredSceneOrder = sceneOrderById[candidate.id] ?? candidate.sceneOrder ?? allowedSceneOrders[0] ?? 0;
                    const sceneOrder = allowedSceneOrders.includes(preferredSceneOrder)
                        ? preferredSceneOrder
                        : (allowedSceneOrders[0] ?? 0);
                    const members = Array.from(new Set(
                        (membersById[candidate.id] || [])
                            .map((value) => normalizeImportLabel(value))
                    ));
                    const isExplicitNamedCollective = isExplicitNamedCollectiveLabel(candidate.label, canonicalCharacters);
                    const contextData = contextById[candidate.id];
                    const showContextPanel = contextCandidateId === candidate.id && !!contextData;
                    const canonicalSet = new Set(canonicalCharacters.map((value) => normalizeImportLabel(value)));
                    return (
                        <div
                            key={candidate.id}
                            className="v3-stagger-item rounded-xl border-l-2 border-l-emerald-500 border border-white/10 bg-white/5 p-4 space-y-3"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <span className="text-sm font-semibold text-foreground">{candidate.label}</span>
                                <span className="text-[10px] uppercase text-muted-foreground px-2 py-0.5 rounded-full bg-white/10 font-medium">
                                    {candidate.count} occurrence(s)
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Select
                                    value={scope}
                                    onValueChange={(value) => setScopeById((prev) => ({
                                        ...prev,
                                        [candidate.id]: value as "global" | "scene",
                                    }))}
                                    disabled={allowedSceneOrders.length <= 1}
                                >
                                    <SelectTrigger className="h-8 w-[160px] text-xs bg-white/5 border-white/15 rounded-lg text-muted-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover dark:bg-[#1a1a1a] border-border dark:border-white/10">
                                        <SelectItem value="global" className="text-xs">Global</SelectItem>
                                        <SelectItem value="scene" className="text-xs">Par scène</SelectItem>
                                    </SelectContent>
                                </Select>

                                {scope === "scene" && (
                                    <Select
                                        value={String(sceneOrder)}
                                        onValueChange={(value) => setSceneOrderById((prev) => ({
                                            ...prev,
                                            [candidate.id]: Number(value),
                                        }))}
                                    >
                                        <SelectTrigger
                                            className="h-8 w-[220px] text-xs bg-white/5 border-white/15 rounded-lg text-muted-foreground"
                                            disabled={allowedSceneOrders.length <= 1}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover dark:bg-[#1a1a1a] border-border dark:border-white/10">
                                            {sceneWindows
                                                .filter((scene) => allowedSceneOrders.includes(scene.order))
                                                .map((scene) => (
                                                    <SelectItem key={`v3-collective-scene-${candidate.id}-${scene.order}`} value={String(scene.order)} className="text-xs">
                                                        {scene.order + 1}. {scene.title}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {!isExplicitNamedCollective && (
                                    <Button
                                        size="sm"
                                        variant={showContextPanel ? "default" : "outline"}
                                        className="h-8 text-xs"
                                        onClick={() => setContextCandidateId((prev) => (prev === candidate.id ? null : candidate.id))}
                                    >
                                        Contexte
                                    </Button>
                                )}
                            </div>

                            {showContextPanel && (
                                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <p className="text-[11px] font-semibold text-cyan-400">
                                        Contexte · {contextData.sceneOrder + 1}. {contextData.sceneTitle}
                                    </p>
                                    <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2 space-y-1">
                                        {contextData.lines.map((line) => {
                                            if (line.type !== "dialogue") {
                                                return (
                                                    <p key={`${candidate.id}-ctx-stage-${line.id}`} className="text-xs italic text-muted-foreground border-l-2 border-muted/30 pl-2">
                                                        {line.text}
                                                    </p>
                                                );
                                            }

                                            const speaker = normalizeImportLabel(line.character);
                                            const isCandidateSpeaker = speaker === candidate.label;
                                            const isCanonicalSpeaker = canonicalSet.has(speaker);
                                            return (
                                                <div key={`${candidate.id}-ctx-dialogue-${line.id}`} className={`text-xs leading-relaxed rounded-lg px-2 py-1.5 ${isCandidateSpeaker ? "bg-amber-500/15 border border-amber-500/30" : "bg-white/5"}`}>
                                                    <span
                                                        className={`inline-block mr-2 px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${isCandidateSpeaker
                                                            ? "bg-amber-500/30 text-amber-300"
                                                            : isCanonicalSpeaker
                                                                ? "bg-cyan-500/20 text-cyan-300"
                                                                : "bg-white/10 text-foreground/80"
                                                            }`}
                                                    >
                                                        [{speaker}]
                                                    </span>
                                                    <span className="text-foreground/90">{line.text}</span>
                                                </div>
                                            );
                                        })}
                                        {contextData.lines.length === 0 && (
                                            <p className="text-xs text-muted-foreground">Aucune ligne dans cette scène.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {canonicalCharacters.map((character) => {
                                    const selected = members.includes(character);
                                    return (
                                        <button
                                            key={`v3-collective-member-${candidate.id}-${character}`}
                                            type="button"
                                            onClick={() => toggleMember(candidate.id, character)}
                                            className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.03] ${selected
                                                ? "bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 border-cyan-500/40 text-foreground"
                                                : "bg-card border-white/10 text-muted-foreground hover:bg-white/10"
                                                }`}
                                        >
                                            {selected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                                            {character}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {candidates.length === 0 && (
                    <p className="text-xs text-muted-foreground">Aucun multi-personnage détecté.</p>
                )}
            </div>
        </div>
    );
}
