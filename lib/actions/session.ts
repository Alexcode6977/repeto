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

/**
 * Get personalized preparation details for a session.
 * specific to the current user's characters.
 */
export async function getUserPreparationDetails(sessionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // 1. Fetch Session Plan and details
    const { data: session, error } = await supabase
        .from('events')
        .select(`
            id,
            start_time,
            play_id,
            session_plans (selected_scenes)
        `)
        .eq('id', sessionId)
        .single();

    if (error || !session || !session.session_plans) return [];

    // Fix: Supabase might return an array for relations depending on inference
    const sessionPlan = Array.isArray(session.session_plans) ? session.session_plans[0] : session.session_plans;

    if (!sessionPlan) return [];

    const selectedScenes = sessionPlan.selected_scenes || [];
    const selectedSceneIds = selectedScenes.map((s: any) => typeof s === 'string' ? s : s.id);

    if (selectedSceneIds.length === 0) return [];

    // 2. Fetch Plays involved to find characters
    // We need to know which plays these scenes belong to, and checks if user has a character in them.
    // Optimization: fetch all plays where the user is an actor.
    const { data: userCharacters, error: charError } = await supabase
        .from('play_characters')
        .select(`
            id, 
            name, 
            play_id,
            plays (title),
            play_scenes (id, title, summary)
        `)
        .eq('actor_id', user.id);

    if (charError || !userCharacters) return [];

    // 3. Filter scenes directly: 
    // We want scenes that are: 
    // a) in the selected_scenes list
    // b) involve one of the user's characters
    // But wait, `play_scenes` above gives us ALL scenes for the play, not necessarily ones where the character appears if the DB isn't structured that way.
    // The `play_scenes` join in `play_characters` isn't standard unless there's a many-to-many. 
    // Usually it's scene -> scene_characters -> character.

    // Let's do it differently.
    // Fetch detailed scenes for the selected IDs.
    const { data: detailedScenes, error: scenesError } = await supabase
        .from('play_scenes')
        .select(`
            id,
            title,
            summary,
            play_id,
            scene_characters (character_id)
        `)
        .in('id', selectedSceneIds);

    if (scenesError || !detailedScenes) return [];

    // 4. Fetch last feedback for user's characters
    const myCharacterIds = userCharacters.map(c => c.id);
    const lastFeedbacks = await getLastFeedbacksForCharacters(myCharacterIds);

    // 5. Build the result
    // Group by Play -> Character
    const result: any[] = [];

    // Grouping
    // We'll iterate plays I'm involved in.
    const playsMap = new Map();

    // Helper to find which of my characters is in a scene
    const getMyCharInScene = (scene: any) => {
        const sceneCharIds = scene.scene_characters.map((sc: any) => sc.character_id);
        return userCharacters.find(uc => sceneCharIds.includes(uc.id));
    };

    // Filter scenes relevant to me
    const myScenes = detailedScenes.filter(scene => getMyCharInScene(scene));

    for (const scene of myScenes) {
        const myChar = getMyCharInScene(scene);
        if (!myChar) continue;

        const playId = scene.play_id;
        // Fix: plays might be array or object
        const playData = Array.isArray(myChar.plays) ? myChar.plays[0] : myChar.plays;
        const playTitle = playData?.title || "Pièce inconnue";

        if (!playsMap.has(playId)) {
            playsMap.set(playId, {
                playTitle: playTitle,
                characterName: myChar.name,
                characterId: myChar.id,
                lastFeedback: lastFeedbacks[myChar.id]?.text || null,
                lastFeedbackDate: lastFeedbacks[myChar.id]?.created_at || null,
                scenes: []
            });
        }

        const playGroup = playsMap.get(playId);
        // Add scene if not already there (order might be lost if we don't respect selectedScenes order, 
        // let's try to maintain order based on selectedSceneIds)
        playGroup.scenes.push({
            id: scene.id,
            title: scene.title,
            summary: scene.summary
        });
    }

    // Convert map to array and maybe sort scenes by their appearance in selectedSceneIds
    const finalResult = Array.from(playsMap.values()).map(group => {
        // Sort scenes by the original execution order
        group.scenes.sort((a: any, b: any) => {
            return selectedSceneIds.indexOf(a.id) - selectedSceneIds.indexOf(b.id);
        });
        return group;
    });

    return finalResult;
}
