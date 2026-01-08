"use client";

import { useState, useEffect } from "react";
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

function TimeDisplay({ dateString }: { dateString: string }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return <span className="invisible">00:00</span>;

    return <span>{new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
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
            <Card className="border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-sm">
                <CardHeader className="px-0 md:px-6 flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xl font-bold capitalize flex items-center gap-2">
                        <span className="md:hidden">🗓️</span>
                        {monthNames[currentMonth]} {currentYear}
                    </CardTitle>
                    <div className="flex bg-muted rounded-full overflow-hidden scale-90 md:scale-100">
                        <Link href={`?month=${prevMonth}&year=${prevYear}`} className="px-4 py-1.5 hover:bg-background transition-colors font-bold">
                            ←
                        </Link>
                        <Link href={`?month=${nextMonth}&year=${nextYear}`} className="px-4 py-1.5 hover:bg-background transition-colors font-bold">
                            →
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="px-0 md:px-6">
                    <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs md:text-sm font-medium text-muted-foreground mb-2">
                        <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {calendarDays.map((day, idx) => {
                            if (day === null) return <div key={`empty-${idx}`} className="min-h-[50px] md:h-32 bg-transparent" />;

                            const dayEvents = eventsByDate[day] || [];
                            const isToday = new Date().getDate() === day && new Date().getMonth() === new Date().getMonth() && new Date().getFullYear() === new Date().getFullYear();
                            const hasEvents = dayEvents.length > 0;

                            return (
                                <div key={day} className={`min-h-[50px] md:h-32 border rounded-xl md:rounded-md p-1 md:p-2 overflow-hidden ${isToday ? 'border-primary bg-primary/5' : 'bg-card/50 md:bg-card'} ${hasEvents ? 'border-primary/20' : 'border-transparent md:border-border'}`}>
                                    <div className="font-bold mb-1 md:mb-2 flex flex-col md:flex-row justify-between items-center text-xs">
                                        <span className={isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shrink-0" : "text-muted-foreground"}>
                                            {day}
                                        </span>
                                        {/* Desktop Counter */}
                                        {dayEvents.length > 0 && <span className="hidden md:inline text-[10px] text-muted-foreground">{dayEvents.length} évent.</span>}

                                        {/* Mobile Dot */}
                                        {dayEvents.length > 0 && <span className="md:hidden w-1.5 h-1.5 rounded-full bg-primary mt-1" />}
                                    </div>

                                    {/* Desktop Events List */}
                                    <div className="space-y-1 hidden md:block">
                                        {dayEvents.map(e => {
                                            const myAttendance = e.event_attendance?.find((a: any) => a.user_id === userId)?.status || 'unknown';
                                            return (
                                                <div
                                                    key={e.id}
                                                    onClick={() => setSelectedEvent(e)}
                                                    className="text-xs p-1.5 rounded bg-muted hover:bg-muted/80 border-l-2 border-primary group relative cursor-pointer transition-all hover:scale-[1.02]"
                                                >
                                                    <div className="font-semibold truncate">{e.title}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Mobile Click Handler overlay (entire cell) */}
                                    <div
                                        className="md:hidden absolute inset-0 z-10"
                                        onClick={() => {
                                            // Handle mobile click: if only one event, open detailed modal. If multiple or none, maybe zoom in or list below?
                                            // For now, let's just open the first event if exists, or do nothing.
                                            // Ideally we should open a "Day View" modal.
                                            if (dayEvents.length === 1) setSelectedEvent(dayEvents[0]);
                                            if (dayEvents.length > 1) setSelectedEvent(dayEvents[0]); // Just open first for now, user can see others in upcoming list? 
                                            // TODO: Better mobile day view handling.
                                        }}
                                    />
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
                currentUserId={userId}
            />
        </>
    );
}
