"use client";

import { BookOpen, Check, Mic, Play, Search, Sparkles, User, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CastingStudioViewProps } from "@/components/casting-studio.types";

const NARRATOR_KEY = "didascalies";

function matchesVoiceAssignment(voiceId: string, assignedVoice?: string, voiceName?: string) {
    return assignedVoice === voiceId
        || assignedVoice === voiceName
        || assignedVoice === `fr-FR-Chirp3-HD-${voiceName}`;
}

export function CastingStudioFrame({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative bg-card dark:bg-neutral-900 border border-border/60 dark:border-white/10 md:rounded-[2.5rem] shadow-2xl overflow-hidden max-w-6xl w-full flex flex-col h-[100dvh] md:h-auto md:max-h-[88vh] fixed inset-0 md:relative z-50">
            <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />
            {children}
        </div>
    );
}

export function CastingStudioHeader({
    onClose,
}: Pick<CastingStudioViewProps, "onClose">) {
    return (
        <div className="p-4 md:p-5 border-b border-border/40 dark:border-white/5 flex items-center justify-between bg-muted/20 dark:bg-white/[0.02] pt-safe md:pt-5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-black tracking-tight text-foreground dark:text-white">Casting</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted/70 dark:hover:bg-white/5">
                <X className="w-5 h-5 text-muted-foreground dark:text-white/40" />
            </Button>
        </div>
    );
}

export function CastingStudioIntro() {
    return (
        <div className="px-4 md:px-5 py-3 border-b border-border/40 dark:border-white/5 bg-primary/[0.06]">
            <p className="text-[11px] md:text-xs font-semibold text-foreground/90 dark:text-white/80">
                Les voix de l&apos;IA ont été automatiquement sélectionnées pour correspondre à vos personnages.
                Vous pouvez écouter un aperçu du rendu ici.
            </p>
        </div>
    );
}

export function CastingStudioTabs({
    activeTab,
    assignedCount,
    totalCount,
    onSetActiveTab,
}: Pick<CastingStudioViewProps, "activeTab" | "assignedCount" | "totalCount" | "onSetActiveTab">) {
    return (
        <div className="flex border-b border-border/40 dark:border-white/5 bg-muted/30 dark:bg-black/40 md:hidden">
            <button
                onClick={() => onSetActiveTab("characters")}
                className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === "characters" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground dark:text-white/30"
                )}
            >
                Personnages ({assignedCount}/{totalCount})
            </button>
            <button
                onClick={() => onSetActiveTab("voices")}
                className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === "voices" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground dark:text-white/30"
                )}
            >
                Voix
            </button>
        </div>
    );
}

export function CastingStudioCharacterList(props: CastingStudioViewProps) {
    return (
        <div className="space-y-3">
            {props.slotKeys.map((slot) => {
                const voiceName = props.voices.find((voice) => matchesVoiceAssignment(voice.id, props.voiceAssignments[slot], voice.name))?.name;
                return (
                    <CharacterSlot
                        key={slot}
                        name={props.getSlotDisplayName(slot)}
                        type={slot === NARRATOR_KEY ? "narration" : "character"}
                        voiceName={voiceName}
                        isSelected={props.activeCharacter === slot}
                        onClick={() => props.onSelectCharacter(slot)}
                    />
                );
            })}
        </div>
    );
}

export function CastingStudioCharacterRail(props: CastingStudioViewProps) {
    return (
        <div className="grid grid-cols-3 gap-2">
            {props.slotKeys.map((slot) => {
                const isSelected = props.activeCharacter === slot;
                const isAssigned = Boolean(props.voiceAssignments[slot]);
                const initials = slot === NARRATOR_KEY ? "NA" : slot.slice(0, 2).toUpperCase();

                return (
                    <button
                        key={slot}
                        title={props.getSlotDisplayName(slot)}
                        onClick={() => props.onSelectCharacter(slot)}
                        className={cn(
                            "w-full aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5",
                            isSelected
                                ? "bg-primary/20 border-primary shadow-[0_0_0_1px_rgba(139,92,246,0.3)]"
                                : "bg-card/60 border-border/60 hover:border-primary/40 hover:bg-primary/5"
                        )}
                    >
                        <span className={cn(
                            "text-[11px] font-black tracking-wide",
                            isSelected ? "text-primary" : "text-foreground/80"
                        )}>
                            {initials}
                        </span>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isAssigned ? "bg-emerald-500" : "bg-muted-foreground/40"
                        )} />
                    </button>
                );
            })}
        </div>
    );
}

