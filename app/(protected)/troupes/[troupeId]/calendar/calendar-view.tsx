"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { EventDetailsModal } from "./event-details-modal";
import { DayViewModal } from "./day-view-modal";
import { ChevronLeft, ChevronRight, Calendar, Users } from "lucide-react";

interface EventAttendance {
    user_id: string;
    status: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    event_type: string;
    start_time: string;
    end_time?: string | null;
    event_attendance?: EventAttendance[];
}

interface CalendarViewProps {
    currentMonth: number;
    currentYear: number;
    eventsByDate: Record<number, CalendarEvent[]>;
    userId: string;
    members: unknown[];
    isAdmin: boolean;
    onDayClick?: (date: Date) => void;
}

// Event type colors
const EVENT_COLORS: Record<string, string> = {
    rehearsal: "bg-purple-500",
    performance: "bg-blue-500",
    meeting: "bg-green-500",
    other: "bg-yellow-500"
};

export function CalendarView({ currentMonth, currentYear, eventsByDate, userId, members, isAdmin, onDayClick }: CalendarViewProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedDay, setSelectedDay] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Grid Logic
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < offset; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    // Navigation
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    const now = new Date();
    const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;

    // Swipe handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;

        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;

        if (Math.abs(diff) > 80) { // Threshold for swipe
            if (diff > 0) {
                // Swipe left -> next month
                router.push(`${pathname}?month=${nextMonth}&year=${nextYear}`);
            } else {
                // Swipe right -> prev month
                router.push(`${pathname}?month=${prevMonth}&year=${prevYear}`);
            }
        }
        setTouchStart(null);
    };

    // Handle day click on mobile
    const handleMobileDayClick = (day: number, events: CalendarEvent[]) => {
        const date = new Date(currentYear, currentMonth, day);
        if (events.length > 0) {
            setSelectedDay({ date, events });
            return;
        }

        // Admin flow: empty day click opens the same create-event modal as the header button.
        if (onDayClick) {
            onDayClick(date);
        }
    };

    // Go to today
    const goToToday = () => {
        const today = new Date();
        router.push(`${pathname}?month=${today.getMonth()}&year=${today.getFullYear()}`);
    };

    return (
        <>
            <Card
                ref={containerRef}
                className="border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-sm overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <CardHeader className="px-0 md:px-6 flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xl font-bold capitalize flex items-center gap-2">
                        <span className="md:hidden">🗓️</span>
                        {monthNames[currentMonth]} {currentYear}
                    </CardTitle>

                    <div className="flex items-center gap-2">
                        {/* Today Button */}
                        {!isCurrentMonth && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToToday}
                                className="rounded-full text-xs font-bold hidden md:flex"
                            >
                                <Calendar className="w-3 h-3 mr-1" />
                                Aujourd&apos;hui
                            </Button>
                        )}

                        {/* Navigation */}
                        <div className="flex bg-muted rounded-full overflow-hidden">
                            <Link
                                href={`?month=${prevMonth}&year=${prevYear}`}
                                className="p-2 hover:bg-background transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Link>
                            <Link
                                href={`?month=${nextMonth}&year=${nextYear}`}
                                className="p-2 hover:bg-background transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="px-0 md:px-6">
                    {/* Mobile Today Button */}
                    {!isCurrentMonth && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToToday}
                            className="rounded-full text-xs font-bold mb-4 md:hidden w-full"
                        >
                            <Calendar className="w-3 h-3 mr-1" />
                            Revenir à aujourd&apos;hui
                        </Button>
                    )}

                    {/* Day names */}
                    <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs md:text-sm font-medium text-muted-foreground mb-2">
                        <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div>
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {calendarDays.map((day, idx) => {
                            if (day === null) return <div key={`empty-${idx}`} className="min-h-[50px] md:h-32 bg-transparent" />;

                            const dayEvents = eventsByDate[day] || [];
                            const isToday = now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear;
                            const hasEvents = dayEvents.length > 0;

                            return (
                                <div
                                    key={day}
                                    className={`
                                        min-h-[50px] md:h-32 border rounded-xl md:rounded-md p-1 md:p-2 overflow-hidden relative
                                        ${isToday
                                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                            : 'bg-card/50 md:bg-card'
                                        } 
                                        ${hasEvents
                                            ? 'border-primary/30'
                                            : 'border-transparent md:border-border'
                                        }
                                        ${onDayClick || hasEvents ? 'cursor-pointer hover:bg-muted/30' : 'md:cursor-default cursor-default'} 
                                        active:scale-[0.98] md:active:scale-100 transition-all
                                    `}
                                    onClick={() => {
                                        if (window.innerWidth < 768) {
                                            handleMobileDayClick(day, dayEvents);
                                        } else if (onDayClick) {
                                            onDayClick(new Date(currentYear, currentMonth, day));
                                        }
                                    }}
                                >
                                    {/* Today pulse indicator */}
                                    {isToday && (
                                        <div className="absolute top-1 right-1 w-2 h-2">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                        </div>
                                    )}

                                    {/* Day number */}
                                    <div className="font-bold mb-1 md:mb-2 flex flex-col md:flex-row justify-between items-center text-xs">
                                        <span className={`
                                            ${isToday
                                                ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-black"
                                                : "text-muted-foreground"
                                            }
                                        `}>
                                            {day}
                                        </span>

                                        {/* Desktop: Event count */}
                                        {dayEvents.length > 0 && (
                                            <span className="hidden md:inline text-[10px] text-muted-foreground">
                                                {dayEvents.length} évent.
                                            </span>
                                        )}

                                        {/* Mobile: Event dots with colors */}
                                        {dayEvents.length > 0 && (
                                            <div className="md:hidden flex gap-0.5 mt-1">
                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                    <span
                                                        key={i}
                                                        className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[e.event_type] || EVENT_COLORS.other}`}
                                                    />
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <span className="text-[8px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Desktop Events List */}
                                    <div className="space-y-1 hidden md:block">
                                        {dayEvents.slice(0, 2).map(e => {
                                            const confirmedCount = e.event_attendance?.filter((a) => a.status === 'present').length || 0;
                                            const totalInvited = e.event_attendance?.length || 0;

                                            return (
                                                <div
                                                    key={e.id}
                                                    onClick={(ev) => {
                                                        ev.stopPropagation(); // Stop propagation to day click
                                                        setSelectedEvent(e);
                                                    }}
                                                    className={`
                                                        text-xs p-1.5 rounded bg-muted hover:bg-muted/80 
                                                        border-l-2 ${EVENT_COLORS[e.event_type] ? `border-l-${e.event_type === 'rehearsal' ? 'purple' : e.event_type === 'performance' ? 'blue' : e.event_type === 'meeting' ? 'green' : 'yellow'}-500` : 'border-l-primary'} 
                                                        cursor-pointer transition-all hover:scale-[1.02]
                                                    `}
                                                    style={{
                                                        borderLeftColor: e.event_type === 'rehearsal' ? '#a855f7' :
                                                            e.event_type === 'performance' ? '#3b82f6' :
                                                                e.event_type === 'meeting' ? '#22c55e' : '#eab308'
                                                    }}
                                                >
                                                    <div className="font-semibold truncate">{e.title}</div>
                                                    {totalInvited > 0 && (
                                                        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                                            <Users className="w-3 h-3" />
                                                            <span>{confirmedCount}/{totalInvited}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {dayEvents.length > 2 && (
                                            <div
                                                className="text-[10px] text-muted-foreground text-center cursor-pointer hover:text-foreground"
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    setSelectedEvent(dayEvents[0])
                                                }}
                                            >
                                                +{dayEvents.length - 2} autres
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Event Details Modal */}
            <EventDetailsModal
                event={selectedEvent}
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                members={members}
                isAdmin={isAdmin}
                currentUserId={userId}
            />

            {/* Mobile Day View Modal */}
            <DayViewModal
                isOpen={!!selectedDay}
                onClose={() => setSelectedDay(null)}
                date={selectedDay?.date || null}
                events={selectedDay?.events || []}
                userId={userId}
                onEventClick={(event) => {
                    setSelectedDay(null);
                    setSelectedEvent(event);
                }}
            />
        </>
    );
}
