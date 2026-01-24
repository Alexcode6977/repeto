'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ParsedScript, ScriptLine } from '@/lib/types';

/**
 * Injects a director's note (stage direction) into the script.
 * 
 * @param playId The ID of the play to modify
 * @param sceneIndex The index of the scene (global index in script.scenes)
 * @param text The content of the note
 * @param targetLineIndex Optional: If provided, inserts BEFORE this line. If null, inserts at start of scene.
 */
export async function injectDirectorNote(
    playId: string,
    sceneIndex: number,
    text: string,
    targetLineIndex?: number
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // 1. Fetch current script content
    const { data: play, error } = await supabase
        .from('plays')
        .select('script_content, troupe_id')
        .eq('id', playId)
        .single();

    if (error || !play || !play.script_content) {
        throw new Error('Play not found or empty script');
    }

    // 2. Parsed Script (Cast as type)
    const script = play.script_content as ParsedScript;

    // 3. Create the new Line
    // We generate a pseudo-random ID for the line based on timestamp
    const newLineId = `director-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newLine: ScriptLine = {
        id: newLineId,
        type: 'stage_direction',
        character: 'Metteur en Scène', // Special character name for visual distinction
        text: `[NOTE] ${text}` // Prefix or specific formatting can be handled in UI too
    };

    // 4. Determine Insertion Point
    let insertionIndex = -1;

    if (targetLineIndex !== undefined && targetLineIndex !== null) {
        // Insert BEFORE the target line
        insertionIndex = targetLineIndex;
    } else {
        // Global Scene Note: Insert right after scene start
        // Find the start index of the scene
        const scene = script.scenes[sceneIndex];
        if (!scene) throw new Error('Scene not found');

        // The scene starts at scene.index. 
        // We want to insert it there effectively, shifting everything down.
        insertionIndex = scene.index;
    }

    // Validate bounds
    if (insertionIndex < 0 || insertionIndex > script.lines.length) {
        throw new Error('Invalid insertion index');
    }

    // 5. Insert Line
    script.lines.splice(insertionIndex, 0, newLine);

    // 6. Update Scene Indices
    // Crucial: All scenes starting AFTER this point must have their index shifted by +1
    for (const s of script.scenes) {
        if (s.index > insertionIndex) {
            s.index += 1;
        }
    }

    // 7. Update DB
    const { error: updateError } = await supabase
        .from('plays')
        .update({
            script_content: script
        })
        .eq('id', playId);

    if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Failed to update script');
    }

    revalidatePath(`/troupes/${play.troupe_id}`);

    return { success: true, newLineId };
}
