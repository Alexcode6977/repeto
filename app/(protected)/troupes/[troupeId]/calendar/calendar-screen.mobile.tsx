import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarView } from "./calendar-view";
import { CalendarUpcomingList } from "./calendar-upcoming-list";
import type {
    TroupeCalendarEvent,
    TroupeCalendarMember,
    UpdateCalendarAttendanceInput,
} from "@/lib/features/troupe-calendar/types";

interface CalendarScreenMobileProps {
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
    onOpenDay: (date: Date) => void;
    onUpdateAttendance: (input: UpdateCalendarAttendanceInput) => Promise<void>;
}

export function CalendarScreenMobile({
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
    onOpenDay,
    onUpdateAttendance,
}: CalendarScreenMobileProps) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Calendrier</h1>
                </div>
                {isAdmin ? (
                    <Button
                        onClick={() => onOpenAddEvent(new Date())}
                        size="icon"
                        className="rounded-full"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                ) : null}
            </div>

            <CalendarView
                forceVariant="mobile"
                currentMonth={currentMonth}
                currentYear={currentYear}
                eventsByDate={eventsByDate}
                onDayCreate={isAdmin ? onOpenAddEvent : undefined}
                onDayOpen={onOpenDay}
                onEventOpen={onOpenEvent}
            />

            <CalendarUpcomingList
                forceVariant="mobile"
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
