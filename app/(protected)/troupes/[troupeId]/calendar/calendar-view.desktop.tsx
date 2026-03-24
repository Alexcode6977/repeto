"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Users } from "lucide-react";
import type { TroupeCalendarEvent } from "@/lib/features/troupe-calendar/types";

interface CalendarViewDesktopProps {
    currentMonth: number;
    currentYear: number;
    eventsByDate: Record<number, TroupeCalendarEvent[]>;
    onDayCreate?: (date: Date) => void;
    onEventOpen?: (event: TroupeCalendarEvent) => void;
}

const EVENT_COLORS: Record<string, string> = {
    rehearsal: "#a855f7",
    performance: "#3b82f6",
    meeting: "#22c55e",
    other: "#eab308",
};

export function CalendarViewDesktop({
    currentMonth,
    currentYear,
    eventsByDate,
    onDayCreate,
    onEventOpen,
}: CalendarViewDesktopProps) {
    const router = useRouter();
    const pathname = usePathname();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const calendarDays: (number | null)[] = [];
    for (let index = 0; index < offset; index += 1) calendarDays.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) calendarDays.push(day);

    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    const now = new Date();
    const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;

    const goToToday = () => {
        const today = new Date();
        router.push(`${pathname}?month=${today.getMonth()}&year=${today.getFullYear()}`);
    };

    return (
        <Card className="border bg-card shadow-sm overflow-hidden">
            <CardHeader className="px-6 flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xl font-bold capitalize">
                    {monthNames[currentMonth]} {currentYear}
                </CardTitle>

                <div className="flex items-center gap-2">
                    {!isCurrentMonth ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToToday}
                            className="rounded-full text-xs font-bold"
                        >
                            <Calendar className="w-3 h-3 mr-1" />
                            Aujourd&apos;hui
                        </Button>
                    ) : null}

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

            <CardContent className="px-6">
                <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground mb-2">
                    <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="h-32 bg-transparent" />;
                        }

                        const dayEvents = eventsByDate[day] || [];
                        const isToday = now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear;
                        const hasEvents = dayEvents.length > 0;

                        return (
                            <div
                                key={day}
                                className={[
                                    "h-32 border rounded-md p-2 overflow-hidden relative bg-card transition-all",
                                    isToday ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border",
                                    onDayCreate ? "cursor-pointer hover:bg-muted/30" : "",
                                ].join(" ")}
                                onClick={() => {
                                    if (onDayCreate) {
                                        onDayCreate(new Date(currentYear, currentMonth, day));
                                    }
                                }}
                            >
                                {isToday ? (
                                    <div className="absolute top-1 right-1 w-2 h-2">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                    </div>
                                ) : null}

                                <div className="font-bold mb-2 flex justify-between items-center text-xs">
                                    <span className={isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-black" : "text-muted-foreground"}>
                                        {day}
                                    </span>
                                    {hasEvents ? (
                                        <span className="text-[10px] text-muted-foreground">
                                            {dayEvents.length} évent.
                                        </span>
                                    ) : null}
                                </div>

                                <div className="space-y-1">
                                    {dayEvents.slice(0, 2).map((event) => {
                                        const confirmedCount = event.event_attendance?.filter((attendance) => attendance.status === "present").length || 0;
                                        const totalInvited = event.event_attendance?.length || 0;
                                        const borderLeftColor = EVENT_COLORS[event.event_type] || EVENT_COLORS.other;

                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(eventClick) => {
                                                    eventClick.stopPropagation();
                                                    onEventOpen?.(event);
                                                }}
                                                className="text-xs p-1.5 rounded bg-muted hover:bg-muted/80 cursor-pointer transition-all hover:scale-[1.02] border-l-2"
                                                style={{ borderLeftColor }}
                                            >
                                                <div className="font-semibold truncate">{event.title}</div>
                                                {totalInvited > 0 ? (
                                                    <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                                        <Users className="w-3 h-3" />
                                                        <span>{confirmedCount}/{totalInvited}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}

                                    {dayEvents.length > 2 ? (
                                        <div
                                            className="text-[10px] text-muted-foreground text-center cursor-pointer hover:text-foreground"
                                            onClick={(eventClick) => {
                                                eventClick.stopPropagation();
                                                onEventOpen?.(dayEvents[0]);
                                            }}
                                        >
                                            +{dayEvents.length - 2} autres
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
