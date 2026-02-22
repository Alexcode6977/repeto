import React, { useMemo } from "react";
import { User, ArrowRight, Shuffle, UserCheck, AlertCircle, Users } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface WizardStepAliasProps {
    labels: string[];
    targetByLabel: Record<string, string>;
    setTargetByLabel: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    countByLabel: Record<string, number>;
    options: string[];
    normalizeLabel: (label: string) => string;
    multiTargetConstant: string;
}

export function WizardStepAlias({
    labels,
    targetByLabel,
    setTargetByLabel,
    countByLabel,
    options,
    normalizeLabel,
    multiTargetConstant,
}: WizardStepAliasProps) {
    // Grouper les labels bruts (alias potentiels) par personnage cible
    const groupedByTarget = useMemo(() => {
        const groups: Record<string, string[]> = {};
        options.forEach(opt => { groups[opt] = []; });
        groups["unassigned"] = []; // Pour les labels non-assignés ou 'Aucun'
        groups[multiTargetConstant] = [];

        labels.forEach(label => {
            const target = targetByLabel[label] || label;
            if (options.includes(target)) {
                groups[target].push(label);
            } else if (target === multiTargetConstant) {
                groups[multiTargetConstant].push(label);
            } else {
                groups["unassigned"].push(label);
            }
        });
        return groups;
    }, [labels, targetByLabel, options, multiTargetConstant]);

    return (
        <div className="space-y-6">
            <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-semibold text-cyan-400">Fusion des Alias</h3>
                    <p className="text-sm text-cyan-100/70 mt-1">
                        L'IA a détecté les personnages principaux (canoniques). Assurez-vous que les différents noms (les alias)
                        sont bien rangés sous le bon personnage. Déplacez un alias si nécessaire.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {options.map((canon) => {
                    const mappedLabels = groupedByTarget[canon] || [];
                    const exactMatch = mappedLabels.includes(canon);
                    const aliases = mappedLabels.filter(l => l !== canon);

                    return (
                        <div key={canon} className="bg-card border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                            <div className="p-3 bg-white/5 border-b border-white/5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/30">
                                    <UserCheck className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-foreground">{canon}</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                        Personnage Canonique
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 bg-black/20 flex-1 space-y-2">
                                {exactMatch && (
                                    <div className="px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span className="text-xs font-semibold text-emerald-100">{canon}</span>
                                        </div>
                                        <span className="text-[10px] text-emerald-400/70 bg-emerald-500/10 px-1.5 rounded-full">
                                            {countByLabel[canon] || 0} lignes
                                        </span>
                                    </div>
                                )}

                                {aliases.length > 0 && (
                                    <div className="pt-2">
                                        <p className="text-[10px] text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                                            Alias fusionnés
                                        </p>
                                        <div className="space-y-1.5">
                                            {aliases.map(alias => (
                                                <div key={alias} className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 p-2 rounded-lg transition-colors flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-amber-100/90 flex items-center gap-1.5">
                                                            <Shuffle className="w-3 h-3 text-amber-400/50" />
                                                            {alias}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {countByLabel[alias] || 0}
                                                        </span>
                                                    </div>

                                                    {/* Sélecteur de changement (visible au survol ou toujours ?) */}
                                                    <div className="mt-1">
                                                        <Select
                                                            value={targetByLabel[alias] || alias}
                                                            onValueChange={(value) => setTargetByLabel((prev) => ({
                                                                ...prev,
                                                                [alias]: normalizeLabel(value),
                                                            }))}
                                                        >
                                                            <SelectTrigger className="h-6 w-full text-[10px] bg-black/40 border-white/10 rounded focus:ring-amber-500/30">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-popover border-border">
                                                                {options.map((opt) => (
                                                                    <SelectItem key={`opt-${alias}-${opt}`} value={opt} className="text-xs">
                                                                        → {opt}
                                                                    </SelectItem>
                                                                ))}
                                                                <SelectItem value={multiTargetConstant} className="text-xs text-muted-foreground">
                                                                    Retirer (Multi-perso)
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!exactMatch && aliases.length === 0 && (
                                    <p className="text-xs text-muted-foreground/50 italic py-4 text-center">
                                        Aucun texte attribué.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Autre catégorie (multi personnages ou non assignés) */}
                {(groupedByTarget[multiTargetConstant]?.length > 0 || groupedByTarget["unassigned"]?.length > 0) && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-foreground">Collectifs & Non-Affinés</h4>
                                <p className="text-[10px] text-amber-400/70 uppercase tracking-widest">
                                    À rediriger ou laisser tel quel
                                </p>
                            </div>
                        </div>
                        <div className="p-3 bg-black/20 flex-1 space-y-1.5">
                            {[...(groupedByTarget[multiTargetConstant] || []), ...(groupedByTarget["unassigned"] || [])].map(label => (
                                <div key={label} className="bg-white/5 border border-white/5 p-2 rounded-lg flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-foreground">{label}</span>
                                        <span className="text-[10px] text-muted-foreground">{countByLabel[label] || 0}</span>
                                    </div>
                                    <Select
                                        value={targetByLabel[label] || multiTargetConstant}
                                        onValueChange={(value) => setTargetByLabel((prev) => ({
                                            ...prev,
                                            [label]: normalizeLabel(value),
                                        }))}
                                    >
                                        <SelectTrigger className="h-6 w-full text-[10px] bg-black/40 border-white/10 rounded focus:ring-amber-500/30">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border">
                                            {options.map((opt) => (
                                                <SelectItem key={`opt-${label}-${opt}`} value={opt} className="text-xs">
                                                    → {opt}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value={multiTargetConstant} className="text-xs text-muted-foreground">
                                                C'est un collectif
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
