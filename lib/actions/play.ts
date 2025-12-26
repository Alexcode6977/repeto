'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ParsedScript, ScriptLine } from '@/lib/types';

export async function createPlay(
    troupeId: string,
    title: string,
    parsedScript: ParsedScript,
    pdfUrl: string | null = null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // Verify Admin rights
    const { data: member } = await supabase
        .from('troupe_members')
        .select('role')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    if (member?.role !== 'admin') {
        throw new Error('Seul l\'administrateur peut ajouter une pièce.');
    }

    // 1. Create Play
    const { data: play, error: playError } = await supabase
        .from('plays')
        .insert({
            troupe_id: troupeId,
            title: title,
            pdf_url: pdfUrl,
            script_content: parsedScript // Storing the full JSON for reference/backup
        })
        .select()
        .single();

    if (playError) {
        console.error('Error creating play:', JSON.stringify(playError, null, 2));
        throw new Error('Failed to create play record');
    }

    // 2. Create Characters
    // We map parsed characters to DB records
    const characterMap = new Map<string, string>(); // Name -> UUID

    if (parsedScript.characters && parsedScript.characters.length > 0) {
        const charInserts = parsedScript.characters.map(name => ({
            play_id: play.id,
            name: name
        }));

        const { data: chars, error: charError } = await supabase
            .from('play_characters')
            .insert(charInserts)
            .select();

        if (charError) {
            console.error('Error creating characters:', charError);
            // Non-blocking but effectively breaks casting capability.
        } else {
            chars.forEach(c => characterMap.set(c.name, c.id));
        }
    }

    // 3. Create Scenes & Map Characters
    // We need to iterate through the script to find scenes and which characters appear in them.
    // The current ParsedScript.scenes contains { index, title }.
    // Detailed scene content is implicit in lines. We need to process this.

    // We need real indices for scenes.
    // Assumption: parsedScript.scenes is sorted by index.

    let currentSceneId: string | null = null;
    let sceneCharacterBuffer = new Set<string>(); // Character IDs in current scene

    // Helper to flush current scene characters
    const flushSceneCharacters = async (sceneId: string, charIds: Set<string>) => {
        if (charIds.size === 0) return;
        const inserts = Array.from(charIds).map(cid => ({
            scene_id: sceneId,
            character_id: cid
        }));
        await supabase.from('scene_characters').insert(inserts);
    };

    // First, let's just insert all scenes to get their IDs
    const sceneInserts = parsedScript.scenes.map((s, i) => ({
        play_id: play.id,
        title: s.title,
        order_index: i
    }));

    const { data: createdScenes, error: sceneError } = await supabase
        .from('play_scenes')
        .insert(sceneInserts)
        .select();

    if (!sceneError && createdScenes) {
        // Now we need to figure out which characters are in which scene.
        // We iterate lines.
        let sceneIndex = 0;
        let currentSceneObj = createdScenes.find(s => s.order_index === 0);

        // Map order_index -> scene_id
        const sceneIdMap = new Map(createdScenes.map(s => [s.order_index, s.id]));

        // Find line indices where scenes start
        // parsedScript.scenes[i].index is the line index where scene starts.

        for (let i = 0; i < parsedScript.scenes.length; i++) {
            const sceneStart = parsedScript.scenes[i].index;
            const sceneEnd = (i + 1 < parsedScript.scenes.length) ? parsedScript.scenes[i + 1].index : parsedScript.lines.length;
            const sceneId = sceneIdMap.get(i);

            if (!sceneId) continue;

            const actorsInScene = new Set<string>();

            for (let j = sceneStart; j < sceneEnd; j++) {
                const line = parsedScript.lines[j];
                if (line.type === 'dialogue' && line.character) {
                    const charId = characterMap.get(line.character);
                    if (charId) {
                        actorsInScene.add(charId);
                    }
                }
            }

            // Insert Junctions
            await flushSceneCharacters(sceneId, actorsInScene);
        }
    }

    revalidatePath(`/troupes/${troupeId}`);
    return play.id;
}

export async function getTroupePlays(troupeId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('plays')
        .select('id, title, created_at, play_characters(count), play_scenes(count)')
        .eq('troupe_id', troupeId)
        .order('created_at', { ascending: false });

    return data || [];
}

export async function getPlayDetails(playId: string) {
    const supabase = await createClient();

    // Check access first (via RLS ideally, but we verify troupe membership indirectly)
    const { data: play, error } = await supabase
        .from('plays')
        .select(`
            *,
            play_characters (
                id,
                name,
                actor_id,
                guest_id,
                profiles (
                    first_name,
                    email
                ),
                troupe_guests (
                    id,
                    name,
                    email
                )
            ),
            play_scenes (
                id,
                title,
                order_index,
                scene_characters (
                    character_id
                )
            )
        `)
        .eq('id', playId)
        .single();

    if (error) return null;

    // Sort scenes by index
    if (play.play_scenes) {
        play.play_scenes.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return play;
}

export async function updateCasting(characterId: string, actorId: string | null, guestId: string | null = null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Reset both and set the correct one
    const { error } = await supabase
        .from('play_characters')
        .update({
            actor_id: actorId,
            guest_id: guestId
        })
        .eq('id', characterId);

    if (error) {
        console.error('Error updating casting:', error);
        throw new Error('Failed to update casting');
    }

    revalidatePath(`/troupes`);
}

export async function getUserScripts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('scripts')
        .select('id, title, created_at, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return data || [];
}

export async function getSharedScripts() {
    const supabase = await createClient();

    const { data } = await supabase
        .from('scripts')
        .select('id, title, created_at, content')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

    return data || [];
}

export async function deletePlayAction(playId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Verify admin rights could be done here too, but RLS should handle it.
    // For now we just perform the delete.
    const { error } = await supabase
        .from('plays')
        .delete()
        .eq('id', playId);

    if (error) {
        console.error('Error deleting play:', error);
        throw new Error('Failed to delete play');
    }

    revalidatePath(`/troupes`);
}

