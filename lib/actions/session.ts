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

    const { data: event, error } = await supabase
        .from('events')
        .select(`
            *,
            plays (
                id,
                title,
                play_characters (*),
                play_scenes (
                    *,
                    scene_characters (character_id)
                )
            ),
            event_attendance (
                *,
                profiles (first_name, email),
                troupe_guests (id, name)
            ),
            session_plans (*)
        `)
        .eq('id', eventId)
        .single();

    if (error) {
        console.error('Error fetching session details:', error);
        return null;
    }

    // Fetch line counts for the play if it exists
    let lineStats = [];
    if (event.plays?.id) {
        const { data: lineCounts } = await supabase.rpc('get_line_counts', {
            p_play_id: event.plays.id
        });
        lineStats = lineCounts || [];
    }

    return {
        ...event,
        lineStats
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
