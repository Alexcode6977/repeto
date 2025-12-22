import { getTroupeEvents } from "@/lib/actions/calendar";
import { getTroupeDetails } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CalendarIcon, Plus, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { AddEventModal } from "./add-event-modal"; // New component
import { AttendanceToggle } from "./attendance-toggle"; // New component
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
    const plays = await getTroupePlays(troupeId); // For the Add Event Modal
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

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xl font-bold capitalize">
                        {monthNames[currentMonth]} {currentYear}
                    </CardTitle>
                    <div className="flex bg-muted rounded-md overflow-hidden">
                        <Link href={`?month=${prevMonth}&year=${prevYear}`} className="px-3 py-1 hover:bg-background transition-colors">
                            ←
                        </Link>
                        <Link href={`?month=${nextMonth}&year=${nextYear}`} className="px-3 py-1 hover:bg-background transition-colors">
                            →
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground mb-2">
                        <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day, idx) => {
                            if (day === null) return <div key={`empty-${idx}`} className="h-32 bg-transparent" />;

                            const dayEvents = eventsByDate[day] || [];
                            const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

                            return (
                                <div key={day} className={`h-32 border rounded-md p-2 overflow-y-auto ${isToday ? 'border-primary bg-primary/5' : 'bg-card'}`}>
                                    <div className="font-bold mb-2 flex justify-between items-center text-xs">
                                        <span className={isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}>
                                            {day}
                                        </span>
                                        {dayEvents.length > 0 && <span className="text-[10px] text-muted-foreground">{dayEvents.length} évent.</span>}
                                    </div>
                                    <div className="space-y-1">
                                        {dayEvents.map(e => {
                                            const myAttendance = e.event_attendance?.find((a: any) => a.user_id === user?.id)?.status || 'unknown';
                                            return (
                                                <div key={e.id} className="text-xs p-1.5 rounded bg-muted hover:bg-muted/80 border-l-2 border-primary group relative">
                                                    <div className="font-semibold truncate">{e.title}</div>
                                                    <div className="text-[10px] text-muted-foreground flex justify-between items-center mt-1">
                                                        <span>{new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <AttendanceToggle eventId={e.id} currentStatus={myAttendance} compact />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

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
