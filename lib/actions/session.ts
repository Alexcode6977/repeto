'use server';

import { canManageSessions } from '@/lib/utils/roles';

import { createClient } from '@/lib/supabase/server';
import {
    createSessionFeedback,
    deleteLiveRawNoteRecord,
    getLiveSessionDetails,
    listLiveRawNotes,
    publishPendingSessionFeedbacks,
    saveLiveRawNoteRecord,
    saveSessionPlanRecord,
    updateLiveRawNoteRecord,
    updateLiveSessionStatus,
} from '@/lib/server/live-session-service';
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
    let canViewDrafts = false;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: membership } = await supabase
            .from('troupe_members')
            .select('roles')
            .eq('troupe_id', troupeId)
            .eq('user_id', user.id)
            .single();

        if (membership) {
            // Session managers (metteur en scène) can see drafts and processing.
            canViewDrafts = canManageSessions(membership.roles);
        }
    }

    // 3. Filter based on visibility
    // Admin/Director sees EVERYTHING
    if (canViewDrafts) {
        return data;
    }

    // Members see:
    // a) Sessions with NO plan (Generic events) - assumed visible
    // b) Sessions with a plan that is 'upcoming' or 'validated'
    return data.filter((event: any) => {
        const plan = Array.isArray(event.session_plans) ? event.session_plans[0] : event.session_plans;

        if (!plan) return true; // No plan = Visible (Generic event)
        return ['upcoming', 'validated'].includes(plan.status);
    });
}

/**
 * Get detailed data for a specific session (event + attendance + plan).
 */
export async function getSessionDetails(eventId: string) {
    const supabase = await createClient();
    return getLiveSessionDetails(supabase, eventId);
}


/**
 * Save or update a session plan.
 */
/**
 * Save or update a session plan.
 */
export async function saveSessionPlan(
    eventId: string,
    selectedScenes: any[],
    notes: string = "",
    status: 'preparation' | 'upcoming' | 'processing' | 'validated' = 'preparation',
    planStructure?: any,
    title?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await saveSessionPlanRecord(
        supabase,
        user.id,
        eventId,
        selectedScenes,
        notes,
        status,
        planStructure,
        title
    );

    revalidatePath(`/troupes`);
}

/**
 * Update session status (Generic)
 */
export async function updateSessionStatus(eventId: string, status: 'preparation' | 'upcoming' | 'processing' | 'validated') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await updateLiveSessionStatus(supabase, user.id, eventId, status);

    revalidatePath(`/troupes`);
}

/**
 * Create a RAW note during Live Session
 */
export async function saveRawNote(
    eventId: string,
    playId: string,
    sceneIndex: number,
    text: string,
    lineIndex?: number,
    context?: any
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await saveLiveRawNoteRecord(
        supabase,
        user.id,
        eventId,
        playId,
        sceneIndex,
        text,
        lineIndex,
        context
    );
}

/**
 * Get RAW notes for a session
 */
export async function getRawNotes(eventId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return listLiveRawNotes(supabase, eventId, user?.id);
}

export async function updateRawNote(noteId: string, text: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await updateLiveRawNoteRecord(supabase, user.id, noteId, text);
}

export async function deleteRawNote(noteId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await deleteLiveRawNoteRecord(supabase, user.id, noteId);
}


/**
 * Submit feedback for an actor (Existing - kept for compatibility/extensions)
 */
export async function submitSessionFeedback(
    eventId: string,
    characterId: string,
    text: string,
    actorId?: string,
    guestId?: string,
    status: 'pending' | 'published' = 'published'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await createSessionFeedback(
        supabase,
        user.id,
        eventId,
        characterId,
        text,
        actorId,
        guestId,
        status
    );

    revalidatePath(`/troupes`);
}

/**
 * Publish all pending feedbacks for a session
 */
export async function publishSessionFeedbacks(eventId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await publishPendingSessionFeedbacks(supabase, user.id, eventId);

    revalidatePath(`/troupes`);
}

