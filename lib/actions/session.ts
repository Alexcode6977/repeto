'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all rehearsal events for a troupe with their planning status.
 */
export async function getTroupeSessions(troupeId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('events')
        .select(`
            id,
            title,
            start_time,
            end_time,
            play_id,
            plays(title),
            session_plans(selected_scenes, updated_at)
        `)
        .eq('troupe_id', troupeId)
        .order('start_time', { ascending: false });

    if (error) {
        console.error('Error fetching sessions:', error);
        return [];
    }

    return data;
}

/**
 * Get detailed data for a specific session (event + attendance + plan).
 */
export async function getSessionDetails(eventId: string) {
    const supabase = await createClient();

    // 1. Fetch Event to get troupe_id
    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (eventError || !event) {
        console.error('Error fetching event:', eventError);
        return null;
    }

    // 2. Fetch all plays for this troupe
    const { data: allPlays, error: playsError } = await supabase
        .from('plays')
        .select(`
            id,
            title,
            play_characters (*),
            play_scenes (
                *,
                scene_characters (character_id)
            )
        `)
        .eq('troupe_id', event.troupe_id);

    if (playsError) {
        console.error('Error fetching troupe plays:', playsError);
        return null;
    }

    // 3. Fetch attendance and plan
    const { data: complementaryData, error: compError } = await supabase
        .from('events')
        .select(`
            event_attendance (
                *,
                profiles (first_name, email),
                troupe_guests (id, name)
            ),
            session_plans (*)
        `)
        .eq('id', eventId)
        .single();

    if (compError) {
        console.error('Error fetching complementary details:', compError);
        return null;
    }


    // 4. Fetch line counts for each play
    const playsWithStats = await Promise.all(allPlays.map(async (p) => {
        const { data: lineCounts } = await supabase.rpc('get_line_counts', {
            p_play_id: p.id
        });
        return {
            ...p,
            lineStats: lineCounts || []
        };
    }));

    return {
        ...event,
        ...complementaryData,
        plays: playsWithStats
    };
}


/**
 * Save or update a session plan.
 * selectedScenes: Array of { scene_id: string, objective: string }
 */
export async function saveSessionPlan(eventId: string, selectedScenes: any[], notes: string = "") {
    const supabase = await createClient();

    const { error } = await supabase
        .from('session_plans')
        .upsert({
            event_id: eventId,
            selected_scenes: selectedScenes,
            general_notes: notes,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error saving session plan:', error);
        throw new Error('Failed to save session plan');
    }

    revalidatePath(`/troupes`);
}

/**
 * Submit feedback for an actor during a session.
 */
export async function submitSessionFeedback(
    eventId: string,
    characterId: string,
    text: string,
    actorId?: string,
    guestId?: string
) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('rehearsal_feedbacks')
        .insert({
            event_id: eventId,
            character_id: characterId,
            actor_id: actorId,
            guest_id: guestId,
            text
        });

    if (error) {
        console.error('Error submiting feedback:', error);
        throw new Error('Failed to submit feedback');
    }

    // No revalidate needed for live feedback usually, but let's be safe
    revalidatePath(`/troupes`);
}

/**
 * Get all feedback received by the current logged-in user.
 */
export async function getMyFeedbacks(troupeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('rehearsal_feedbacks')
        .select(`
            *,
            events (
                title, 
                start_time,
                session_plans (selected_scenes)
            ),
            play_characters (name)
        `)
        .eq('actor_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching feedbacks:', error);
        return [];
    }

    return data;
}

/**
 * Get the most recent feedback for a list of characters.
 */
export async function getLastFeedbacksForCharacters(characterIds: string[]) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('rehearsal_feedbacks')
        .select(`
            *,
            events (title, start_time)
        `)
        .in('character_id', characterIds)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching last feedbacks:', error);
        return {};
    }

    // Group by character_id and pick the first one (most recent)
    const latest: Record<string, any> = {};
    data.forEach(f => {
        if (!latest[f.character_id]) {
            latest[f.character_id] = f;
        }
    });

    return latest;
}
