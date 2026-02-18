'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { addWeeks } from "date-fns";
import { canManageCalendar } from '@/lib/utils/roles';

async function getMembershipRolesForTroupe(troupeId: string, userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: membership } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', troupeId)
        .eq('user_id', userId)
        .maybeSingle();

    return membership?.roles || [];
}

async function requireCalendarManager(troupeId: string, userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
    const roles = await getMembershipRolesForTroupe(troupeId, userId, supabase);
    if (!canManageCalendar(roles)) {
        throw new Error('Forbidden');
    }
}

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

    await requireCalendarManager(troupeId, user.id, supabase);

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
    status: 'present' | 'absent',
    targetUserId?: string,
    targetGuestId?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: event } = await supabase
        .from('events')
        .select('troupe_id')
        .eq('id', eventId)
        .maybeSingle();

    if (!event?.troupe_id) {
        throw new Error('Event introuvable');
    }

    const roles = await getMembershipRolesForTroupe(event.troupe_id, user.id, supabase);
    const isCalendarManager = canManageCalendar(roles);

    if (status !== 'present' && status !== 'absent') {
        throw new Error('Invalid status. Must be present or absent.');
    }

    if (targetGuestId && !isCalendarManager) {
        throw new Error('Forbidden');
    }

    if (targetUserId && targetUserId !== user.id && !isCalendarManager) {
        throw new Error('Forbidden');
    }

    const updateData: Record<string, string> = {
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
