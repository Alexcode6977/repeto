import React, { useMemo } from "react";
import { AlertCircle, ArrowRight, User, Users, Shuffle } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
    // Trier les labels pour afficher les plus fréquents en premier
    const sortedLabels = useMemo(() => {
        return [...labels].sort((a, b) => (countByLabel[b] || 0) - (countByLabel[a] || 0));
    }, [labels, countByLabel]);

    return (
        <div className="space-y-6">
            <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-semibold text-cyan-400">Identification des Personnages</h3>
                    <p className="text-sm text-cyan-100/70 mt-1">
                        Pour chaque nom détecté dans le texte, indiquez s'il s'agit d'un personnage à part entière,
                        d'un alias (un autre nom pour un même personnage) ou d'un collectif (plusieurs personnages).
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {sortedLabels.map((label) => {
                    const currentTarget = targetByLabel[label] || label;
                    const isMulti = currentTarget === multiTargetConstant;
                    const isPerso = currentTarget === label;
                    const type = isMulti ? "multi" : isPerso ? "perso" : "alias";

                    // Les options pour le select de l'alias excluent le label courant
                    const aliasOptions = options.filter(opt => opt !== label);

                    return (
                        <div
                            key={label}
                            className="bg-card border border-white/10 p-4 rounded-xl flex flex-col md:flex-row gap-4 md:items-center justify-between shadow-sm transition-colors hover:bg-white/5"
                        >
                            <div className="flex items-center gap-3 w-full md:w-1/3 shrink-0">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-foreground">{label}</span>
                                    <span className="text-xs text-muted-foreground">{countByLabel[label] || 0} lignes</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 justify-end">
                                <RadioGroup
                                    value={type}
                                    onValueChange={(val) => {
                                        if (val === "perso") {
                                            setTargetByLabel(p => ({ ...p, [label]: label }));
                                        } else if (val === "multi") {
                                            setTargetByLabel(p => ({ ...p, [label]: multiTargetConstant }));
                                        } else if (val === "alias") {
                                            const defaultTarget = aliasOptions.length > 0 ? aliasOptions[0] : "";
                                            setTargetByLabel(p => ({ ...p, [label]: defaultTarget }));
                                        }
                                    }}
                                    className="flex items-center gap-4 sm:gap-6"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="perso" id={`perso-${label}`} />
                                        <Label htmlFor={`perso-${label}`} className="text-xs cursor-pointer flex items-center gap-1.5 opacity-90 hover:opacity-100 font-medium whitespace-nowrap">
                                            <User className="w-3.5 h-3.5 hidden sm:block" />
                                            Personnage
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="alias" id={`alias-${label}`} />
                                        <Label htmlFor={`alias-${label}`} className="text-xs cursor-pointer flex items-center gap-1.5 opacity-90 hover:opacity-100 font-medium whitespace-nowrap">
                                            <Shuffle className="w-3.5 h-3.5 hidden sm:block" />
                                            Alias
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="multi" id={`multi-${label}`} />
                                        <Label htmlFor={`multi-${label}`} className="text-xs cursor-pointer flex items-center gap-1.5 opacity-90 hover:opacity-100 font-medium whitespace-nowrap">
                                            <Users className="w-3.5 h-3.5 hidden sm:block" />
                                            Collectif
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {/* Dropdown only visible when 'alias' is selected */}
                                <div className="w-full sm:w-[220px] flex items-center gap-2 h-8">
                                    {type === "alias" && (
                                        <>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground hidden lg:block shrink-0" />
                                            <Select
                                                value={!isMulti && !isPerso ? currentTarget : ''}
                                                onValueChange={(val) => setTargetByLabel(p => ({ ...p, [label]: normalizeLabel(val) }))}
                                            >
                                                <SelectTrigger className="w-full h-8 text-xs bg-black/40 border-white/10">
                                                    <SelectValue placeholder="Choisir le personnage ciblé..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border max-h-[300px]">
                                                    {aliasOptions.length === 0 ? (
                                                        <div className="p-2 text-xs text-muted-foreground text-center">Aucun autre personnage</div>
                                                    ) : (
                                                        aliasOptions.map((opt) => (
                                                            <SelectItem key={opt} value={opt} className="text-xs">
                                                                {opt}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {sortedLabels.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-white/10 rounded-xl">
                        Aucun personnage détecté dans le texte.
                    </div>
                )}
            </div>
        </div>
    );
}
