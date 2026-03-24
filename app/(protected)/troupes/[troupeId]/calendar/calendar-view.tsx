"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { TroupeCalendarEvent } from "@/lib/features/troupe-calendar/types";
import { CalendarViewDesktop } from "./calendar-view.desktop";
import { CalendarViewMobile } from "./calendar-view.mobile";

interface CalendarViewProps {
    currentMonth: number;
    currentYear: number;
    eventsByDate: Record<number, TroupeCalendarEvent[]>;
    onDayCreate?: (date: Date) => void;
    onDayOpen?: (date: Date) => void;
    onEventOpen?: (event: TroupeCalendarEvent) => void;
    forceVariant?: "mobile" | "desktop";
}

export function CalendarView({
    forceVariant,
    ...props
}: CalendarViewProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const variant = forceVariant || (isDesktop ? "desktop" : "mobile");

    if (variant === "desktop") {
        return <CalendarViewDesktop {...props} />;
    }

    return <CalendarViewMobile {...props} />;
}
