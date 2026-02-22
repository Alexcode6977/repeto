'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    BookOpen,
    ChevronRight,
    Check,
    Mic,
    Play,
    Search,
    Sparkles,
    Trash2,
    User,
    VolumeX,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleVoiceProfile, getGoogleTTSVoices, synthesizeGoogleTTSPreview } from "@/app/actions/google-tts";
import { cn } from "@/lib/utils";
import { updateVoiceAssignment } from "@/lib/actions/voice-cache";

interface CastingStudioProps {
    scriptId: string;
    characters: string[];
    initialAssignments: Record<string, string>;
    onSave?: () => void;
    onClose: () => void;
}

const NARRATOR_KEY = "didascalies";
const NARRATOR_LABEL = "Didascalies (Narration)";
const VOICE_PREVIEW_TEXT = "Repetto est le compagnon idéal pour répéter mes textes de manière ludique, fluide et efficace, n'est-ce pas ?";

export function CastingStudio({
    scriptId,
    characters,
    initialAssignments,
    onSave,
    onClose
}: CastingStudioProps) {
    const [voices, setVoices] = useState<GoogleVoiceProfile[]>([]);
    const [search, setSearch] = useState("");
    const [voiceAssignments, setVoiceAssignments] = useState<Record<string, string>>(initialAssignments);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"characters" | "voices">("characters");
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [isVoiceFocus, setIsVoiceFocus] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setVoiceAssignments(initialAssignments);
    }, [initialAssignments]);

    useEffect(() => {
        const loadVoices = async () => {
            setIsLoading(true);
            try {
                const data = await getGoogleTTSVoices();
                setVoices(data);
            } finally {
                setIsLoading(false);
            }
        };

        loadVoices();

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    const slotKeys = useMemo(() => [NARRATOR_KEY, ...characters], [characters]);
    const totalCount = slotKeys.length;
    const assignedCount = slotKeys.filter((key) => Boolean(voiceAssignments[key])).length;
    const remainingCount = totalCount - assignedCount;

    const getSlotDisplayName = (slot: string) => (slot === NARRATOR_KEY ? NARRATOR_LABEL : slot);

    const activeCharacter = useMemo(() => {
        if (selectedCharacter && slotKeys.includes(selectedCharacter)) {
            return selectedCharacter;
        }
        return slotKeys.find((slot) => !voiceAssignments[slot]) || slotKeys[0] || null;
    }, [selectedCharacter, slotKeys, voiceAssignments]);

    const nextUnassignedCharacter = useMemo(() => {
        if (!activeCharacter) return null;
        const activeIndex = slotKeys.indexOf(activeCharacter);
        const ordered = [...slotKeys.slice(activeIndex + 1), ...slotKeys.slice(0, activeIndex + 1)];
        return ordered.find((slot) => !voiceAssignments[slot]) || null;
    }, [activeCharacter, slotKeys, voiceAssignments]);

    const activeCharacterVoice = activeCharacter
        ? voices.find((voice) => voice.id === voiceAssignments[activeCharacter] || voice.name === voiceAssignments[activeCharacter] || `fr-FR-Chirp3-HD-${voice.name}` === voiceAssignments[activeCharacter])
        : undefined;

    const handleTestVoice = async (voiceId: string) => {
        setPreviewError(null);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (playingVoiceId === voiceId) {
            setPlayingVoiceId(null);
            return;
        }

        setPlayingVoiceId(voiceId);

        const playAudioWithRetry = async (audioUrl: string, retries = 2): Promise<boolean> => {
            if (!audioUrl) return false;

            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const audio = new Audio(audioUrl);
                    audio.preload = "auto";
                    audioRef.current = audio;
                    audio.onended = () => setPlayingVoiceId(null);
                    await audio.play();
                    return true;
                } catch {
                    if (attempt === retries) {
                        return false;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
                }
            }
            return false;
        };

        try {
            // synthesizeGoogleTTSPreview now returns a string
            const result = await synthesizeGoogleTTSPreview(voiceId, VOICE_PREVIEW_TEXT);

            if (!result) {
                setPreviewError("Erreur lors de la génération de l'audio.");
                setPlayingVoiceId(null);
                return;
            }

            const played = await playAudioWithRetry(result);
            if (played) {
                return;
            }
        } catch {
            setPreviewError("Pré-écoute indisponible pour le moment.");
            setPlayingVoiceId(null);
            return;
        }

        setPlayingVoiceId(null);
    };

    const filteredVoices = voices.filter((voice) => {
        const matchesSearch = voice.name.toLowerCase().includes(search.toLowerCase()) || voice.description.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="relative bg-card dark:bg-neutral-900 border border-border/60 dark:border-white/10 md:rounded-[2.5rem] shadow-2xl overflow-hidden max-w-6xl w-full flex flex-col h-[100dvh] md:h-auto md:max-h-[88vh] fixed inset-0 md:relative z-50">
            <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />
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

            <div className="px-4 md:px-5 py-3 border-b border-border/40 dark:border-white/5 bg-primary/[0.06]">
                <p className="text-[11px] md:text-xs font-semibold text-foreground/90 dark:text-white/80">
                    Les voix de l&apos;IA ont été automatiquement sélectionnées pour correspondre à vos personnages.
                    Vous pouvez écouter un aperçu du rendu ici.
                </p>
            </div>

            <div className="flex md:hidden border-b border-border/40 dark:border-white/5 bg-muted/30 dark:bg-black/40">
                <button
                    onClick={() => setActiveTab("characters")}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === "characters" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground dark:text-white/30"
                    )}
                >
                    Personnages ({assignedCount}/{totalCount})
                </button>
                <button
                    onClick={() => setActiveTab("voices")}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === "voices" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground dark:text-white/30"
                    )}
                >
                    Voix
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                <div className={cn(
                    "w-full border-r border-border/40 dark:border-white/5 flex flex-col bg-muted/20 dark:bg-black/25 overflow-hidden transition-all duration-300",
                    activeTab !== "characters" && "hidden md:flex",
                    isVoiceFocus ? "md:w-[104px] md:min-w-[104px]" : "md:w-[30%] md:min-w-[320px]"
                )}>
                    {!isVoiceFocus ? (
                        <>
                            <div className="p-4 border-b border-border/40 dark:border-white/5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground/90 dark:text-white/90">Personnages</h3>
                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                                        {assignedCount}/{totalCount}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-muted-foreground">Narrateur inclus. Sélectionnez un rôle pour affecter une voix.</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                <CharacterSlot
                                    name={NARRATOR_LABEL}
                                    type="narration"
                                    voiceName={voices.find((v) => v.id === voiceAssignments[NARRATOR_KEY] || v.name === voiceAssignments[NARRATOR_KEY] || `fr-FR-Chirp3-HD-${v.name}` === voiceAssignments[NARRATOR_KEY])?.name}
                                    isSelected={activeCharacter === NARRATOR_KEY}
                                    isDragging={false}
                                    onDrop={() => { }}
                                    onRemove={() => { }}
                                    onClick={() => {
                                        setSelectedCharacter(NARRATOR_KEY);
                                        setActiveTab("voices");
                                    }}
                                />

                                <div className="flex items-center gap-3 py-1 opacity-30">
                                    <div className="h-px bg-foreground/50 flex-1" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground whitespace-nowrap">Rôles</span>
                                    <div className="h-px bg-foreground/50 flex-1" />
                                </div>

                                {characters.map((character) => (
                                    <CharacterSlot
                                        key={character}
                                        name={character}
                                        voiceName={voices.find((v) => v.id === voiceAssignments[character] || v.name === voiceAssignments[character] || `fr-FR-Chirp3-HD-${v.name}` === voiceAssignments[character])?.name}
                                        isSelected={activeCharacter === character}
                                        isDragging={false}
                                        onDrop={() => { }}
                                        onRemove={() => { }}
                                        onClick={() => {
                                            setSelectedCharacter(character);
                                            setActiveTab("voices");
                                        }}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                            {[NARRATOR_KEY, ...characters].map((slot) => {
                                const isSelected = activeCharacter === slot;
                                const isAssigned = Boolean(voiceAssignments[slot]);
                                const initials = slot === NARRATOR_KEY ? "NA" : slot.slice(0, 2).toUpperCase();
                                return (
                                    <button
                                        key={slot}
                                        title={getSlotDisplayName(slot)}
                                        onClick={() => {
                                            setSelectedCharacter(slot);
                                            setActiveTab("voices");
                                        }}
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
                    )}
                </div>

                <div className={cn(
                    "flex-1 overflow-hidden flex flex-col bg-muted/30 dark:bg-black/40",
                    activeTab !== "voices" && "hidden md:flex"
                )}>
                    <div className="p-3 md:p-4 border-b border-border/40 dark:border-white/5 space-y-2 bg-card/80 dark:bg-black/30 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/12 to-cyan-400/10 px-3 py-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/90">Affectation en cours</p>
                                <div className="mt-0.5 flex items-center gap-2 min-w-0">
                                    <p className="text-sm font-bold text-foreground dark:text-white truncate">
                                        {activeCharacter ? getSlotDisplayName(activeCharacter) : "Aucun personnage sélectionné"}
                                    </p>
                                    {activeCharacterVoice && (
                                        <span className="shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                            {activeCharacterVoice.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <div className="relative min-w-0">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 dark:text-white/20" />
                                    <input
                                        type="text"
                                        placeholder="Chercher une voix (ex: Grave, Jeune...)"
                                        className="w-full bg-muted/40 dark:bg-white/5 border border-border/70 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-foreground dark:text-white focus:outline-none focus:border-primary/50 transition-colors"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {previewError && (
                                <p className="text-[10px] font-semibold text-red-600 dark:text-red-300">
                                    {previewError}
                                </p>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1.5">
                            {isLoading && (
                                <div className="text-center py-10 opacity-40">
                                    <Sparkles className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Chargement des voix...</p>
                                </div>
                            )}

                            {!isLoading && filteredVoices.map((voice) => {
                                const assignedToActive = Boolean(activeCharacter && (voiceAssignments[activeCharacter] === voice.id || voiceAssignments[activeCharacter] === voice.name || voiceAssignments[activeCharacter] === `fr-FR-Chirp3-HD-${voice.name}`));

                                return (
                                    <div
                                        key={voice.id}
                                        className={cn(
                                            "group relative overflow-hidden bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10 rounded-xl p-3 flex items-center gap-3 transition-all",
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
                                                {voice.gender && (
                                                    <span className="text-[8px] bg-muted/50 dark:bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground dark:text-white/40 font-black uppercase">{voice.gender}</span>
                                                )}
                                                {voice.age && (
                                                    <span className="text-[8px] bg-muted/50 dark:bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground dark:text-white/40 font-black uppercase">{voice.age}</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1 truncate">{voice.description}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleTestVoice(voice.id);
                                                }}
                                                className="p-1.5 hover:bg-muted/70 dark:hover:bg-white/10 rounded-lg transition-colors border border-border/40"
                                            >
                                                {playingVoiceId === voice.id ? (
                                                    <VolumeX className="w-4 h-4 text-primary animate-pulse" />
                                                ) : (
                                                    <Play className="w-4 h-4 text-muted-foreground/70 dark:text-white/30 group-hover:text-foreground dark:group-hover:text-white" />
                                                )}
                                            </button>

                                            {assignedToActive && (
                                                <span className="h-8 flex items-center px-3 rounded-lg text-[10px] items-center gap-1 font-black uppercase tracking-wider border bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                                                    <Check className="w-3 h-3" /> Connectée
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {!isLoading && filteredVoices.length === 0 && (
                                <div className="text-center py-10 opacity-30">
                                    <Search className="w-10 h-10 mx-auto mb-2" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Aucune voix trouvée</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-3 md:p-4 border-t border-border/40 dark:border-white/5 bg-muted/20 dark:bg-white/[0.01] flex items-center justify-between pb-safe md:pb-4">
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

            </div>
        </div >
    );
}

function CharacterSlot({
    name,
    type = "character",
    voiceName,
    isSelected = false,
    isDragging,
    onDrop,
    onRemove,
    onClick
}: {
    name: string;
    type?: "character" | "narration";
    voiceName?: string;
    isSelected?: boolean;
    isDragging: boolean;
    onDrop: () => void;
    onRemove: () => void;
    onClick: () => void;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const hasVoice = Boolean(voiceName);

    return (
        <div
            onMouseUp={() => isDragging && onDrop()}
            onMouseEnter={() => isDragging && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            className={cn(
                "group relative rounded-2xl border-2 p-3 transition-all duration-300 cursor-pointer overflow-hidden",
                hasVoice
                    ? "bg-muted/40 dark:bg-white/5 border-border/60 dark:border-white/10"
                    : isHovered || isSelected
                        ? "bg-primary/20 border-primary border-dashed scale-[1.01]"
                        : isDragging
                            ? "bg-primary/5 border-primary/20 border-dashed animate-pulse"
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
