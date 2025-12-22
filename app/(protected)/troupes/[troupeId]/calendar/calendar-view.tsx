"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AttendanceToggle } from "./attendance-toggle";
import { EventDetailsModal } from "./event-details-modal";

interface CalendarViewProps {
    currentMonth: number;
    currentYear: number;
    eventsByDate: Record<number, any[]>;
    userId: string;
    members: any[];
    isAdmin: boolean;
}

export function CalendarView({ currentMonth, currentYear, eventsByDate, userId, members, isAdmin }: CalendarViewProps) {
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    // Grid Logic
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();
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
        <>
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
                            const isToday = new Date().getDate() === day && new Date().getMonth() === new Date().getMonth() && new Date().getFullYear() === new Date().getFullYear();

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
                                            const myAttendance = e.event_attendance?.find((a: any) => a.user_id === userId)?.status || 'unknown';
                                            return (
                                                <div
                                                    key={e.id}
                                                    onClick={() => setSelectedEvent(e)}
                                                    className="text-xs p-1.5 rounded bg-muted hover:bg-muted/80 border-l-2 border-primary group relative cursor-pointer transition-all hover:scale-[1.02]"
                                                >
                                                    <div className="font-semibold truncate">{e.title}</div>
                                                    <div className="text-[10px] text-muted-foreground flex justify-between items-center mt-1">
                                                        <span>{new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <div onClick={(ev) => ev.stopPropagation()}>
                                                            <AttendanceToggle eventId={e.id} currentStatus={myAttendance} compact />
                                                        </div>
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

            <EventDetailsModal
                event={selectedEvent}
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                members={members}
                isAdmin={isAdmin}
            />
        </>
    );
}
