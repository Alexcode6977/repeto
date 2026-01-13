import { getTroupeEvents } from "@/lib/actions/calendar";
import { getTroupeDetails, getTroupeMembers, getTroupeGuests } from "@/lib/actions/troupe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AddEventModal } from "./add-event-modal";
import { CalendarView } from "./calendar-view";
import { getTroupePlays } from "@/lib/actions/play";
import { CalendarUpcomingList } from "./calendar-upcoming-list";

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
    const [events, troupe, members, guests, plays] = await Promise.all([
        getTroupeEvents(troupeId, firstDay, lastDay),
        getTroupeDetails(troupeId),
        getTroupeMembers(troupeId),
        getTroupeGuests(troupeId),
        getTroupePlays(troupeId)
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

    const isAdmin = troupe.my_role === 'admin';

    // Group events by date
    const eventsByDate: Record<number, any[]> = {};
    events.forEach(e => {
        const day = new Date(e.start_time).getDate();
        if (!eventsByDate[day]) eventsByDate[day] = [];
        eventsByDate[day].push(e);
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendrier</h1>
                    <p className="hidden md:block text-muted-foreground">
                        Répétitions et événements de la troupe.
                    </p>
                </div>
                {isAdmin && (
                    <AddEventModal troupeId={troupeId} plays={plays} />
                )}
            </div>

            {/* Calendar Grid View */}
            <CalendarView
                currentMonth={currentMonth}
                currentYear={currentYear}
                eventsByDate={eventsByDate}
                userId={user?.id || ''}
                members={allMembers}
                isAdmin={isAdmin}
            />

            {/* Upcoming Events List - Both mobile agenda and desktop cards */}
            <CalendarUpcomingList
                events={events}
                userId={user?.id || ''}
            />
        </div>
    );
}
