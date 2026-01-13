"use client";

import { X, Clock, MapPin, Users, Check, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendanceToggle } from "./attendance-toggle";

interface DayViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    events: any[];
    userId: string;
    onEventClick: (event: any) => void;
}

export function DayViewModal({ isOpen, onClose, date, events, userId, onEventClick }: DayViewModalProps) {
    if (!isOpen || !date) return null;

    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">
                                {dayNames[date.getDay()]} {date.getDate()}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {monthNames[date.getMonth()]} {date.getFullYear()}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Events List */}
                <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-3">
                    {events.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-lg font-medium">Aucun événement</p>
                            <p className="text-sm">Pas d'événement prévu ce jour</p>
                        </div>
                    ) : (
                        events.map((event) => {
                            const myAttendance = event.event_attendance?.find((a: any) => a.user_id === userId)?.status || 'unknown';
                            const confirmedCount = event.event_attendance?.filter((a: any) => a.status === 'present').length || 0;
                            const totalInvited = event.event_attendance?.length || 0;

                            return (
                                <div
                                    key={event.id}
                                    className="p-4 rounded-2xl bg-muted/50 border border-border/50 active:scale-[0.98] transition-transform"
                                    onClick={() => onEventClick(event)}
                                >
                                    {/* Event Type Badge */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`w-2 h-2 rounded-full ${event.event_type === 'rehearsal' ? 'bg-purple-500' :
                                                event.event_type === 'performance' ? 'bg-blue-500' :
                                                    event.event_type === 'meeting' ? 'bg-green-500' :
                                                        'bg-yellow-500'
                                            }`} />
                                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                            {event.event_type === 'rehearsal' ? 'Répétition' :
                                                event.event_type === 'performance' ? 'Représentation' :
                                                    event.event_type === 'meeting' ? 'Réunion' : 'Événement'}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-bold text-lg mb-2">{event.title}</h3>

                                    {/* Time */}
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            {new Date(event.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                                        </span>
                                    </div>

                                    {/* Presence Counter */}
                                    {totalInvited > 0 && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                            <Users className="w-4 h-4" />
                                            <span>{confirmedCount}/{totalInvited} confirmés</span>
                                        </div>
                                    )}

                                    {/* Quick Attendance Actions */}
                                    <div className="flex gap-2 pt-2 border-t border-border/50">
                                        <AttendanceToggle
                                            eventId={event.id}
                                            currentStatus={myAttendance}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
