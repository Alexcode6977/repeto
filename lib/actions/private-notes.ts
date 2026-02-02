'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPrivateNotes(playId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
        .from('actor_private_notes')
        .select('*')
        .eq('play_id', playId)
        .eq('user_id', user.id);

    return data || [];
}

export async function upsertPrivateNote(
    playId: string,
    sceneIndex: number,
    text: string,
    lineIndex?: number
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // Check if a note already exists for this exact position
    const { data: existing } = await supabase
        .from('actor_private_notes')
        .select('id')
        .eq('play_id', playId)
        .eq('user_id', user.id)
        .eq('scene_index', sceneIndex)
        .is('line_index', lineIndex === undefined ? null : lineIndex)
        .single();

    if (existing) {
        if (!text.trim()) {
            // Delete if text is empty
            await supabase
                .from('actor_private_notes')
                .delete()
                .eq('id', existing.id);
        } else {
            // Update
            await supabase
                .from('actor_private_notes')
                .update({ text, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        }
    } else {
        if (!text.trim()) return;
        // Insert
        await supabase
            .from('actor_private_notes')
            .insert({
                play_id: playId,
                user_id: user.id,
                scene_index: sceneIndex,
                line_index: lineIndex,
                text
            });
    }

    revalidatePath(`/troupes/[troupeId]/plays/${playId}/private-annotate`);
}
