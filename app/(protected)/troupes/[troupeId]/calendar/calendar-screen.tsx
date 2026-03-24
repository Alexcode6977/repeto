"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { AddEventModal } from "./add-event-modal";
import { EventDetailsModal } from "./event-details-modal";
import { DayViewModal } from "./day-view-modal";
import { CalendarScreenDesktop } from "./calendar-screen.desktop";
import { CalendarScreenMobile } from "./calendar-screen.mobile";
import { useCalendarScreen } from "@/lib/features/troupe-calendar/use-calendar-screen";
import type { TroupeCalendarViewModel } from "@/lib/features/troupe-calendar/types";

interface CalendarScreenProps {
    initialViewModel: TroupeCalendarViewModel;
}

export function CalendarScreen({ initialViewModel }: CalendarScreenProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { state, actions } = useCalendarScreen(initialViewModel);

    const rendererProps = {
        currentMonth: state.currentMonth,
        currentYear: state.currentYear,
        events: state.events,
        eventsByDate: state.eventsByDate,
        userId: state.currentUserId,
        members: state.members,
        isAdmin: state.isAdmin,
        canViewSessionPages: state.canViewSessionPages,
        onOpenAddEvent: actions.openAddEvent,
        onOpenEvent: actions.openEvent,
        onUpdateAttendance: actions.updateAttendance,
    };

    return (
        <>
            {isDesktop ? (
                <CalendarScreenDesktop
                    {...rendererProps}
                />
            ) : (
                <CalendarScreenMobile
                    {...rendererProps}
                    onOpenDay={actions.openDay}
                />
            )}

            <AddEventModal
                isOpen={state.isAddEventOpen}
                onOpenChange={actions.setIsAddEventOpen}
                defaultDate={state.selectedDate}
                onCreateEvent={actions.createEvent}
            />

            <EventDetailsModal
                event={state.selectedEvent}
                members={state.members}
                isOpen={Boolean(state.selectedEvent)}
                onClose={actions.closeEvent}
                isAdmin={state.isAdmin}
                canViewSessionPages={state.canViewSessionPages}
                currentUserId={state.currentUserId}
                onUpdateAttendance={actions.updateAttendance}
            />

            <DayViewModal
                isOpen={Boolean(state.selectedDayDate)}
                onClose={actions.closeDay}
                date={state.selectedDayDate}
                events={state.selectedDayEvents}
                userId={state.currentUserId}
                onEventClick={actions.openEventFromDay}
                onUpdateAttendance={actions.updateAttendance}
            />
        </>
    );
}
