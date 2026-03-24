import { createEvent, updateAttendance } from "@/lib/actions/calendar";
import type {
    CreateCalendarEventInput,
    UpdateCalendarAttendanceInput,
} from "@/lib/features/troupe-calendar/types";

export async function createCalendarEvent(troupeId: string, input: CreateCalendarEventInput) {
    await createEvent(
        troupeId,
        input.title,
        input.start,
        input.end,
        input.type,
        input.playId,
        input.recurrence
    );
}

export async function updateCalendarAttendance(input: UpdateCalendarAttendanceInput) {
    await updateAttendance(
        input.eventId,
        input.status,
        input.targetUserId,
        input.targetGuestId
    );
}
