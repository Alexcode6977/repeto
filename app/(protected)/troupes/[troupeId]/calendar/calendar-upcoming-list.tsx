"use client";

import { Calendar } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { MobileAgendaView } from "./mobile-agenda-view";
import { CalendarUpcomingListDesktop } from "./calendar-upcoming-list.desktop";
import type {
    TroupeCalendarEvent,
    TroupeCalendarMember,
    UpdateCalendarAttendanceInput,
} from "@/lib/features/troupe-calendar/types";

interface CalendarUpcomingListProps {
    events: TroupeCalendarEvent[];
    userId: string;
    members: TroupeCalendarMember[];
    isAdmin: boolean;
    canViewSessionPages: boolean;
    onOpenEvent: (event: TroupeCalendarEvent) => void;
    onUpdateAttendance: (input: UpdateCalendarAttendanceInput) => Promise<void>;
    forceVariant?: "mobile" | "desktop";
}

export function CalendarUpcomingList({
    forceVariant,
    events,
    userId,
    onOpenEvent,
    onUpdateAttendance,
}: CalendarUpcomingListProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const variant = forceVariant || (isDesktop ? "desktop" : "mobile");
    const now = new Date();
    const upcomingEvents = events
        .filter((event) => new Date(event.start_time) >= now)
        .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime());

    if (upcomingEvents.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto opacity-30 mb-4" />
                <p className="font-medium">Aucun événement à venir ce mois-ci</p>
            </div>
        );
    }

    if (variant === "desktop") {
        return (
            <CalendarUpcomingListDesktop
                events={events}
                userId={userId}
                onOpenEvent={onOpenEvent}
                onUpdateAttendance={onUpdateAttendance}
            />
        );
    }

    return (
        <MobileAgendaView
            events={events}
            userId={userId}
            onEventClick={onOpenEvent}
            onUpdateAttendance={onUpdateAttendance}
        />
    );
}
