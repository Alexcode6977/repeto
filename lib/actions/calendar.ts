'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
                user_id
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
    playId?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Basic admin check (should be robust)

    const { error } = await supabase
        .from('events')
        .insert({
            troupe_id: troupeId,
            title,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            type,
            play_id: playId || null
        });

    if (error) {
        console.error('Error creating event:', error);
        throw new Error('Failed to create event');
    }

    revalidatePath(`/troupes/${troupeId}/calendar`);
}

export async function updateAttendance(eventId: string, status: 'present' | 'absent' | 'unknown') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('event_attendance')
        .upsert({
            event_id: eventId,
            user_id: user.id,
            status: status
        });

    if (error) {
        console.error('Error updating attendance:', error);
        throw new Error('Failed to update attendance');
    }

    revalidatePath('/troupes');
}
