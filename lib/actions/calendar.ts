'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { addWeeks } from "date-fns";

export async function getTroupeEvents(troupeId: string, startDate: Date, endDate: Date) {
    const supabase = await createClient();

    // Fetch events in range
    const { data: events } = await supabase
        .from('events')
        .select(`
            *,
            plays (title),
            event_attendance (
                status,
                user_id,
                guest_id
            )
        `)
        .eq('troupe_id', troupeId)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
        .order('start_time', { ascending: true });

    return events || [];
}

export async function createEvent(
    troupeId: string,
    title: string,
    start: Date,
    end: Date,
    type: string,
    playId?: string,
    recurrence: "none" | "weekly" = "none"
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Basic admin check (should be robust)

    const eventsToInsert = [];

    if (recurrence === "weekly") {
        // Create 12 weeks of events
        for (let i = 0; i < 12; i++) {
            eventsToInsert.push({
                troupe_id: troupeId,
                title,
                start_time: addWeeks(start, i).toISOString(),
                end_time: addWeeks(end, i).toISOString(),
                type,
                play_id: playId || null
            });
        }
    } else {
        eventsToInsert.push({
            troupe_id: troupeId,
            title,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            type,
            play_id: playId || null
        });
    }

    const { error } = await supabase
        .from('events')
        .insert(eventsToInsert);

    if (error) {
        console.error('Error creating event:', error);
        throw new Error('Failed to create event');
    }

    revalidatePath(`/troupes/${troupeId}/calendar`);
}

export async function updateAttendance(
    eventId: string,
    status: 'present' | 'absent' | 'unknown',
    targetUserId?: string,
    targetGuestId?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const updateData: any = {
        event_id: eventId,
        status: status
    };

    let onConflict = '';

    if (targetGuestId) {
        updateData.guest_id = targetGuestId;
        onConflict = 'event_id, guest_id';
    } else {
        updateData.user_id = targetUserId || user.id;
        onConflict = 'event_id, user_id';
    }


    const { error } = await supabase
        .from('event_attendance')
        .upsert(updateData, { onConflict });

    if (error) {
        console.error('Error updating attendance:', error);
        throw new Error('Failed to update attendance');
    }

    revalidatePath('/troupes');
}
