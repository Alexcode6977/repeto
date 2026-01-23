'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createInstantSession(troupeId: string, playId: string, characterName: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // 1. Create a new Event (Session)
    // We set a default title 
    const { data: event, error } = await supabase
        .from('events')
        .insert({
            troupe_id: troupeId,
            play_id: playId,
            title: "Répétition Visio",
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours default
        })
        .select()
        .single();

    if (error || !event) {
        console.error("SESSION CREATION FAILED", {
            code: error?.code,
            message: error?.message,
            details: error?.details,
            hint: error?.hint
        });
        throw new Error(`Failed to create session: ${error?.message || "Unknown error"}`);
    }

    // 2. Initialize Plan (required for Live page to work)
    // We fetch all scenes to select them by default? Or none? 
    // The Live page says "Veuillez planifier la séance" if 0 scenes.
    // Let's fetch the first scene of the play to have at least one.
    const { data: scenes } = await supabase
        .from('play_scenes')
        .select('id, title')
        .eq('play_id', playId)
        .order('order_index', { ascending: true })
        .limit(1);

    const initialScenes = scenes?.map(s => ({ id: s.id, objective: "Répétition libre" })) || [];

    const { error: planError } = await supabase
        .from('session_plans')
        .insert({
            event_id: event.id,
            selected_scenes: initialScenes,
            general_notes: `Personnage principal: ${characterName}`
        });

    if (planError) {
        console.error("Plan creation failed", planError);
    }

    // 3. Register creator attendance
    await supabase.from('event_attendance').insert({
        event_id: event.id,
        user_id: user.id,
        status: 'present'
    });

    // 4. Redirect
    redirect(`/troupes/${troupeId}/sessions/${event.id}/live?video=true&character=${encodeURIComponent(characterName)}`);
}
