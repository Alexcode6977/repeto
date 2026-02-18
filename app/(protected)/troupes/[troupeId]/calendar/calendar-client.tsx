"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddEventModal } from "./add-event-modal";
import { CalendarView } from "./calendar-view";

interface CalendarWrapperProps {
    currentMonth: number;
    currentYear: number;
    eventsByDate: Record<number, any[]>;
    userId: string;
    members: any[];
    isAdmin: boolean;
    canViewSessionPages: boolean;
    troupeId: string;
}

export function CalendarClient({
    currentMonth,
    currentYear,
    eventsByDate,
    userId,
    members,
    isAdmin,
    canViewSessionPages,
    troupeId
}: CalendarWrapperProps) {
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const handleOpenAddEvent = (date?: Date) => {
        setSelectedDate(date || new Date());
        setIsAddEventOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendrier</h1>
                    <p className="hidden md:block text-muted-foreground">
                        Répétitions et événements de la troupe.
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => handleOpenAddEvent(new Date())}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un événement
                    </Button>
                )}
            </div>

            {/* Calendar Grid View */}
            <CalendarView
                currentMonth={currentMonth}
                currentYear={currentYear}
                eventsByDate={eventsByDate}
                userId={userId}
                members={members}
                isAdmin={isAdmin}
                canViewSessionPages={canViewSessionPages}
                onDayClick={isAdmin ? handleOpenAddEvent : undefined}
            />

            <AddEventModal
                troupeId={troupeId}
                isOpen={isAddEventOpen}
                onOpenChange={setIsAddEventOpen}
                defaultDate={selectedDate}
            />
        </div>
    );
}
