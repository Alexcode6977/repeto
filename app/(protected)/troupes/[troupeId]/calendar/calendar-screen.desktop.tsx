import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarView } from "./calendar-view";
import { CalendarUpcomingList } from "./calendar-upcoming-list";
import type {
    TroupeCalendarEvent,
    TroupeCalendarMember,
    UpdateCalendarAttendanceInput,
} from "@/lib/features/troupe-calendar/types";

interface CalendarScreenDesktopProps {
    currentMonth: number;
    currentYear: number;
    events: TroupeCalendarEvent[];
    eventsByDate: Record<number, TroupeCalendarEvent[]>;
    userId: string;
    members: TroupeCalendarMember[];
    isAdmin: boolean;
    canViewSessionPages: boolean;
    onOpenAddEvent: (date?: Date) => void;
    onOpenEvent: (event: TroupeCalendarEvent) => void;
    onUpdateAttendance: (input: UpdateCalendarAttendanceInput) => Promise<void>;
}

export function CalendarScreenDesktop({
    currentMonth,
    currentYear,
    events,
    eventsByDate,
    userId,
    members,
    isAdmin,
    canViewSessionPages,
    onOpenAddEvent,
    onOpenEvent,
    onUpdateAttendance,
}: CalendarScreenDesktopProps) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calendrier</h1>
                    <p className="text-muted-foreground">
                        Répétitions et événements de la troupe.
                    </p>
                </div>
                {isAdmin ? (
                    <Button onClick={() => onOpenAddEvent(new Date())} className="px-4 rounded-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un événement
                    </Button>
                ) : null}
            </div>

            <CalendarView
                forceVariant="desktop"
                currentMonth={currentMonth}
                currentYear={currentYear}
                eventsByDate={eventsByDate}
                onDayCreate={isAdmin ? onOpenAddEvent : undefined}
                onEventOpen={onOpenEvent}
            />

            <CalendarUpcomingList
                forceVariant="desktop"
                events={events}
                userId={userId}
                members={members}
                isAdmin={isAdmin}
                canViewSessionPages={canViewSessionPages}
                onOpenEvent={onOpenEvent}
                onUpdateAttendance={onUpdateAttendance}
            />
        </div>
    );
}
