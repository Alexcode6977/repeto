'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all rehearsal events for a troupe with their planning status.
 */
export async function getTroupeSessions(troupeId: string) {
    const supabase = await createClient();

    // 1. Fetch Sessions
    const { data, error } = await supabase
        .from('events')
        .select(`
            id,
            title,
            start_time,
            end_time,
            play_id,
            plays(title),
            session_plans(selected_scenes, updated_at, status)
        `)
        .eq('troupe_id', troupeId)
        .order('start_time', { ascending: false });

    if (error) {
        console.error('Error fetching sessions:', error);
        return [];
    }

    // 2. Determine User Role
    let isMember = false;
    let isAdmin = false;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: membership } = await supabase
            .from('troupe_members')
            .select('role')
            .eq('troupe_id', troupeId)
            .eq('user_id', user.id)
            .single();

        if (membership) {
            isMember = true;
            isAdmin = membership.role === 'admin';
        }
    }

    // 3. Filter based on visibility
    // Admin sees EVERYTHING
    if (isAdmin) {
        return data;
    }

    // Members see:
    // a) Sessions with NO plan (Events, e.g. generic rehearsal)
    // b) Sessions with a plan that is 'published'
    return data.filter((event: any) => {
        // Fix: session_plans might be array or object (single)
        const plan = Array.isArray(event.session_plans) ? event.session_plans[0] : event.session_plans;

        if (!plan) return true; // No plan = Visible (Generic event)
        return plan.status === 'published';
    });
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
            script_content,
            play_characters(*),
            play_scenes(
                *,
                scene_characters(character_id)
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
            event_attendance(
                *,
                    profiles(first_name, email),
                    troupe_guests(id, name)
                ),
            session_plans(*)
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
export async function saveSessionPlan(
    eventId: string,
    selectedScenes: any[],
    notes: string = "",
    status: 'draft' | 'published' = 'draft'
) {
    const supabase = await createClient();

    const uniqueScenesMap = new Map();
    selectedScenes.forEach((scene: any) => {
        const id = typeof scene === 'string' ? scene : scene.id;
        if (!uniqueScenesMap.has(id)) {
            uniqueScenesMap.set(id, scene);
        }
    });
    const uniqueScenes = Array.from(uniqueScenesMap.values());

    const updateData: any = {
        event_id: eventId,
        selected_scenes: uniqueScenes,
        general_notes: notes,
        status: status,
        updated_at: new Date().toISOString()
    };

    if (status === 'published') {
        updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('session_plans')
        .upsert(updateData);

    if (error) {
        console.error('Error saving session plan:', error);
        throw new Error('Failed to save session plan');
    }

    revalidatePath(`/ troupes`);
}

export async function publishSession(eventId: string) {
    const supabase = await createClient();

    // Check if plan exists
    const { data: plan } = await supabase
        .from('session_plans')
        .select('*')
        .eq('event_id', eventId)
        .single();

    if (!plan) {
        throw new Error("No plan to publish. Save a draft first.");
    }

    const { error } = await supabase
        .from('session_plans')
        .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId);

    if (error) {
        throw new Error('Failed to publish session');
    }

    revalidatePath(`/ troupes`);
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
    revalidatePath(`/ troupes`);
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
            events(
                title,
                start_time,
                session_plans(selected_scenes)
            ),
            play_characters(name)
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
            events(title, start_time)
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

/**
 * Get personalized preparation details for a session.
 * specific to the current user's characters.
 */
export async function getUserPreparationDetails(sessionId: string) {
    console.log("--> getUserPreparationDetails (RPC) START", sessionId);
    const supabase = await createClient();

    const { data, error } = await supabase
        .rpc('get_user_session_scenes', {
            p_session_id: sessionId
        });

    if (error) {
        console.error("Error fetching preparation details (RPC):", error);
        return [];
    }

    if (!data || data.length === 0) {
        console.log("RPC returned empty data");
        return [];
    }

    // Sort scenes within each group (optional, if order matters)
    // The RPC returns groups, we can just return data directly as it matches the structure.
    console.log("RPC Data received:", data.length, "groups");
    return data;
}