export function CastingStudioVoicePanel(props: CastingStudioViewProps) {
    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-muted/30 dark:bg-black/40">
            <div className="p-3 md:p-4 border-b border-border/40 dark:border-white/5 space-y-2 bg-card/80 dark:bg-black/30 backdrop-blur-sm">
                <div className="min-w-0 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/12 to-cyan-400/10 px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/90">Affectation en cours</p>
                    <div className="mt-0.5 flex items-center gap-2 min-w-0">
                        <p className="text-sm font-bold text-foreground dark:text-white truncate">
                            {props.activeCharacter ? props.getSlotDisplayName(props.activeCharacter) : "Aucun personnage sélectionné"}
                        </p>
                        {props.activeCharacterVoice ? (
                            <span className="shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                {props.activeCharacterVoice.name}
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="relative min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 dark:text-white/20" />
                    <input
                        type="text"
                        placeholder="Chercher une voix (ex: Grave, Jeune...)"
                        className="w-full bg-muted/40 dark:bg-white/5 border border-border/70 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-foreground dark:text-white focus:outline-none focus:border-primary/50 transition-colors"
                        value={props.search}
                        onChange={(event) => props.onSearchChange(event.target.value)}
                    />
                </div>

                {props.previewError ? (
                    <p className="text-[10px] font-semibold text-red-600 dark:text-red-300">
                        {props.previewError}
                    </p>
                ) : null}
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1.5">
                {props.isLoading ? (
                    <div className="text-center py-10 opacity-40">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                        <p className="text-xs font-bold uppercase tracking-widest">Chargement des voix...</p>
                    </div>
                ) : null}

                {!props.isLoading && props.filteredVoices.map((voice) => {
                    const assignedToActive = Boolean(
                        props.activeCharacter && matchesVoiceAssignment(voice.id, props.voiceAssignments[props.activeCharacter], voice.name)
                    );

                    return (
                        <button
                            key={voice.id}
                            onClick={() => props.onAssignVoice(voice.id)}
                            className={cn(
                                "group relative overflow-hidden w-full text-left bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10 rounded-xl p-3 flex items-center gap-3 transition-all",
                                "hover:bg-muted/70 dark:hover:bg-white/10",
                                assignedToActive && "border-primary/60 bg-primary/12 shadow-[0_0_0_1px_rgba(139,92,246,0.35)]"
                            )}
                        >
                            <div className="bg-primary/20 p-2 rounded-lg">
                                <Mic className="w-4 h-4 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground dark:text-white truncate">{voice.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    {voice.gender ? (
                                        <span className="text-[8px] bg-muted/50 dark:bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground dark:text-white/40 font-black uppercase">{voice.gender}</span>
                                    ) : null}
                                    {voice.age ? (
                                        <span className="text-[8px] bg-muted/50 dark:bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground dark:text-white/40 font-black uppercase">{voice.age}</span>
                                    ) : null}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 truncate">{voice.description}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        void props.onTestVoice(voice.id);
                                    }}
                                    className="p-1.5 hover:bg-muted/70 dark:hover:bg-white/10 rounded-lg transition-colors border border-border/40"
                                >
                                    {props.playingVoiceId === voice.id ? (
                                        <VolumeX className="w-4 h-4 text-primary animate-pulse" />
                                    ) : (
                                        <Play className="w-4 h-4 text-muted-foreground/70 dark:text-white/30 group-hover:text-foreground dark:group-hover:text-white" />
                                    )}
                                </button>

                                {assignedToActive ? (
                                    <span className="h-8 flex items-center px-3 rounded-lg text-[10px] items-center gap-1 font-black uppercase tracking-wider border bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                                        <Check className="w-3 h-3" /> Connectée
                                    </span>
                                ) : null}
                            </div>
                        </button>
                    );
                })}

                {!props.isLoading && props.filteredVoices.length === 0 ? (
                    <div className="text-center py-10 opacity-30">
                        <Search className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">Aucune voix trouvée</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function CastingStudioFooter({
    remainingCount,
    assignedCount,
    totalCount,
    onClose,
    onSave,
}: Pick<CastingStudioViewProps, "remainingCount" | "assignedCount" | "totalCount" | "onClose" | "onSave">) {
    return (
        <div className="p-3 md:p-4 border-t border-border/40 dark:border-white/5 bg-muted/20 dark:bg-white/[0.01] flex items-center justify-between gap-3 pb-safe md:pb-4">
            <p className="text-[10px] text-muted-foreground dark:text-white/30 font-medium">
                {remainingCount === 0
                    ? "Toutes les voix sont assignées. Vous pouvez enregistrer."
                    : `Il reste ${remainingCount} voix à assigner.`}
            </p>
            <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="rounded-xl text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white h-9 px-6 text-xs font-bold">
                    Annuler
                </Button>
                <Button
                    onClick={onSave}
                    className="rounded-xl bg-primary hover:bg-primary/80 text-white h-9 px-8 text-xs font-black uppercase tracking-wider"
                    disabled={assignedCount < totalCount}
                >
                    Terminer & enregistrer
                </Button>
            </div>
        </div>
    );
}

function CharacterSlot({
    name,
    type = "character",
    voiceName,
    isSelected = false,
    onClick,
}: {
    name: string;
    type?: "character" | "narration";
    voiceName?: string;
    isSelected?: boolean;
    onClick: () => void;
}) {
    const hasVoice = Boolean(voiceName);

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative rounded-2xl border-2 p-3 transition-all duration-300 cursor-pointer overflow-hidden",
                hasVoice
                    ? "bg-muted/40 dark:bg-white/5 border-border/60 dark:border-white/10"
                    : isSelected
                        ? "bg-primary/20 border-primary border-dashed scale-[1.01]"
                        : "bg-muted/20 dark:bg-white/[0.02] border-border/40 dark:border-white/5 border-dashed hover:border-border dark:hover:border-white/10",
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    hasVoice ? "bg-primary/10" : "bg-muted/60 dark:bg-white/5"
                )}>
                    {type === "narration"
                        ? <BookOpen className="w-4 h-4 text-primary" />
                        : <User className="w-4 h-4 text-muted-foreground/70 dark:text-white/20" />}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/80 dark:text-white/20 mb-0.5">
                        {type === "narration" ? "Narrateur" : "Rôle"}
                    </p>
                    <p className="text-sm font-bold text-foreground dark:text-white truncate">{name}</p>
                    <p className={cn(
                        "text-[10px] mt-1 font-semibold",
                        hasVoice ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"
                    )}>
                        {hasVoice ? `Assigné: ${voiceName}` : "Non assigné"}
                    </p>
                </div>
            </div>
        </div>
    );
}
