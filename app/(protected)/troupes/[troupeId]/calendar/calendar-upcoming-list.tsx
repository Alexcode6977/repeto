"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Users, Check, X, ChevronRight, Calendar } from "lucide-react";
import { AttendanceToggle } from "./attendance-toggle";
import { EventDetailsModal } from "./event-details-modal";

interface CalendarUpcomingListProps {
    events: any[];
    userId: string;
}

// Event type colors
const EVENT_TYPES: Record<string, { color: string; borderColor: string; label: string }> = {
    rehearsal: { color: "text-purple-500", borderColor: "border-l-purple-500", label: "Répétition" },
    performance: { color: "text-blue-500", borderColor: "border-l-blue-500", label: "Représentation" },
    meeting: { color: "text-green-500", borderColor: "border-l-green-500", label: "Réunion" },
    other: { color: "text-yellow-500", borderColor: "border-l-yellow-500", label: "Événement" }
};

export function CalendarUpcomingList({ events, userId }: CalendarUpcomingListProps) {
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const now = new Date();

    // Filter and sort upcoming events
    const upcomingEvents = events
        .filter(e => new Date(e.start_time) >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Group by date for mobile
    const groupedByDate: Record<string, any[]> = {};
    upcomingEvents.forEach(event => {
        const dateKey = new Date(event.start_time).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
        groupedByDate[dateKey].push(event);
    });

    if (upcomingEvents.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto opacity-30 mb-4" />
                <p className="font-medium">Aucun événement à venir ce mois-ci</p>
            </div>
        );
    }

    return (
        <>
            {/* Mobile: Agenda View */}
            <div className="md:hidden space-y-6">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    À venir
                </h3>

                {Object.entries(groupedByDate).slice(0, 7).map(([dateKey, dateEvents]) => (
                    <div key={dateKey} className="space-y-2">
                        {/* Date divider */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                                {dateKey}
                            </span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        {/* Events */}
                        {dateEvents.map((event) => {
                            const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
                            const confirmedCount = event.event_attendance?.filter((a: any) => a.status === 'present').length || 0;
                            const totalInvited = event.event_attendance?.length || 0;
                            const myAttendance = event.event_attendance?.find((a: any) => a.user_id === userId)?.status || 'unknown';

                            return (
                                <div
                                    key={event.id}
                                    className="p-4 rounded-2xl bg-card border border-border/50 active:scale-[0.98] transition-all"
                                    onClick={() => setSelectedEvent(event)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${eventType.color}`}>
                                                {eventType.label}
                                            </span>
                                            <h4 className="font-bold text-base mt-1">{event.title}</h4>

                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(event.start_time).toLocaleTimeString('fr-FR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                {totalInvited > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5" />
                                                        {confirmedCount}/{totalInvited}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status indicator */}
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                            ${myAttendance === 'present' ? 'bg-green-500/20 text-green-500' :
                                                myAttendance === 'absent' ? 'bg-red-500/20 text-red-500' :
                                                    'bg-muted text-muted-foreground'}
                                        `}>
                                            {myAttendance === 'present' ? <Check className="w-4 h-4" /> :
                                                myAttendance === 'absent' ? <X className="w-4 h-4" /> :
                                                    <ChevronRight className="w-4 h-4" />}
                                        </div>
                                    </div>

                                    {/* Quick action for unanswered */}
                                    {myAttendance === 'unknown' && (
                                        <div
                                            className="mt-3 pt-3 border-t border-border/50"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <AttendanceToggle eventId={event.id} currentStatus={myAttendance} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Desktop: Card Grid */}
            <div className="hidden md:block space-y-4">
                <h3 className="font-semibold text-lg">Prochains événements</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.slice(0, 6).map(e => {
                        const eventType = EVENT_TYPES[e.event_type] || EVENT_TYPES.other;
                        const confirmedCount = e.event_attendance?.filter((a: any) => a.status === 'present').length || 0;
                        const totalInvited = e.event_attendance?.length || 0;
                        const myAttendance = e.event_attendance?.find((a: any) => a.user_id === userId)?.status || 'unknown';

                        return (
                            <Card
                                key={e.id}
                                className={`border-l-4 ${eventType.borderColor} cursor-pointer hover:bg-muted/50 transition-all`}
                                onClick={() => setSelectedEvent(e)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${eventType.color}`}>
                                                {eventType.label}
                                            </span>
                                            <CardTitle className="text-base mt-1">{e.title}</CardTitle>
                                            <CardDescription className="mt-1">
                                                {new Date(e.start_time).toLocaleDateString('fr-FR', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short'
                                                })} à {new Date(e.start_time).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                                {e.plays && ` • ${e.plays.title}`}
                                            </CardDescription>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <AttendanceToggle
                                                eventId={e.id}
                                                currentStatus={myAttendance}
                                            />
                                        </div>
                                    </div>

                                    {/* Presence counter */}
                                    {totalInvited > 0 && (
                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                <span className="font-medium">{confirmedCount}</span>
                                                <span className="text-muted-foreground">/{totalInvited} confirmés</span>
                                            </span>
                                            {confirmedCount === totalInvited && totalInvited > 0 && (
                                                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-medium">
                                                    Complet ✓
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardHeader>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Event Details Modal */}
            <EventDetailsModal
                event={selectedEvent}
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                members={[]}
                isAdmin={false}
                currentUserId={userId}
            />
        </>
    );
}
