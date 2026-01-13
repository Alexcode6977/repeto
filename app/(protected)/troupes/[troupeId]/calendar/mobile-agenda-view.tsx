"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Users, ChevronRight, Calendar, Check, X } from "lucide-react";
import { AttendanceToggle } from "./attendance-toggle";

interface MobileAgendaViewProps {
    events: any[];
    userId: string;
    onEventClick: (event: any) => void;
}

// Event type colors and labels
const EVENT_TYPES: Record<string, { color: string; label: string; bgColor: string }> = {
    rehearsal: { color: "text-purple-500", label: "Répétition", bgColor: "bg-purple-500/10" },
    performance: { color: "text-blue-500", label: "Représentation", bgColor: "bg-blue-500/10" },
    meeting: { color: "text-green-500", label: "Réunion", bgColor: "bg-green-500/10" },
    other: { color: "text-yellow-500", label: "Événement", bgColor: "bg-yellow-500/10" }
};

export function MobileAgendaView({ events, userId, onEventClick }: MobileAgendaViewProps) {
    const now = new Date();

    // Group events by date
    const groupedEvents: Record<string, any[]> = {};

    events
        .filter(e => new Date(e.start_time) >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .forEach(event => {
            const dateKey = new Date(event.start_time).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            if (!groupedEvents[dateKey]) groupedEvents[dateKey] = [];
            groupedEvents[dateKey].push(event);
        });

    const dateKeys = Object.keys(groupedEvents);

    if (dateKeys.length === 0) {
        return (
            <div className="md:hidden py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-1">Aucun événement à venir</h3>
                <p className="text-sm text-muted-foreground">
                    Les prochaines répétitions apparaîtront ici
                </p>
            </div>
        );
    }

    return (
        <div className="md:hidden space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Prochains événements
            </h3>

            {dateKeys.slice(0, 5).map((dateKey) => (
                <div key={dateKey} className="space-y-2">
                    {/* Date Header */}
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                            {dateKey}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Events for this date */}
                    {groupedEvents[dateKey].map((event) => {
                        const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
                        const confirmedCount = event.event_attendance?.filter((a: any) => a.status === 'present').length || 0;
                        const totalInvited = event.event_attendance?.length || 0;
                        const myAttendance = event.event_attendance?.find((a: any) => a.user_id === userId)?.status || 'unknown';

                        return (
                            <div
                                key={event.id}
                                className={`p-4 rounded-2xl border border-border/50 ${eventType.bgColor} active:scale-[0.98] transition-all`}
                                onClick={() => onEventClick(event)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        {/* Event Type Badge */}
                                        <span className={`text-xs font-bold uppercase tracking-wider ${eventType.color}`}>
                                            {eventType.label}
                                        </span>

                                        {/* Title */}
                                        <h4 className="font-bold text-lg mt-1 truncate">{event.title}</h4>

                                        {/* Time */}
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                            <Clock className="w-4 h-4 shrink-0" />
                                            <span>
                                                {new Date(event.start_time).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                                {event.end_time && (
                                                    <> - {new Date(event.end_time).toLocaleTimeString('fr-FR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}</>
                                                )}
                                            </span>
                                        </div>

                                        {/* Play info if available */}
                                        {event.plays?.title && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                🎭 {event.plays.title}
                                            </div>
                                        )}

                                        {/* Presence Counter */}
                                        {totalInvited > 0 && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium">{confirmedCount}/{totalInvited}</span>
                                                    <span className="text-muted-foreground">confirmés</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* My Status Badge */}
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center shrink-0
                                        ${myAttendance === 'present' ? 'bg-green-500/20 text-green-500' :
                                            myAttendance === 'absent' ? 'bg-red-500/20 text-red-500' :
                                                'bg-muted text-muted-foreground'}
                                    `}>
                                        {myAttendance === 'present' ? <Check className="w-5 h-5" /> :
                                            myAttendance === 'absent' ? <X className="w-5 h-5" /> :
                                                <span className="text-lg">?</span>}
                                    </div>
                                </div>

                                {/* Quick Action - Only if not answered */}
                                {myAttendance === 'unknown' && (
                                    <div className="mt-3 pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                                        <AttendanceToggle eventId={event.id} currentStatus={myAttendance} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
