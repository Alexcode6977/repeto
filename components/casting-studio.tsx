'use client';

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mic,
    Play,
    Search,
    GripVertical,
    User,
    BookOpen,
    Trash2,
    Sparkles,
    Volume2,
    VolumeX,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ElevenLabsVoice, getElevenLabsVoices } from "@/app/actions/elevenlabs";
import { synthesizeSpeech } from "@/app/actions/tts";
import { cn } from "@/lib/utils";
import { updateVoiceAssignment } from "@/lib/actions/voice-cache";

interface CastingStudioProps {
    scriptId: string;
    characters: string[];
    initialAssignments: Record<string, string>;
    onSave?: () => void;
    onClose: () => void;
}

export function CastingStudio({
    scriptId,
    characters,
    initialAssignments,
    onSave,
    onClose
}: CastingStudioProps) {
    const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
    const [search, setSearch] = useState("");
    const [voiceAssignments, setVoiceAssignments] = useState<Record<string, string>>(initialAssignments);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"voices" | "casting">("voices");
    const [selectedCharForAssignment, setSelectedCharForAssignment] = useState<string | null>(null);
    const [selectedGender, setSelectedGender] = useState<string>("All");
    const [selectedAge, setSelectedAge] = useState<string>("All");
    const [showPremade, setShowPremade] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [draggedVoice, setDraggedVoice] = useState<ElevenLabsVoice | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async () => {
        setIsLoading(true);
        const data = await getElevenLabsVoices();
        setVoices(data);
        setIsLoading(false);
    };

    const handleTestVoice = async (voiceId: string, voiceName: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (playingVoiceId === voiceId) {
            setPlayingVoiceId(null);
            return;
        }
        setPlayingVoiceId(voiceId);
        try {
            const result = await synthesizeSpeech(`Test.`, voiceId);
            if ('audio' in result) {
                const audio = new Audio(result.audio);
                audioRef.current = audio;
                audio.onended = () => setPlayingVoiceId(null);
                await audio.play();
            }
        } catch (e) {
            setPlayingVoiceId(null);
        }
    };

    const assignVoice = async (character: string, voiceId: string) => {
        setVoiceAssignments(prev => ({ ...prev, [character]: voiceId }));
        updateVoiceAssignment("private_script", scriptId, character, voiceId, 'elevenlabs', { stability: 0.5, similarity_boost: 0.75 });
    };

    const removeVoice = (character: string) => {
        setVoiceAssignments(prev => {
            const next = { ...prev };
            delete next[character];
            return next;
        });
    };

    const filteredVoices = voices.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
        const matchesGender = selectedGender === "All" || v.labels?.gender?.toLowerCase() === selectedGender.toLowerCase();
        const matchesAge = selectedAge === "All" || v.labels?.age?.toLowerCase() === selectedAge.toLowerCase();
        const matchesType = showPremade || v.category !== "premade";
        return matchesSearch && matchesGender && matchesAge && matchesType;
    });

    const assignedCount = Object.keys(voiceAssignments).length;
    const totalCount = characters.length + 1; // +1 for Didascalies

    return (
        <div className="bg-neutral-900 border border-white/10 md:rounded-[2.5rem] shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col h-[100dvh] md:h-auto md:max-h-[85vh] fixed inset-0 md:relative z-50">
            {/* Header Mignon */}
            <div className="p-4 md:p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] pt-safe md:pt-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-tight text-white">Le Petit Studio Intelligent</h2>
                        <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Casting Vocal ElevenLabs</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/5">
                        <X className="w-5 h-5 text-white/40" />
                    </Button>
                </div>
            </div>

            {/* Mobile Tabs */}
            <div className="flex md:hidden border-b border-white/5 bg-black/40">
                <button
                    onClick={() => setActiveTab("voices")}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === "voices" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-white/30"
                    )}
                >
                    1. Choisir une voix
                </button>
                <button
                    onClick={() => setActiveTab("casting")}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === "casting" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-white/30"
                    )}
                >
                    2. Assigner ({assignedCount}/{totalCount})
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Left: Voice Pool with Advanced Filters */}
                <div className={cn(
                    "w-full md:w-[42%] border-r border-white/5 flex flex-col bg-black/20 overflow-hidden transition-all",
                    activeTab !== "voices" && "hidden md:flex"
                )}>
                    <div className="p-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                            <input
                                type="text"
                                placeholder="Chercher une voix..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            {/* Gender Filter */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase text-white/20 mr-1 w-full flex items-center gap-1">
                                    Genre
                                </span>
                                {["All", "Male", "Female"].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setSelectedGender(g)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                                            selectedGender === g
                                                ? "bg-primary border-primary text-white"
                                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                        )}
                                    >
                                        {g === "All" ? "Tous" : g === "Male" ? "💁‍♂️ Hommes" : "💁‍♀️ Femmes"}
                                    </button>
                                ))}
                            </div>

                            {/* Age Filter */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase text-white/20 mr-1 w-full flex items-center gap-1">
                                    Âge
                                </span>
                                {["All", "Young", "Middle Aged", "Old"].map(a => (
                                    <button
                                        key={a}
                                        onClick={() => setSelectedAge(a)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                                            selectedAge === a
                                                ? "bg-primary border-primary text-white"
                                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                        )}
                                    >
                                        {a === "All" ? "Tous" : a === "Young" ? "👶 Jeune" : a === "Old" ? "👴 Vieux" : "👨 Adulte"}
                                    </button>
                                ))}
                            </div>

                            {/* Premade Toggle */}
                            <button
                                onClick={() => setShowPremade(!showPremade)}
                                className={cn(
                                    "w-full py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between border transition-all",
                                    showPremade
                                        ? "bg-primary/10 border-primary/30 text-primary"
                                        : "bg-white/5 border-white/10 text-white/30"
                                )}
                            >
                                Afficher les voix gratuites
                                <div className={cn("w-6 h-3 rounded-full relative transition-colors", showPremade ? "bg-primary" : "bg-white/20")}>
                                    <div className={cn("absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all", showPremade ? "right-1" : "left-1")} />
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 pt-0 grid grid-cols-1 gap-2">
                        {filteredVoices.map((voice) => {
                            const isUsed = Object.values(voiceAssignments).includes(voice.voice_id);
                            return (
                                <motion.div
                                    key={voice.voice_id}
                                    layout
                                    drag
                                    dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                                    dragElastic={0.1}
                                    onDragStart={() => setDraggedVoice(voice)}
                                    onDragEnd={() => setDraggedVoice(null)}
                                    whileDrag={{ scale: 1.1, zIndex: 50 }}
                                    className={cn(
                                        "group bg-white/5 border border-white/10 rounded-xl p-2.5 px-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all",
                                        isUsed ? "opacity-30 grayscale" : "hover:bg-white/10 hover:border-white/20",
                                        selectedCharForAssignment && !isUsed && "border-primary/50 bg-primary/5"
                                    )}
                                    onClick={() => {
                                        if (selectedCharForAssignment && !isUsed) {
                                            assignVoice(selectedCharForAssignment, voice.voice_id);
                                            setSelectedCharForAssignment(null);
                                            setActiveTab("casting");
                                        }
                                    }}
                                >
                                    <div className="bg-primary/20 p-2 rounded-lg">
                                        <Mic className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{voice.name}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {voice.labels?.gender && (
                                                <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-white/40 font-black uppercase">{voice.labels.gender}</span>
                                            )}
                                            {voice.labels?.age && (
                                                <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-white/40 font-black uppercase">{voice.labels.age}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleTestVoice(voice.voice_id, voice.name)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        {playingVoiceId === voice.voice_id ? (
                                            <VolumeX className="w-4 h-4 text-primary animate-pulse" />
                                        ) : (
                                            <Play className="w-4 h-4 text-white/30 group-hover:text-white" />
                                        )}
                                    </button>
                                </motion.div>
                            );
                        })}
                        {filteredVoices.length === 0 && (
                            <div className="text-center py-10 opacity-20">
                                <Search className="w-10 h-10 mx-auto mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Aucune voix trouvée</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Character Slots */}
                <div className={cn(
                    "flex-1 overflow-y-auto p-4 md:p-6 bg-black/40",
                    activeTab !== "casting" && "hidden md:flex"
                )}>
                    <div className="space-y-3 md:space-y-4 max-w-md mx-auto">
                        {/* Selector Info on Mobile */}
                        {selectedCharForAssignment && (
                            <div className="md:hidden bg-primary/10 border border-primary/20 rounded-xl p-3 mb-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <p className="text-[10px] font-black uppercase text-primary">Assignation : {selectedCharForAssignment}</p>
                                <button onClick={() => setSelectedCharForAssignment(null)} className="text-primary/50 hover:text-primary"><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        <CharacterSlot
                            name="Didascalies (Narration)"
                            type="narration"
                            voiceId={voiceAssignments["didascalies"]}
                            onDrop={() => draggedVoice && assignVoice("didascalies", draggedVoice.voice_id)}
                            onRemove={() => removeVoice("didascalies")}
                            onClick={() => {
                                setSelectedCharForAssignment("didascalies");
                                setActiveTab("voices");
                            }}
                            isSelected={selectedCharForAssignment === "didascalies"}
                            voices={voices}
                            isDragging={!!draggedVoice}
                        />

                        <div className="flex items-center gap-4 py-1.5 md:py-2 opacity-20">
                            <div className="h-px bg-white/50 flex-1" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white whitespace-nowrap">Personnages</span>
                            <div className="h-px bg-white/50 flex-1" />
                        </div>

                        {characters.map((char) => (
                            <CharacterSlot
                                key={char}
                                name={char}
                                voiceId={voiceAssignments[char]}
                                onDrop={() => draggedVoice && assignVoice(char, draggedVoice.voice_id)}
                                onRemove={() => removeVoice(char)}
                                onClick={() => {
                                    setSelectedCharForAssignment(char);
                                    setActiveTab("voices");
                                }}
                                isSelected={selectedCharForAssignment === char}
                                voices={voices}
                                isDragging={!!draggedVoice}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 md:p-5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between pb-safe md:pb-5">
                <p className="text-[10px] text-white/30 font-medium">Assignez toutes les voix pour terminer.</p>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl text-white/50 hover:text-white h-9 px-6 text-xs font-bold">Annuler</Button>
                    <Button
                        onClick={onSave}
                        className="rounded-xl bg-primary hover:bg-primary/80 text-white h-9 px-8 text-xs font-black uppercase tracking-wider"
                        disabled={assignedCount < totalCount}
                    >
                        Terminer & Enregistrer
                    </Button>
                </div>
            </div>

            {/* Drag Overlay Helper */}
            <AnimatePresence>
                {draggedVoice && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed pointer-events-none z-[100] flex items-center gap-2 bg-primary px-4 py-2 rounded-2xl shadow-2xl border border-white/20"
                        style={{ left: "50%", bottom: "40px", transform: "translateX(-50%)" }}
                    >
                        <Mic className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-bold">Relâchez sur un rôle</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

function CharacterSlot({
    name,
    voiceId,
    type = "character",
    onDrop,
    onRemove,
    onClick,
    isSelected = false,
    voices,
    isDragging
}: {
    name: string,
    voiceId?: string,
    type?: string,
    onDrop: () => void,
    onRemove: () => void,
    onClick: () => void,
    isSelected?: boolean,
    voices: ElevenLabsVoice[],
    isDragging: boolean
}) {
    const [isHovered, setIsHovered] = useState(false);
    const assignedVoice = voices.find(v => v.voice_id === voiceId);

    return (
        <div
            onMouseUp={() => isDragging && onDrop()}
            onMouseEnter={() => isDragging && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            className={cn(
                "group relative rounded-2xl border-2 p-3 transition-all duration-300 cursor-pointer overflow-hidden",
                assignedVoice
                    ? "bg-white/5 border-white/10"
                    : isHovered || isSelected
                        ? "bg-primary/20 border-primary border-dashed scale-[1.02]"
                        : isDragging
                            ? "bg-primary/5 border-primary/20 border-dashed animate-pulse"
                            : "bg-white/[0.02] border-white/5 border-dashed hover:border-white/10",
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-black"
            )}
        >
            <div className="flex items-center gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    assignedVoice ? "bg-primary/10" : "bg-white/5"
                )}>
                    {type === "narration" ? <BookOpen className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-white/20" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] uppercase font-black tracking-widest text-white/20 mb-0.5">{type === "narration" ? "Narrateur" : "Rôle"}</p>
                    <p className="text-sm font-bold text-white truncate">{name}</p>
                </div>

                <AnimatePresence mode="wait">
                    {assignedVoice ? (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-neutral-800 rounded-lg p-1.5 px-3 flex items-center gap-2 border border-white/5"
                        >
                            <span className="text-[10px] font-bold text-primary truncate max-w-[80px]">{assignedVoice.name}</span>
                            <button onClick={onRemove} className="text-white/20 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </motion.div>
                    ) : (
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-30 transition-opacity",
                            isDragging && "opacity-100 text-primary animate-bounce"
                        )}>
                            {isDragging ? "Déposer ici" : "Vide"}
                        </span>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
