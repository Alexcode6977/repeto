"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { TroupeCalendarEvent } from "@/lib/features/troupe-calendar/types";

interface CalendarViewMobileProps {
    currentMonth: number;
    currentYear: number;
    eventsByDate: Record<number, TroupeCalendarEvent[]>;
    onDayCreate?: (date: Date) => void;
    onDayOpen?: (date: Date) => void;
}

const EVENT_DOT_COLORS: Record<string, string> = {
    rehearsal: "bg-purple-500",
    performance: "bg-blue-500",
    meeting: "bg-green-500",
    other: "bg-yellow-500",
};

export function CalendarViewMobile({
    currentMonth,
    currentYear,
    eventsByDate,
    onDayCreate,
    onDayOpen,
}: CalendarViewMobileProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [touchStart, setTouchStart] = useState<number | null>(null);

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

    const handleTouchStart = (event: React.TouchEvent) => {
        setTouchStart(event.touches[0].clientX);
    };

    const handleTouchEnd = (event: React.TouchEvent) => {
        if (touchStart === null) {
            return;
        }

        const touchEnd = event.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;

        if (Math.abs(diff) > 80) {
            if (diff > 0) {
                router.push(`${pathname}?month=${nextMonth}&year=${nextYear}`);
            } else {
                router.push(`${pathname}?month=${prevMonth}&year=${prevYear}`);
            }
        }

        setTouchStart(null);
    };

    return (
        <Card
            className="border-0 bg-transparent shadow-none overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <CardHeader className="px-0 flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xl font-bold capitalize flex items-center gap-2">
                    <span>🗓️</span>
                    {monthNames[currentMonth]} {currentYear}
                </CardTitle>

                <div className="flex items-center gap-2">
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

            <CardContent className="px-0">
                {!isCurrentMonth ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                        className="rounded-full text-xs font-bold mb-4 w-full"
                    >
                        <Calendar className="w-3 h-3 mr-1" />
                        Revenir à aujourd&apos;hui
                    </Button>
                ) : null}

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                    <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="min-h-[50px] bg-transparent" />;
                        }

                        const dayEvents = eventsByDate[day] || [];
                        const isToday = now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear;
                        const hasEvents = dayEvents.length > 0;

                        return (
                            <div
                                key={day}
                                className={[
                                    "min-h-[50px] border rounded-xl p-1 overflow-hidden relative transition-all active:scale-[0.98]",
                                    isToday ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-card/50",
                                    hasEvents ? "border-primary/30" : "border-transparent",
                                    onDayCreate || onDayOpen ? "cursor-pointer hover:bg-muted/30" : "",
                                ].join(" ")}
                                onClick={() => {
                                    const date = new Date(currentYear, currentMonth, day);

                                    if (hasEvents) {
                                        onDayOpen?.(date);
                                        return;
                                    }

                                    if (onDayCreate) {
                                        onDayCreate(date);
                                    }
                                }}
                            >
                                {isToday ? (
                                    <div className="absolute top-1 right-1 w-2 h-2">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                    </div>
                                ) : null}

                                <div className="font-bold mb-1 flex flex-col items-center text-xs">
                                    <span className={isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-black" : "text-muted-foreground"}>
                                        {day}
                                    </span>

                                    {hasEvents ? (
                                        <div className="flex gap-0.5 mt-1">
                                            {dayEvents.slice(0, 3).map((event, eventIndex) => (
                                                <span
                                                    key={`${event.id}-${eventIndex}`}
                                                    className={`w-1.5 h-1.5 rounded-full ${EVENT_DOT_COLORS[event.event_type] || EVENT_DOT_COLORS.other}`}
                                                />
                                            ))}
                                            {dayEvents.length > 3 ? (
                                                <span className="text-[8px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</span>
                                            ) : null}
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
