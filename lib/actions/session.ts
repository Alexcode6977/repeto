'use server';

import { canManageTroupe, canDirectTroupe } from '@/lib/utils/roles';

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
            // Admins, Adjoints, and Directors can see drafts
            canViewDrafts = canManageTroupe(membership.roles) || canDirectTroupe(membership.roles);
        }
    }

    // 3. Filter based on visibility
    // Admin/Director sees EVERYTHING
    if (canViewDrafts) {
        return data;
    }

    // Members see:
    // a) Sessions with NO plan (Generic events) - assumed visible
    // b) Sessions with a plan that is 'upcoming', 'processing' (maybe restricted), 'validated'
    return data.filter((event: any) => {
        const plan = Array.isArray(event.session_plans) ? event.session_plans[0] : event.session_plans;

        if (!plan) return true; // No plan = Visible (Generic event)
        // Members typically see upcoming and validated. Processing might be visible as "pending"
        return ['upcoming', 'processing', 'validated'].includes(plan.status);
    });
}

/**
 * Get detailed data for a specific session (event + attendance + plan).
 */
export async function getSessionDetails(eventId: string) {
    const supabase = await createClient();

    // 1. Fetch Event
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


    // 4. Calculate line counts (Server-side instead of RPC)
    const playsWithStats = allPlays.map((p: any) => {
        try {
            const lineCounts = calculateLineStats(p);
            return {
                ...p,
                lineStats: lineCounts
            };
        } catch (e) {
            console.error(`Error calculating stats for play ${p.title}:`, e);
            return { ...p, lineStats: [] };
        }
    });

    return {
        ...event,
        ...complementaryData,
        plays: playsWithStats
    };
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

    // Deduplicate scenes (Keep for backward compatibility / indexing)
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

    if (planStructure) {
        updateData.plan_structure = planStructure;
    }

    if (status === 'upcoming') {
        updateData.published_at = new Date().toISOString();
    }

    // Update Session Plan
    const { error: planError } = await supabase
        .from('session_plans')
        .upsert(updateData);

    if (planError) {
        console.error('Error saving session plan:', planError);
        throw new Error('Failed to save session plan');
    }

    // Update Event Title if provided
    if (title) {
        const { error: eventError } = await supabase
            .from('events')
            .update({ title: title })
            .eq('id', eventId);

        if (eventError) {
            console.error('Error updating event title:', eventError);
            // Don't throw here to avoid blocking plan save, but maybe we should?
            // Let's log it. User will see old title but plan saved.
        }
    }

    revalidatePath(`/troupes`);
}

/**
 * Update session status (Generic)
 */
export async function updateSessionStatus(eventId: string, status: 'preparation' | 'upcoming' | 'processing' | 'validated') {
    const supabase = await createClient();

    const { error } = await supabase
        .from('session_plans')
        .update({
            status: status,
            updated_at: new Date().toISOString(),
            ...(status === 'upcoming' ? { published_at: new Date().toISOString() } : {})
        })
        .eq('event_id', eventId);

    if (error) {
        console.error("Error updating session status:", error);
        throw new Error('Failed to update session status');
    }

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

    const { error } = await supabase
        .from('session_raw_notes')
        .insert({
            event_id: eventId,
            play_id: playId,
            scene_index: sceneIndex,
            line_index: lineIndex,
            text: text,
            context: context
        });

    if (error) {
        console.error('Error saving raw note:', error);
        throw new Error('Failed to save raw note');
    }
}

/**
 * Get RAW notes for a session
 */
export async function getRawNotes(eventId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('session_raw_notes')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching raw notes:', error);
        return [];
    }
    return data;
}

export async function updateRawNote(noteId: string, text: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('session_raw_notes')
        .update({ text })
        .eq('id', noteId);

    if (error) {
        console.error('Error updating raw note:', error);
        throw new Error('Failed to update raw note');
    }
}

export async function deleteRawNote(noteId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('session_raw_notes')
        .delete()
        .eq('id', noteId);

    if (error) {
        console.error('Error deleting raw note:', error);
        throw new Error('Failed to delete raw note');
    }
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

    const { error } = await supabase
        .from('rehearsal_feedbacks')
        .insert({
            event_id: eventId,
            character_id: characterId,
            actor_id: actorId,
            guest_id: guestId,
            text,
            status
        });

    if (error) {
        console.error('Error submiting feedback:', error);
        throw new Error('Failed to submit feedback');
    }
    revalidatePath(`/troupes`);
}

/**
 * Publish all pending feedbacks for a session
 */
export async function publishSessionFeedbacks(eventId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('rehearsal_feedbacks')
        .update({ status: 'published' })
        .eq('event_id', eventId)
        .eq('status', 'pending');

    if (error) {
        console.error('Error publishing feedbacks:', error);
        throw new Error('Failed to publish feedbacks');
    }
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
            events(
                title,
                start_time,
                session_plans(selected_scenes)
            ),
            play_characters(name)
        `)
        .eq('actor_id', user.id)
        .eq('status', 'published') // Only show published feedbacks
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

/**
 * Helper: Normalize name for matching
 */
function normalizeName(name: string): string {
    return name
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9 ]/g, "")
        .trim();
}

/**
 * Helper: Calculate Line Stats from Script Content
 * Alternative to the missing 'get_line_counts' RPC
 */
function calculateLineStats(play: any) {
    if (!play.script_content || !play.play_scenes || !play.play_characters) {
        return [];
    }

    const script = play.script_content;
    const lines = script.lines || [];
    const dbScenes = play.play_scenes; // Assumed sorted/complete
    const dbCharacters = play.play_characters;

    // 1. Prepare Maps
    const charMap = new Map<string, string>(); // Normalized Name -> UUID
    dbCharacters.forEach((c: any) => {
        charMap.set(normalizeName(c.name), c.id);
    });

    // 2. Prepare Scenes (Match by order or title)
    // We assume dbScenes are in correct order (order_index) or creation order
    const sortedDbScenes = [...dbScenes].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

    // We need to match script scenes to DB scenes.
    // The script lines flow linearly. We'll track the "current" DB scene index.
    let currentDbSceneIndex = -1;
    let currentSceneId: string | null = null;

    // Stats: Key = "sceneId|charId" -> count
    const statsMap = new Map<string, number>();

    lines.forEach((line: any) => {
        if (line.type === 'scene_heading') {
            // Advance scene
            currentDbSceneIndex++;
            if (currentDbSceneIndex < sortedDbScenes.length) {
                currentSceneId = sortedDbScenes[currentDbSceneIndex].id;
            } else {
                currentSceneId = null; // Out of bounds of known scenes
            }
        } else if (line.type === 'dialogue') {
            if (currentSceneId) {
                const normChar = normalizeName(line.character);
                const charId = charMap.get(normChar);

                // Try fuzzy match or partial if not strict?
                // For now, strict normalized match. 
                // Parsing usually produces consistent names.

                if (charId) {
                    const key = `${currentSceneId}|${charId}`;
                    statsMap.set(key, (statsMap.get(key) || 0) + 1);
                }
            }
        }
    });

    // 3. Format result
    const result: any[] = [];
    statsMap.forEach((count, key) => {
        const [scene_id, character_id] = key.split('|');
        result.push({
            scene_id,
            character_id,
            line_count: count
        });
    });

    return result;
}
