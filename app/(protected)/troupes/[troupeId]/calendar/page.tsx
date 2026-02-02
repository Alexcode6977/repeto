import { getTroupeEvents } from "@/lib/actions/calendar";
import { getTroupeDetails, getTroupeMembers, getTroupeGuests } from "@/lib/actions/troupe";
import { createClient } from "@/lib/supabase/server";
import { CalendarUpcomingList } from "./calendar-upcoming-list";
import { CalendarClient } from "./calendar-client";
import { canManageCalendar } from "@/lib/utils/roles";

export default async function CalendarPage({
    params,
    searchParams
}: {
    params: Promise<{ troupeId: string }>;
    searchParams: Promise<{ month?: string; year?: string }>;
}) {
    const { troupeId } = await params;
    const { month, year } = await searchParams;

    const now = new Date();
    const currentMonth = month ? parseInt(month) : now.getMonth();
    const currentYear = year ? parseInt(year) : now.getFullYear();

    // Calculate dates for the month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    // Parallel fetch for better performance
    const [events, troupe, members, guests] = await Promise.all([
        getTroupeEvents(troupeId, firstDay, lastDay),
        getTroupeDetails(troupeId),
        getTroupeMembers(troupeId),
        getTroupeGuests(troupeId)
    ]);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Combine members and guests
    const allMembers = [
        ...members.map((m: any) => ({ ...m, user_id: m.id || m.user_id })),
        ...guests.map((g: any) => ({
            id: g.id,
            guest_id: g.id,
            first_name: g.name,
            email: g.email || "Invité",
            isGuest: true
        }))
    ];

    const canManage = canManageCalendar(troupe.my_roles);

    // Group events by date
    const eventsByDate: Record<number, any[]> = {};
    events.forEach(e => {
        const day = new Date(e.start_time).getDate();
        if (!eventsByDate[day]) eventsByDate[day] = [];
        eventsByDate[day].push(e);
    });

    return (
        <div className="space-y-6">
            <CalendarClient
                currentMonth={currentMonth}
                currentYear={currentYear}
                eventsByDate={eventsByDate}
                userId={user?.id || ''}
                members={allMembers}
                isAdmin={canManage}
                troupeId={troupeId}
            />

            {/* Upcoming Events List - Both mobile agenda and desktop cards */}
            <CalendarUpcomingList
                events={events}
                userId={user?.id || ''}
            />
        </div>
    );
}
