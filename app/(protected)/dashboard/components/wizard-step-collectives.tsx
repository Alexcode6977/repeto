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
            {candidates.length > 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-black/20 text-[11px] text-muted-foreground uppercase tracking-wider">
                                <th className="p-4 font-semibold w-[35%]">Indication dans le texte</th>
                                <th className="p-4 font-semibold w-[65%]">Personnages concernés</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
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
                                    <React.Fragment key={candidate.id}>
                                        <tr className="v3-stagger-item group transition-colors hover:bg-white/[0.02]" style={{ animationDelay: `${idx * 50}ms` }}>
                                            <td className="p-4 align-top border-r border-white/5 space-y-3">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-6 h-6 mt-0.5 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0">
                                                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-foreground leading-tight mb-1">{candidate.label}</div>
                                                        <div className="text-[10px] uppercase text-emerald-400 font-medium">
                                                            {candidate.count} occurrence(s)
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 pt-1 border-t border-white/5 mt-3">
                                                    <Select
                                                        value={scope}
                                                        onValueChange={(value) => setScopeById((prev) => ({
                                                            ...prev,
                                                            [candidate.id]: value as "global" | "scene",
                                                        }))}
                                                        disabled={allowedSceneOrders.length <= 1}
                                                    >
                                                        <SelectTrigger className="h-8 w-full text-xs bg-black/20 border-white/10 rounded-lg text-muted-foreground">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-popover dark:bg-[#1a1a1a] border-border dark:border-white/10">
                                                            <SelectItem value="global" className="text-xs">Périmètre Global</SelectItem>
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
                                                                className="h-8 w-full text-xs bg-black/20 border-white/10 rounded-lg text-muted-foreground"
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
                                                            className="h-8 w-full text-xs bg-black/20 hover:bg-white/10 border-white/10 mt-1"
                                                            onClick={() => setContextCandidateId((prev) => (prev === candidate.id ? null : candidate.id))}
                                                        >
                                                            Voir le contexte
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {canonicalCharacters.map((character) => {
                                                        const selected = members.includes(character);
                                                        return (
                                                            <button
                                                                key={`v3-collective-member-${candidate.id}-${character}`}
                                                                type="button"
                                                                onClick={() => toggleMember(candidate.id, character)}
                                                                className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.03] ${selected
                                                                    ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border-emerald-500/40 text-foreground shadow-sm shadow-emerald-500/10"
                                                                    : "bg-black/20 border-white/10 text-muted-foreground hover:bg-white/10"
                                                                    }`}
                                                            >
                                                                {selected ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                                ) : (
                                                                    <div className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0" />
                                                                )}
                                                                {character}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                        {showContextPanel && (
                                            <tr className="bg-black/20 border-t border-white/5">
                                                <td colSpan={2} className="p-0">
                                                    <div className="px-4 py-3 bg-gradient-to-b from-emerald-500/5 to-transparent">
                                                        <p className="text-[11px] font-semibold text-emerald-400 mb-2">
                                                            Aperçu · Scène {contextData.sceneOrder + 1}. {contextData.sceneTitle}
                                                        </p>
                                                        <div className="max-h-[200px] overflow-y-auto rounded-lg border border-white/5 bg-black/40 p-3 space-y-1">
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
                                                                    <div key={`${candidate.id}-ctx-dialogue-${line.id}`} className={`text-xs leading-relaxed rounded-lg px-2 py-1.5 ${isCandidateSpeaker ? "bg-amber-500/15 border border-amber-500/30" : "bg-transparent"}`}>
                                                                        <span
                                                                            className={`inline-block mr-2 px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${isCandidateSpeaker
                                                                                ? "bg-amber-500/30 text-amber-300"
                                                                                : isCanonicalSpeaker
                                                                                    ? "bg-emerald-500/20 text-emerald-300"
                                                                                    : "bg-white/5 text-muted-foreground"
                                                                                }`}
                                                                        >
                                                                            [{speaker}]
                                                                        </span>
                                                                        <span className={isCandidateSpeaker ? "text-amber-100" : "text-muted-foreground"}>{line.text}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {contextData.lines.length === 0 && (
                                                                <p className="text-xs text-muted-foreground">Aucune ligne dans cette scène.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-muted-foreground">
                    <p className="text-sm">Aucun multi-personnage détecté.</p>
                </div>
            )}
        </div>
    );
}
