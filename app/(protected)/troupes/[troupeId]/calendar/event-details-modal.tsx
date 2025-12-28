"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, HelpCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { updateAttendance } from "@/lib/actions/calendar";
import { cn } from "@/lib/utils";

interface EventDetailsModalProps {
    event: any;
    members: any[];
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
}

export function EventDetailsModal({ event, members, isOpen, onClose, isAdmin }: EventDetailsModalProps) {
    // Merge members with their attendance status
    const [attendances, setAttendances] = useState<Record<string, string>>({});
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        if (event && isOpen) {
            const initial: Record<string, string> = {};
            event.event_attendance?.forEach((a: any) => {
                const id = a.user_id || a.guest_id;
                if (id) initial[id] = a.status;
            });
            setAttendances(initial);
        }
    }, [event, isOpen]);

    if (!event) return null;

    const handleStatusUpdate = async (member: any, status: 'present' | 'absent') => {
        const id = member.user_id || member.guest_id;
        if (!id) return;

        setUpdating(id);
        try {
            await updateAttendance(
                event.id,
                status,
                member.isGuest ? undefined : member.user_id,
                member.isGuest ? member.guest_id : undefined
            );
            setAttendances(prev => ({ ...prev, [id]: status }));
        } catch (e) {
            console.error(e);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        {event.title}
                        {event.type === 'rehearsal' && <Badge variant="outline">Répétition</Badge>}
                    </DialogTitle>
                    <DialogDescription>
                        {new Date(event.start_time).toLocaleDateString()} • {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Présences ({Object.values(attendances).filter(s => s === 'present').length}/{members.length})</h3>

                    <div className="space-y-2">
                        {members.map(member => {
                            const id = member.user_id || member.guest_id;
                            const status = attendances[id] || 'unknown';
                            const isPresent = status === 'present';
                            const isAbsent = status === 'absent';
                            const isUpdating = updating === id;

                            return (
                                <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-transparent hover:border-secondary/50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className={isPresent ? "bg-green-600 text-foreground" : ""}>
                                                {(member.first_name?.[0] || member.email?.[0] || "?").toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm">{member.first_name || "Membre"}</p>
                                                {member.isGuest && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Invité</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {status === 'unknown' ? 'Non répondu' : status === 'present' ? 'Présent' : 'Absent'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleStatusUpdate(member, 'present')}
                                            disabled={isUpdating}
                                            className={cn(
                                                "h-9 w-9 rounded-full flex items-center justify-center transition-all border",
                                                isPresent ? "bg-green-600 border-green-600 text-foreground shadow-lg shadow-green-900/20" : "border-slate-700 hover:bg-green-950/30 text-slate-500 hover:text-green-500"
                                            )}
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(member, 'absent')}
                                            disabled={isUpdating}
                                            className={cn(
                                                "h-9 w-9 rounded-full flex items-center justify-center transition-all border",
                                                isAbsent ? "bg-red-600 border-red-600 text-foreground shadow-lg shadow-red-900/20" : "border-slate-700 hover:bg-red-950/30 text-slate-500 hover:text-red-500"
                                            )}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
