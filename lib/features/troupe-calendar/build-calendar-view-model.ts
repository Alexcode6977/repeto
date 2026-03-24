import type {
    TroupeCalendarEvent,
    TroupeCalendarMember,
    TroupeCalendarViewModel,
} from "@/lib/features/troupe-calendar/types";

interface BuildTroupeCalendarViewModelInput {
    troupeId: string;
    currentMonth: number;
    currentYear: number;
    currentUserId: string;
    events: TroupeCalendarEvent[];
    members: any[];
    guests: any[];
    isAdmin: boolean;
    canViewSessionPages: boolean;
}

export function buildTroupeCalendarMembers(members: any[], guests: any[]): TroupeCalendarMember[] {
    return [
        ...members.map((member) => ({
            ...member,
            user_id: member.id || member.user_id,
        })),
        ...guests.map((guest) => ({
            id: guest.id,
            guest_id: guest.id,
            first_name: guest.name,
            email: guest.email || "Invité",
            isGuest: true,
        })),
    ];
}

export function buildEventsByDate(events: TroupeCalendarEvent[]): Record<number, TroupeCalendarEvent[]> {
    return events.reduce<Record<number, TroupeCalendarEvent[]>>((accumulator, event) => {
        const day = new Date(event.start_time).getDate();

        if (!accumulator[day]) {
            accumulator[day] = [];
        }

        accumulator[day].push(event);
        return accumulator;
    }, {});
}

export function buildTroupeCalendarViewModel({
    troupeId,
    currentMonth,
    currentYear,
    currentUserId,
    events,
    members,
    guests,
    isAdmin,
    canViewSessionPages,
}: BuildTroupeCalendarViewModelInput): TroupeCalendarViewModel {
    const normalizedMembers = buildTroupeCalendarMembers(members, guests);

    return {
        troupeId,
        currentMonth,
        currentYear,
        currentUserId,
        members: normalizedMembers,
        events,
        eventsByDate: buildEventsByDate(events),
        isAdmin,
        canViewSessionPages,
    };
}
