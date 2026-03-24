export type CalendarAttendanceStatus = "present" | "absent" | "unknown";

export interface TroupeCalendarAttendance {
    user_id?: string | null;
    guest_id?: string | null;
    status: Exclude<CalendarAttendanceStatus, "unknown">;
}

export interface TroupeCalendarPlaySummary {
    title?: string | null;
}

export interface TroupeCalendarEvent {
    id: string;
    troupe_id?: string | null;
    title: string;
    event_type: string;
    start_time: string;
    end_time?: string | null;
    play_id?: string | null;
    plays?: TroupeCalendarPlaySummary | null;
    event_attendance?: TroupeCalendarAttendance[];
}

export interface TroupeCalendarMember {
    id?: string;
    user_id?: string;
    guest_id?: string;
    first_name?: string | null;
    email?: string | null;
    isGuest?: boolean;
}

export interface TroupeCalendarViewModel {
    troupeId: string;
    currentMonth: number;
    currentYear: number;
    currentUserId: string;
    members: TroupeCalendarMember[];
    events: TroupeCalendarEvent[];
    eventsByDate: Record<number, TroupeCalendarEvent[]>;
    isAdmin: boolean;
    canViewSessionPages: boolean;
}

export interface CreateCalendarEventInput {
    title: string;
    start: Date;
    end: Date;
    recurrence: "none" | "weekly";
    type: string;
    playId?: string;
}

export interface UpdateCalendarAttendanceInput {
    eventId: string;
    status: Exclude<CalendarAttendanceStatus, "unknown">;
    targetUserId?: string;
    targetGuestId?: string;
}
