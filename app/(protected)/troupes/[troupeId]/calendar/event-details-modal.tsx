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
                initial[a.user_id] = a.status;
            });
            setAttendances(initial);
        }
    }, [event, isOpen]);

    if (!event) return null;

    const handleStatusUpdate = async (userId: string, status: 'present' | 'absent') => {
        // Only admins can update others, or users can update themselves
        setUpdating(userId);
        try {
            await updateAttendance(event.id, status, userId); // Need to update action to accept userId
            setAttendances(prev => ({ ...prev, [userId]: status }));
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
                            const status = attendances[member.user_id] || 'unknown';
                            const isPresent = status === 'present';
                            const isAbsent = status === 'absent';
                            const isUpdating = updating === member.user_id;

                            return (
                                <div key={member.user_id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-transparent hover:border-secondary/50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className={isPresent ? "bg-green-600 text-white" : ""}>
                                                {(member.first_name?.[0] || member.email?.[0] || "?").toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-sm">{member.first_name || "Membre"}</p>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {status === 'unknown' ? 'Non répondu' : status === 'present' ? 'Présent' : 'Absent'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleStatusUpdate(member.user_id, 'present')}
                                            disabled={isUpdating}
                                            className={cn(
                                                "h-9 w-9 rounded-full flex items-center justify-center transition-all border",
                                                isPresent ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-900/20" : "border-slate-700 hover:bg-green-950/30 text-slate-500 hover:text-green-500"
                                            )}
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(member.user_id, 'absent')}
                                            disabled={isUpdating}
                                            className={cn(
                                                "h-9 w-9 rounded-full flex items-center justify-center transition-all border",
                                                isAbsent ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20" : "border-slate-700 hover:bg-red-950/30 text-slate-500 hover:text-red-500"
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
