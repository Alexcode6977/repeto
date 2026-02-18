'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ParsedScript } from '@/lib/types';
import { canManageContent } from '@/lib/utils/roles';

function normalizeCharacterLabel(value: string): string {
    return (value || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function resolveCanonicalCharacters(script: ParsedScript): string[] {
    const source = script.mappings?.canonical_characters?.length
        ? script.mappings.canonical_characters
        : (script.characters || []);
    return Array.from(new Set(source.map((item) => normalizeCharacterLabel(item)).filter(Boolean)));
}

function resolveLineCharacterToCanonical(script: ParsedScript, rawCharacter: string): string {
    const normalized = normalizeCharacterLabel(rawCharacter);
    const mapped = script.mappings?.aliases?.[normalized];
    return mapped ? normalizeCharacterLabel(mapped) : normalized;
}

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
    // Verify Perms via DB or just rely on RLS (better practice usually)
    // But since we have a manual check here, let's update it to check for 'roles' array
    const { data: member } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    const roles = member?.roles || [];
    const canCreate = canManageContent(roles);

    if (!canCreate) {
        throw new Error('Seul le metteur en scène peut ajouter une pièce.');
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

    const canonicalCharacters = resolveCanonicalCharacters(parsedScript);
    if (canonicalCharacters.length > 0) {
        const charInserts = canonicalCharacters.map((name) => ({
            play_id: play.id,
            name
        }));

        const { data: chars, error: charError } = await supabase
            .from('play_characters')
            .insert(charInserts)
            .select();

        if (charError) {
            console.error('Error creating characters:', charError);
            // Non-blocking but effectively breaks casting capability.
        } else {
            chars.forEach((c) => characterMap.set(normalizeCharacterLabel(c.name), c.id));
        }
    }

    // 3. Create Scenes & Map Characters
    // We need to iterate through the script to find scenes and which characters appear in them.
    // The current ParsedScript.scenes contains { index, title }.
    // Detailed scene content is implicit in lines. We need to process this.

    // We need real indices for scenes.
    // Assumption: parsedScript.scenes is sorted by index.

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
                    const resolvedCharacter = resolveLineCharacterToCanonical(parsedScript, line.character);
                    const charId = characterMap.get(resolvedCharacter);
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
        play.play_scenes.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
    }

    return play;
}

export async function updateCasting(characterId: string, actorId: string | null, guestId: string | null = null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Get play and troupe info to verify permissions
    const { data: character } = await supabase
        .from('play_characters')
        .select('play_id, plays(troupe_id)')
        .eq('id', characterId)
        .single();

    if (!character) throw new Error('Character not found');

    const troupeId = (character.plays as { troupe_id?: string } | null)?.troupe_id;
    if (!troupeId) throw new Error('Troupe not found');

    // Verify user has permission (Metteur en scène)
    const { data: membership } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', troupeId)
        .eq('user_id', user.id)
        .single();

    const roles = membership?.roles || [];
    const canManage = canManageContent(roles);
    if (!canManage) {
        throw new Error('Seul le metteur en scène peut modifier le casting.');
    }

    // Update casting
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

    // Get play to verify permissions
    const { data: play } = await supabase
        .from('plays')
        .select('troupe_id')
        .eq('id', playId)
        .single();

    if (!play) throw new Error('Play not found');

    // Verify user has permission (Metteur en scène)
    const { data: membership } = await supabase
        .from('troupe_members')
        .select('roles')
        .eq('troupe_id', play.troupe_id)
        .eq('user_id', user.id)
        .single();

    const roles = membership?.roles || [];
    const canManage = canManageContent(roles);
    if (!canManage) {
        throw new Error('Seul le metteur en scène peut supprimer une pièce.');
    }

    // Delete play
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

// ... existing code ...

export async function getScriptDetails(scriptId: string) {
    const supabase = await createClient();

    const { data: script, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('id', scriptId)
        .single();

    if (error || !script) return null;

    // Normalize to match "Play" structure for OfflineManager
    // Personal scripts store the ParsedScript in 'content' column
    const content = script.content as ParsedScript;
    const canonicalCharacters = resolveCanonicalCharacters(content);

    return {
        id: script.id,
        title: script.title,
        script_content: {
            ...content,
            characters: canonicalCharacters,
        },
        // Mock DB relations from JSON content
        play_scenes: content.scenes?.map((s, i) => ({
            id: `local_scene_${i}`,
            title: s.title,
            order_index: i
        })) || [],
        play_characters: canonicalCharacters.map((name, i) => ({
            id: `local_char_${i}`,
            name: name,
            actor_id: null, // Personal scripts usually have no actor assignments in DB
            profile: null
        })),
        is_script: true // Flag to identify origin
    };
}
