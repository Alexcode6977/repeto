'use client';

import { updateAttendance } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AttendanceToggleProps {
    eventId: string;
    currentStatus: string;
    compact?: boolean;
}

export function AttendanceToggle({ eventId, currentStatus, compact = false }: AttendanceToggleProps) {
    const [status, setStatus] = useState(currentStatus);
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdate = async (newStatus: 'present' | 'absent') => {
        setIsLoading(true);
        try {
            // Optimistic update
            setStatus(newStatus);
            await updateAttendance(eventId, newStatus);
        } catch (error) {
            console.error(error);
            setStatus(currentStatus); // Revert
        } finally {
            setIsLoading(false);
        }
    };

    if (compact) {
        // Dot indicator / small button
        return (
            <button
                onClick={(e) => {
                    e.preventDefault(); // Prevent card navigation if inside Link
                    handleUpdate(status === 'present' ? 'absent' : 'present');
                }}
                disabled={isLoading}
                className={cn(
                    "h-4 w-4 rounded-full flex items-center justify-center transition-colors",
                    status === 'present' ? "text-green-500 hover:text-green-600" :
                        status === 'absent' ? "text-red-500 hover:text-red-600" :
                            "text-muted-foreground hover:text-foreground"
                )}
            >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> :
                    status === 'present' ? <CheckCircle className="h-4 w-4 fill-current" /> :
                        status === 'absent' ? <XCircle className="h-4 w-4 fill-current" /> :
                            <HelpCircle className="h-4 w-4" />
                }
            </button>
        );
    }

    return (
        <div className="flex bg-muted rounded-md p-1 gap-1">
            <Button
                variant={status === 'present' ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-7 px-3", status === 'present' && "bg-green-600 hover:bg-green-700")}
                onClick={() => handleUpdate('present')}
                disabled={isLoading}
            >
                Présent
            </Button>
            <Button
                variant={status === 'absent' ? 'destructive' : 'ghost'}
                size="sm"
                className="h-7 px-3"
                onClick={() => handleUpdate('absent')}
                disabled={isLoading}
            >
                Absent
            </Button>
        </div>
    );
}
