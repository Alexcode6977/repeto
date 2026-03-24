"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";
import { AttendanceToggle } from "./attendance-toggle";
import type {
    TroupeCalendarEvent,
    UpdateCalendarAttendanceInput,
} from "@/lib/features/troupe-calendar/types";

interface CalendarUpcomingListDesktopProps {
    events: TroupeCalendarEvent[];
    userId: string;
    onOpenEvent: (event: TroupeCalendarEvent) => void;
    onUpdateAttendance: (input: UpdateCalendarAttendanceInput) => Promise<void>;
}

const EVENT_TYPES: Record<string, { color: string; borderColor: string; label: string }> = {
    rehearsal: { color: "text-purple-500", borderColor: "border-l-purple-500", label: "Répétition" },
    performance: { color: "text-blue-500", borderColor: "border-l-blue-500", label: "Représentation" },
    meeting: { color: "text-green-500", borderColor: "border-l-green-500", label: "Réunion" },
    other: { color: "text-yellow-500", borderColor: "border-l-yellow-500", label: "Événement" },
};

export function CalendarUpcomingListDesktop({
    events,
    userId,
    onOpenEvent,
    onUpdateAttendance,
}: CalendarUpcomingListDesktopProps) {
    const now = new Date();
    const upcomingEvents = events
        .filter((event) => new Date(event.start_time) >= now)
        .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime());

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg">Prochains événements</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.slice(0, 6).map((event) => {
                    const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
                    const confirmedCount = event.event_attendance?.filter((attendance) => attendance.status === "present").length || 0;
                    const totalInvited = event.event_attendance?.length || 0;
                    const myAttendance = event.event_attendance?.find((attendance) => attendance.user_id === userId)?.status || "unknown";

                    return (
                        <Card
                            key={event.id}
                            className={`border-l-4 ${eventType.borderColor} cursor-pointer hover:bg-muted/50 transition-all`}
                            onClick={() => onOpenEvent(event)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${eventType.color}`}>
                                            {eventType.label}
                                        </span>
                                        <CardTitle className="text-base mt-1">{event.title}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {new Date(event.start_time).toLocaleDateString("fr-FR", {
                                                weekday: "short",
                                                day: "numeric",
                                                month: "short",
                                            })} à {new Date(event.start_time).toLocaleTimeString("fr-FR", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                            {event.plays?.title ? ` • ${event.plays.title}` : ""}
                                        </CardDescription>
                                    </div>
                                    <div onClick={(eventClick) => eventClick.stopPropagation()}>
                                        <AttendanceToggle
                                            currentStatus={myAttendance}
                                            onUpdate={(status) => onUpdateAttendance({
                                                eventId: event.id,
                                                status,
                                            })}
                                        />
                                    </div>
                                </div>

                                {totalInvited > 0 ? (
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            <span className="font-medium">{confirmedCount}</span>
                                            <span className="text-muted-foreground">/{totalInvited} confirmés</span>
                                        </span>
                                        {confirmedCount === totalInvited && totalInvited > 0 ? (
                                            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-medium">
                                                Complet ✓
                                            </span>
                                        ) : null}
                                    </div>
                                ) : null}
                            </CardHeader>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
