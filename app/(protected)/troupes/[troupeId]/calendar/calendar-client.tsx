"use client";

import { CalendarScreen } from "./calendar-screen";
import type { TroupeCalendarViewModel } from "@/lib/features/troupe-calendar/types";

interface CalendarWrapperProps {
    initialViewModel: TroupeCalendarViewModel;
}

export function CalendarClient({ initialViewModel }: CalendarWrapperProps) {
    return <CalendarScreen initialViewModel={initialViewModel} />;
}