/**
 * Get all feedback received by the current logged-in user.
 */
export async function getMyFeedbacks(eventId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
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
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (eventId) {
        query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

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

    // ... (Use existing logic or optimize)
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

    const latest: Record<string, any> = {};
    data.forEach(f => {
        if (!latest[f.character_id]) {
            latest[f.character_id] = f;
        }
    });

    return latest;
}



/**
 * DEBUG HELPER: Diagnose why the RPC returned empty
 */
async function diagnoseEmptyPrep(supabase: any, sessionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [{ playTitle: "DEBUG: Not Logged In", characterName: "N/A", scenes: [] }];

    // 1. Get Troupe ID from Event
    const { data: event } = await supabase.from('events').select('troupe_id').eq('id', sessionId).single();
    if (!event) return [{ playTitle: "DEBUG: Event Not Found", characterName: "N/A", scenes: [] }];

    // 2. Check Play Characters for this User
    // We need to find plays in this troupe where the user is an actor
    const { data: characters } = await supabase
        .from('play_characters')
        .select(`
            id, 
            name, 
            play_id, 
            plays!inner(troupe_id, title)
        `)
        .eq('actor_id', user.id)
        .eq('plays.troupe_id', event.troupe_id);

    if (!characters || characters.length === 0) {
        return [{
            playTitle: "DEBUG: Casting Issue",
            characterName: "No Character Found",
            scenes: [{ title: `User ${user.email} is not assigned to any character in this troupe's plays. Check Casting.` }]
        }];
    }

    // 3. Check Session Plan
    const { data: plan } = await supabase.from('session_plans').select('selected_scenes').eq('event_id', sessionId).single();

    if (!plan || !plan.selected_scenes || plan.selected_scenes.length === 0) {
        return [{
            playTitle: "DEBUG: Plan Issue",
            characterName: "No Scenes Selected",
            scenes: [{ title: "The session plan is empty. No scenes selected." }]
        }];
    }

    const selectedIds = plan.selected_scenes.map((s: any) => typeof s === 'string' ? s : s.id);

    // 4. Check if Characters are in Scenes
    const debugItems = [];
    for (const char of characters) {
        // Find scenes this character is in
        const { data: charScenes } = await supabase
            .from('scene_characters')
            .select('scene_id')
            .eq('character_id', char.id);

        const charSceneIds = charScenes?.map((cs: any) => cs.scene_id) || [];

        // Intersect
        const matching = charSceneIds.filter((id: any) => selectedIds.includes(id));

        if (matching.length === 0) {
            debugItems.push({
                playTitle: `DEBUG: ${char.plays.title}`,
                characterName: char.name,
                scenes: [{
                    title: "Character Not In Selected Scenes",
                    summary: `Character ID ${char.id} is in scenes [${charSceneIds.length} total], but none match the plan's selection [${selectedIds.length} total].`
                }]
            });
        }
    }

    if (debugItems.length > 0) return debugItems;

    return [{
        playTitle: "DEBUG: Unknown",
        characterName: "System",
        scenes: [{ title: "Everything looks correct but RPC returned empty. Check RPC logs." }]
    }];
}

export async function getUserPreparationDetails(sessionId: string) {
    console.log("--> getUserPreparationDetails (RPC) START", sessionId);
    const supabase = await createClient();

    const { data, error } = await supabase
        .rpc('get_user_session_scenes', {
            p_session_id: sessionId
        });

    if (error) {
        console.error("Error fetching preparation details (RPC):", error);
        return [{
            playTitle: "RPC ERROR",
            characterName: "System",
            scenes: [{ title: error.message, summary: error.details }]
        }];
    }

    if (!data || data.length === 0) {
        console.log("RPC returned empty data, running DIAGNOSTIC...");
        return await diagnoseEmptyPrep(supabase, sessionId);
    }

    console.log("RPC Data received:", data.length, "groups");
    return data;
}
