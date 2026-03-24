import { addWeeks } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { canManageCalendar } from "@/lib/utils/roles";

type CalendarServiceClient = Awaited<ReturnType<typeof createClient>>;

interface CreateTroupeEventParams {
    troupeId: string;
    userId: string;
    title: string;
    start: Date;
    end: Date;
    type: string;
    playId?: string;
    recurrence?: "none" | "weekly";
}

interface UpdateTroupeAttendanceParams {
    eventId: string;
    userId: string;
    status: "present" | "absent";
    targetUserId?: string;
    targetGuestId?: string;
}

async function getMembershipRolesForTroupe(
    supabase: CalendarServiceClient,
    troupeId: string,
    userId: string
) {
    const { data: membership } = await supabase
        .from("troupe_members")
        .select("roles")
        .eq("troupe_id", troupeId)
        .eq("user_id", userId)
        .maybeSingle();

    return membership?.roles || [];
}

async function requireCalendarManager(
    supabase: CalendarServiceClient,
    troupeId: string,
    userId: string
) {
    const roles = await getMembershipRolesForTroupe(supabase, troupeId, userId);
    if (!canManageCalendar(roles)) {
        throw new Error("Forbidden");
    }
}

export async function listTroupeEvents(
    supabase: CalendarServiceClient,
    troupeId: string,
    startDate: Date,
    endDate: Date
) {
    const { data: events } = await supabase
        .from("events")
        .select(`
            *,
            plays (title),
            event_attendance (
                status,
                user_id,
                guest_id
            )
        `)
        .eq("troupe_id", troupeId)
        .gte("start_time", startDate.toISOString())
        .lte("end_time", endDate.toISOString())
        .order("start_time", { ascending: true });

    return events || [];
}

export async function createTroupeEvent(
    supabase: CalendarServiceClient,
    params: CreateTroupeEventParams
) {
    await requireCalendarManager(supabase, params.troupeId, params.userId);

    const eventsToInsert = [];
    const recurrence = params.recurrence || "none";

    if (recurrence === "weekly") {
        for (let i = 0; i < 12; i += 1) {
            eventsToInsert.push({
                troupe_id: params.troupeId,
                title: params.title,
                start_time: addWeeks(params.start, i).toISOString(),
                end_time: addWeeks(params.end, i).toISOString(),
                type: params.type,
                play_id: params.playId || null,
            });
        }
    } else {
        eventsToInsert.push({
            troupe_id: params.troupeId,
            title: params.title,
            start_time: params.start.toISOString(),
            end_time: params.end.toISOString(),
            type: params.type,
            play_id: params.playId || null,
        });
    }

    const { error } = await supabase
        .from("events")
        .insert(eventsToInsert);

    if (error) {
        console.error("Error creating event:", error);
        throw new Error("Failed to create event");
    }
}

export async function updateTroupeAttendance(
    supabase: CalendarServiceClient,
    params: UpdateTroupeAttendanceParams
) {
    const { data: event } = await supabase
        .from("events")
        .select("troupe_id")
        .eq("id", params.eventId)
        .maybeSingle();

    if (!event?.troupe_id) {
        throw new Error("Event introuvable");
    }

    const roles = await getMembershipRolesForTroupe(supabase, event.troupe_id, params.userId);
    const isCalendarManager = canManageCalendar(roles);

    if (params.status !== "present" && params.status !== "absent") {
        throw new Error("Invalid status. Must be present or absent.");
    }

    if (params.targetGuestId && !isCalendarManager) {
        throw new Error("Forbidden");
    }

    if (params.targetUserId && params.targetUserId !== params.userId && !isCalendarManager) {
        throw new Error("Forbidden");
    }

    const updateData: Record<string, string> = {
        event_id: params.eventId,
        status: params.status,
    };

    let onConflict = "";

    if (params.targetGuestId) {
        updateData.guest_id = params.targetGuestId;
        onConflict = "event_id, guest_id";
    } else {
        updateData.user_id = params.targetUserId || params.userId;
        onConflict = "event_id, user_id";
    }

    const { error } = await supabase
        .from("event_attendance")
        .upsert(updateData, { onConflict });

    if (error) {
        console.error("Error updating attendance:", error);
        throw new Error("Failed to update attendance");
    }

    return {
        troupeId: event.troupe_id,
    };
}
