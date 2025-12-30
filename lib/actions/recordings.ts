'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { canRecord } from '@/lib/subscription';

/**
 * Upload a voice recording for a specific line in a play.
 * Only allowed if the user is assigned to that character AND has recording permission.
 */
export async function uploadLineRecording(
    playId: string,
    characterName: string,
    lineId: string,
    audioBlob: Blob | File,
    troupeId?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // SUBSCRIPTION CHECK: Verify user has recording permission
    const hasRecordingAccess = await canRecord(user.id, troupeId);
    if (!hasRecordingAccess) {
        throw new Error("L'enregistrement audio nécessite un abonnement Solo Pro ou Troupe.");
    }

    // 1. Verify that the user is assigned to this character in this play
    const { data: character, error: charError } = await supabase
        .from('play_characters')
        .select('id')
        .eq('play_id', playId)
        .eq('name', characterName)
        .eq('actor_id', user.id)
        .single();

    if (charError || !character) {
        throw new Error("Vous n'êtes pas assigné à ce personnage.");
    }

    // 2. Upload to Storage
    const fileName = `${user.id}/${playId}/${lineId}.webm`;

    // Convert Blob to ArrayBuffer for Supabase Storage
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('play-recordings')
        .upload(fileName, buffer, {
            contentType: 'audio/webm',
            upsert: true
        });

    if (uploadError) {
        console.error('Full Upload error:', JSON.stringify(uploadError, null, 2));
        throw new Error(`Erreur lors de l'envoi de l'audio: ${uploadError.message}`);
    }

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('play-recordings')
        .getPublicUrl(fileName);

    // 4. Upsert into database
    const { error: dbError } = await supabase
        .from('play_line_recordings')
        .upsert({
            play_id: playId,
            character_name: characterName,
            line_id: lineId,
            audio_url: publicUrl,
            user_id: user.id
        }, {
            onConflict: 'play_id, line_id, user_id'
        });

    if (dbError) {
        console.error('DB error:', dbError);
        throw new Error('Erreur lors de l\'enregistrement en base.');
    }

    revalidatePath(`/troupes/[troupeId]/plays/${playId}`, 'page');

    return publicUrl;
}

/**
 * Get all recordings for a specific play.
 */
export async function getPlayRecordings(playId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('play_line_recordings')
        .select('*')
        .eq('play_id', playId);

    if (error) {
        console.error('Error fetching recordings:', error);
        return [];
    }

    return data;
}

/**
 * Delete a specific recording.
 */
export async function deleteLineRecording(recordingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Fetch the recording to get the file path
    const { data: recording } = await supabase
        .from('play_line_recordings')
        .select('*')
        .eq('id', recordingId)
        .eq('user_id', user.id)
        .single();

    if (!recording) throw new Error('Recording not found or unauthorized');

    // 1. Delete from Storage
    const fileName = `${user.id}/${recording.play_id}/${recording.line_id}.webm`;
    await supabase.storage.from('play-recordings').remove([fileName]);

    // 2. Delete from DB
    await supabase.from('play_line_recordings').delete().eq('id', recordingId);

    return { success: true };
}
