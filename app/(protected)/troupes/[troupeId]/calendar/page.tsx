import { getTroupeEvents } from "@/lib/actions/calendar";
import { getTroupeDetails, getTroupeMembers, getTroupeGuests } from "@/lib/actions/troupe";
import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "./calendar-client";
import { canManageCalendar, canViewSessions } from "@/lib/utils/roles";
import { buildTroupeCalendarViewModel } from "@/lib/features/troupe-calendar/build-calendar-view-model";

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

    const canManage = canManageCalendar(troupe.my_roles);
    const canViewSessionPages = canViewSessions(troupe.my_roles);
    const initialViewModel = buildTroupeCalendarViewModel({
        troupeId,
        currentMonth,
        currentYear,
        currentUserId: user?.id || "",
        events,
        members,
        guests,
        isAdmin: canManage,
        canViewSessionPages,
    });

    return (
        <div className="space-y-6">
            <CalendarClient
                initialViewModel={initialViewModel}
            />
        </div>
    );
}
