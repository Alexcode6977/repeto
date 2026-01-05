'use client';

import { updateCasting } from "@/lib/actions/play";
import { updateVoiceAssignment, VoiceConfig, OpenAIVoice } from "@/lib/actions/voice-cache";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Check, User, Mic, Play } from "lucide-react";
import { Button } from "./ui/button";
import { VoicePreviewButton } from "./voice-preview-button";

interface CastingManagerProps {
    playId: string;
    troupeId: string;
    characters: any[];
    troupeMembers: any[];
    guests: any[];
    isAdmin: boolean;
    initialVoiceConfigs: VoiceConfig[] | null;
}

const VOICES: { id: OpenAIVoice; name: string; gender: string }[] = [
    { id: 'alloy', name: 'Alloy', gender: 'Neutre' },
    { id: 'echo', name: 'Echo', gender: 'Masculin' },
    { id: 'fable', name: 'Fable', gender: 'Masculin (British)' },
    { id: 'onyx', name: 'Onyx', gender: 'Masculin (Grave)' },
    { id: 'nova', name: 'Nova', gender: 'Féminin' },
    { id: 'shimmer', name: 'Shimmer', gender: 'Féminin (Mature)' },
];

export function CastingManager({
    playId,
    troupeId,
    characters,
    troupeMembers,
    guests,
    isAdmin,
    initialVoiceConfigs
}: CastingManagerProps) {
    // Map charId -> assignment (u:userId or g:guestId)
    const [assignments, setAssignments] = useState<Record<string, string>>(() => {
        return Object.fromEntries(characters.map(c => {
            if (c.actor_id) return [c.id, `u:${c.actor_id}`];
            if (c.guest_id) return [c.id, `g:${c.guest_id}`];
            return [c.id, "unassigned"];
        }));
    });

    // Map charName -> voiceId
    const [voiceAssignments, setVoiceAssignments] = useState<Record<string, OpenAIVoice>>(() => {
        const map: Record<string, OpenAIVoice> = {};
        if (initialVoiceConfigs) {
            initialVoiceConfigs.forEach(c => {
                map[c.character_name] = c.voice;
            });
        }
        return map;
    });

    const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});

    const handleAssign = async (charId: string, assignment: string) => {
        if (!isAdmin) return; // double check protection
        setLoadingState(prev => ({ ...prev, [`actor-${charId}`]: true }));
        try {
            let actorId: string | null = null;
            let guestId: string | null = null;

            if (assignment.startsWith('u:')) {
                actorId = assignment.substring(2);
            } else if (assignment.startsWith('g:')) {
                guestId = assignment.substring(2);
            }

            await updateCasting(charId, actorId, guestId);
            setAssignments(prev => ({ ...prev, [charId]: assignment }));
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'attribution du rôle.");
        } finally {
            setLoadingState(prev => ({ ...prev, [`actor-${charId}`]: false }));
        }
    };

    const handleVoiceAssign = async (charName: string, voice: OpenAIVoice) => {
        if (!isAdmin) return;
        setLoadingState(prev => ({ ...prev, [`voice-${charName}`]: true }));
        try {
            const result = await updateVoiceAssignment('troupe_play', playId, charName, voice, troupeId);
            if (result.success) {
                setVoiceAssignments(prev => ({ ...prev, [charName]: voice }));
            } else {
                alert("Erreur: " + result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'attribution de la voix.");
        } finally {
            setLoadingState(prev => ({ ...prev, [`voice-${charName}`]: false }));
        }
    };

    return (
        <div className="space-y-4">
            {characters.map((char) => (
                <div key={char.id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl border border-border bg-white/0 hover:bg-card transition-all group overflow-hidden relative gap-4">

                    {/* Character Info */}
                    <div className="flex items-center gap-4 relative flex-1 w-full md:w-auto">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary font-black text-sm group-hover:scale-110 transition-transform">
                            {char.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{char.name}</p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground whitespace-nowrap">
                                {assignments[char.id] !== "unassigned" ? "✅ Attribué" : "⏳ En attente"}
                            </p>
                        </div>
                    </div>

                    {/* Actor Selection */}
                    <div className="w-full md:w-[200px]">
                        <Select
                            value={assignments[char.id]}
                            onValueChange={(val) => handleAssign(char.id, val)}
                            disabled={!isAdmin || loadingState[`actor-${char.id}`]}
                        >
                            <SelectTrigger className="w-full h-9 text-xs">
                                <SelectValue placeholder="Choisir un acteur" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">-- Non attribué --</SelectItem>

                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Membres Repeto
                                </div>
                                {troupeMembers.map((member) => (
                                    <SelectItem key={member.user_id} value={`u:${member.user_id}`}>
                                        {member.profiles?.first_name || member.profiles?.email || "Membre inconnu"}
                                    </SelectItem>
                                ))}

                                {guests.length > 0 && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 border-t">
                                            Invités (Provisoires)
                                        </div>
                                        {guests.map((guest) => (
                                            <SelectItem key={guest.id} value={`g:${guest.id}`}>
                                                {guest.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Voice Selection (Admin Only) */}
                    {isAdmin ? (
                        <div className="w-full md:w-[200px] flex items-center gap-2">
                            <Select
                                value={voiceAssignments[char.name] || ""}
                                onValueChange={(val) => handleVoiceAssign(char.name, val as OpenAIVoice)}
                                disabled={loadingState[`voice-${char.name}`]}
                            >
                                <SelectTrigger className="w-full h-9 text-xs border-dashed border-primary/30">
                                    <Mic className="w-3 h-3 mr-2 opacity-50" />
                                    <SelectValue placeholder="Voix IA" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Voix OpenAI
                                    </div>
                                    {VOICES.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>
                                            <span className="flex items-center gap-2">
                                                <span>{v.name}</span>
                                                <span className="text-[10px] text-muted-foreground opacity-50">({v.gender})</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {voiceAssignments[char.name] && (
                                <VoicePreviewButton voice={voiceAssignments[char.name]} />
                            )}
                        </div>
                    ) : (
                        // Read-only view for members
                        <div className="w-full md:w-[160px] flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-muted/50 text-xs text-muted-foreground">
                            <Mic className="w-3 h-3 opacity-50" />
                            <span>
                                {VOICES.find(v => v.id === voiceAssignments[char.name])?.name || "Pas de voix IA"}
                            </span>
                        </div>
                    )}

                </div>
            ))}
        </div>
    );
}
