'use client';

import { updateCasting } from "@/lib/actions/play";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Check, User } from "lucide-react";

interface CastingManagerProps {
    characters: any[];
    troupeMembers: any[];
    guests: any[];
}

export function CastingManager({ characters, troupeMembers, guests }: CastingManagerProps) {
    // Map charId -> assignment (u:userId or g:guestId)
    const [assignments, setAssignments] = useState<Record<string, string>>(() => {
        return Object.fromEntries(characters.map(c => {
            if (c.actor_id) return [c.id, `u:${c.actor_id}`];
            if (c.guest_id) return [c.id, `g:${c.guest_id}`];
            return [c.id, "unassigned"];
        }));
    });
    const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});

    const handleAssign = async (charId: string, assignment: string) => {
        setLoadingState(prev => ({ ...prev, [charId]: true }));
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
            setLoadingState(prev => ({ ...prev, [charId]: false }));
        }
    };

    return (
        <div className="space-y-4">
            {characters.map((char) => (
                <div key={char.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {char.name.substring(0, 2)}
                        </div>
                        <div>
                            <p className="font-medium">{char.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {char.actor_id ? "Attribué" : "Non attribué"}
                            </p>
                        </div>
                    </div>

                    <div className="w-[200px]">
                        <Select
                            value={assignments[char.id]}
                            onValueChange={(val) => handleAssign(char.id, val)}
                            disabled={loadingState[char.id]}
                        >
                            <SelectTrigger className="w-full">
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
                </div>
            ))}
        </div>
    );
}
