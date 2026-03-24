"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
    TroupeCalendarEvent,
    TroupeCalendarMember,
    UpdateCalendarAttendanceInput,
} from "@/lib/features/troupe-calendar/types";

interface EventDetailsModalProps {
    event: TroupeCalendarEvent | null;
    members: TroupeCalendarMember[];
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
    canViewSessionPages: boolean;
    currentUserId: string;
    onUpdateAttendance: (input: UpdateCalendarAttendanceInput) => Promise<void>;
}

export function EventDetailsModal({
    event,
    members,
    isOpen,
    onClose,
    isAdmin,
    canViewSessionPages,
    currentUserId,
    onUpdateAttendance,
}: EventDetailsModalProps) {
    const [updating, setUpdating] = useState<string | null>(null);

    if (!event) return null;

    const attendances = (event.event_attendance || []).reduce<Record<string, string>>((accumulator, attendance) => {
        const id = attendance.user_id || attendance.guest_id;
        if (id) {
            accumulator[id] = attendance.status;
        }
        return accumulator;
    }, {});

    const handleStatusUpdate = async (member: TroupeCalendarMember, status: 'present' | 'absent') => {
        const id = member.user_id || member.guest_id;
        if (!id) return;

        setUpdating(id);
        try {
            await onUpdateAttendance({
                eventId: event.id,
                status,
                targetUserId: member.isGuest ? undefined : member.user_id,
                targetGuestId: member.isGuest ? member.guest_id : undefined,
            });
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
                    <DialogTitle className="text-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {event.title}
                            {event.event_type === 'rehearsal' && <Badge variant="outline">Répétition</Badge>}
                        </div>
                        {canViewSessionPages && (
                            <Link href={`/troupes/${event.troupe_id}/sessions/${event.id}`}>
                                <Badge className="cursor-pointer hover:bg-primary/90 flex items-center gap-1">
                                    Voir la séance <ExternalLink className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {new Date(event.start_time).toLocaleDateString()} • {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Présences ({Object.values(attendances).filter(s => s === 'present').length}/{members.length})</h3>

                    <div className="space-y-2">
                        {members.map((member, memberIndex) => {
                            const id = member.user_id || member.guest_id;
                            if (!id) {
                                return null;
                            }

                            const status = attendances[id] || 'unknown';
                            const isPresent = status === 'present';
                            const isAbsent = status === 'absent';
                            const isUpdating = updating === id;

                            return (
                                <div key={`${id}-${memberIndex}`} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-transparent hover:border-secondary/50 transition-all">
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
                                        {(isAdmin || (currentUserId && member.user_id === currentUserId)) && (
                                            <>
                                                    <button
                                                    onClick={() => void handleStatusUpdate(member, 'present')}
                                                    disabled={isUpdating}
                                                    className={cn(
                                                        "h-9 w-9 rounded-full flex items-center justify-center transition-all border",
                                                        isPresent ? "bg-green-600 border-green-600 text-foreground shadow-lg shadow-green-900/20" : "border-slate-700 hover:bg-green-950/30 text-slate-500 hover:text-green-500"
                                                    )}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => void handleStatusUpdate(member, 'absent')}
                                                    disabled={isUpdating}
                                                    className={cn(
                                                        "h-9 w-9 rounded-full flex items-center justify-center transition-all border",
                                                        isAbsent ? "bg-red-600 border-red-600 text-foreground shadow-lg shadow-red-900/20" : "border-slate-700 hover:bg-red-950/30 text-slate-500 hover:text-red-500"
                                                    )}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
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
