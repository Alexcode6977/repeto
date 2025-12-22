import { getTroupeEvents } from "@/lib/actions/calendar";
import { getTroupeDetails, getTroupeMembers, getTroupeGuests } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AddEventModal } from "./add-event-modal";
import { AttendanceToggle } from "./attendance-toggle";
import { CalendarView } from "./calendar-view";
import { getTroupePlays } from "@/lib/actions/play";

export default async function CalendarPage({
    params,
    searchParams
}: {
    params: Promise<{ troupeId: string }>;
    searchParams: Promise<{ month?: string; year?: string }>;
}) {
    const { troupeId } = await params;
    const { month, year } = await searchParams; // Next.js 15: searchParams is a promise

    const now = new Date();
    const currentMonth = month ? parseInt(month) : now.getMonth();
    const currentYear = year ? parseInt(year) : now.getFullYear();

    // Calculate dates
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const events = await getTroupeEvents(troupeId, firstDay, lastDay);
    const troupe = await getTroupeDetails(troupeId);
    const members = await getTroupeMembers(troupeId);
    const guests = await getTroupeGuests(troupeId);

    // Combine for calendar list
    const allMembers = [
        ...members,
        ...guests.map((g: any) => ({
            user_id: g.id, // Ensure guests have IDs that match their attendance records (which usually link to real users, but here for display) 
            // Wait, guest attendance isn't linked to auth users. This is a limit of the current 'guest' model. 
            // However, the prompt implies "liste des gens", so we list them. 
            // Guests effectively can't have "attendance" checked if they are not users, unless we change schemas. 
            // For now, let's assume we list them but maybe disabling toggle if no user_id? 
            // Actually, let's check schema: event_attendance links to profiles(id). Guests are not profiles. 
            // So for now, we only track real members.
            // But I will list them.
            first_name: g.name,
            email: g.email || "Invité"
        }))
    ];
    // Filter out guests for now regarding attendance logic since schema enforces profile link
    // Only real members for attendance toggle
    const attendanceMembers = members;

    const plays = await getTroupePlays(troupeId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isAdmin = troupe.my_role === 'admin';

    // Simple Grouping by Date
    const eventsByDate: Record<number, any[]> = {};
    events.forEach(e => {
        const day = new Date(e.start_time).getDate();
        if (!eventsByDate[day]) eventsByDate[day] = [];
        eventsByDate[day].push(e);
    });

    // Calendar Grid Logic
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();
    // Adjust for Monday start (French standard)
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const calendarDays = [];
    for (let i = 0; i < offset; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    // Navigation Links
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calendrier</h1>
                    <p className="text-muted-foreground">Répétitions et événements de la troupe.</p>
                </div>
                {isAdmin && (
                    <AddEventModal troupeId={troupeId} plays={plays} />
                )}
            </div>

            <CalendarView
                currentMonth={currentMonth}
                currentYear={currentYear}
                eventsByDate={eventsByDate}
                userId={user?.id || ''}
                members={attendanceMembers}
                isAdmin={isAdmin}
            />

            {/* Upcoming List View */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Prochains événements</h3>
                {events.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Rien de prévu ce mois-ci.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {events.filter(e => new Date(e.start_time) >= new Date()).slice(0, 4).map(e => (
                            <Card key={e.id} className="border-l-4 border-l-primary">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between">
                                        <CardTitle className="text-base">{e.title}</CardTitle>
                                        <AttendanceToggle eventId={e.id} currentStatus={e.event_attendance?.find((a: any) => a.user_id === user?.id)?.status || 'unknown'} />
                                    </div>
                                    <CardDescription>
                                        {new Date(e.start_time).toLocaleDateString()} - {new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {e.plays && ` • ${e.plays.title}`}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
