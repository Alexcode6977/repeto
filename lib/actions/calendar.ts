'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
    createTroupeEvent,
    listTroupeEvents,
    updateTroupeAttendance,
} from '@/lib/server/calendar-service';

export async function getTroupeEvents(troupeId: string, startDate: Date, endDate: Date) {
    const supabase = await createClient();
    return listTroupeEvents(supabase, troupeId, startDate, endDate);
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

    await createTroupeEvent(supabase, {
        troupeId,
        userId: user.id,
        title,
        start,
        end,
        type,
        playId,
        recurrence,
    });

    revalidatePath(`/troupes/${troupeId}/calendar`);
    revalidatePath(`/troupes/${troupeId}`);
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

    const result = await updateTroupeAttendance(supabase, {
        eventId,
        userId: user.id,
        status,
        targetUserId,
        targetGuestId,
    });

    revalidatePath('/troupes');
    revalidatePath(`/troupes/${result.troupeId}/calendar`);
}
