"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    buildEventsByDate,
} from "@/lib/features/troupe-calendar/build-calendar-view-model";
import {
    createCalendarEvent,
    updateCalendarAttendance,
} from "@/lib/features/troupe-calendar/calendar-gateway";
import type {
    CreateCalendarEventInput,
    TroupeCalendarAttendance,
    TroupeCalendarEvent,
    TroupeCalendarViewModel,
    UpdateCalendarAttendanceInput,
} from "@/lib/features/troupe-calendar/types";

function isSameCalendarDay(left: Date, rightDateString: string) {
    const right = new Date(rightDateString);

    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function upsertAttendance(
    attendances: TroupeCalendarAttendance[] | undefined,
    input: UpdateCalendarAttendanceInput,
    currentUserId: string
) {
    const nextTargetUserId = input.targetUserId || currentUserId;
    const nextAttendances = [...(attendances || [])];
    const matchIndex = nextAttendances.findIndex((attendance) => (
        input.targetGuestId
            ? attendance.guest_id === input.targetGuestId
            : attendance.user_id === nextTargetUserId
    ));

    const nextAttendance: TroupeCalendarAttendance = {
        status: input.status,
        user_id: input.targetGuestId ? undefined : nextTargetUserId,
        guest_id: input.targetGuestId,
    };

    if (matchIndex >= 0) {
        nextAttendances[matchIndex] = {
            ...nextAttendances[matchIndex],
            ...nextAttendance,
        };
        return nextAttendances;
    }

    return [...nextAttendances, nextAttendance];
}

export function useCalendarScreen(initialViewModel: TroupeCalendarViewModel) {
    const router = useRouter();
    const [events, setEvents] = useState(initialViewModel.events);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

    useEffect(() => {
        setEvents(initialViewModel.events);
    }, [initialViewModel.events]);

    const eventsByDate = useMemo(() => buildEventsByDate(events), [events]);

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedEventId) || null,
        [events, selectedEventId]
    );

    const selectedDayEvents = useMemo(() => {
        if (!selectedDayDate) {
            return [];
        }

        return events.filter((event) => isSameCalendarDay(selectedDayDate, event.start_time));
    }, [events, selectedDayDate]);

    const handleOpenAddEvent = useCallback((date?: Date) => {
        setSelectedDate(date || new Date());
        setIsAddEventOpen(true);
    }, []);

    const handleCreateEvent = useCallback(async (input: CreateCalendarEventInput) => {
        try {
            await createCalendarEvent(initialViewModel.troupeId, input);
            setIsAddEventOpen(false);
            toast.success("Événement créé.");
            router.refresh();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }, [initialViewModel.troupeId, router]);

    const handleAttendanceUpdate = useCallback(async (input: UpdateCalendarAttendanceInput) => {
        const previousEvents = events;

        setEvents((currentEvents) =>
            currentEvents.map((event) => (
                event.id === input.eventId
                    ? {
                        ...event,
                        event_attendance: upsertAttendance(
                            event.event_attendance,
                            input,
                            initialViewModel.currentUserId
                        ),
                    }
                    : event
            ))
        );

        try {
            await updateCalendarAttendance(input);
        } catch (error) {
            console.error(error);
            setEvents(previousEvents);
            throw error;
        }
    }, [events, initialViewModel.currentUserId]);

    return {
        state: {
            currentMonth: initialViewModel.currentMonth,
            currentYear: initialViewModel.currentYear,
            currentUserId: initialViewModel.currentUserId,
            members: initialViewModel.members,
            isAdmin: initialViewModel.isAdmin,
            canViewSessionPages: initialViewModel.canViewSessionPages,
            events,
            eventsByDate,
            isAddEventOpen,
            selectedDate,
            selectedEvent,
            selectedDayDate,
            selectedDayEvents,
        },
        actions: {
            setIsAddEventOpen,
            openAddEvent: handleOpenAddEvent,
            createEvent: handleCreateEvent,
            updateAttendance: handleAttendanceUpdate,
            openEvent: (event: TroupeCalendarEvent) => setSelectedEventId(event.id),
            closeEvent: () => setSelectedEventId(null),
            openDay: (date: Date) => setSelectedDayDate(date),
            closeDay: () => setSelectedDayDate(null),
            openEventFromDay: (event: TroupeCalendarEvent) => {
                setSelectedDayDate(null);
                setSelectedEventId(event.id);
            },
        },
    };
}
