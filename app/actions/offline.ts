"use server";

import { createClient } from "@/lib/supabase/server";
import { SourceType } from "@/lib/actions/voice-cache";

export interface AudioManifestEntry {
    lineIndex: number;
    characterName: string;
    textHash: string;
    audioUrl: string;
    voice: string;
}

export async function getAudioManifest(
    sourceType: SourceType,
    sourceId: string
): Promise<AudioManifestEntry[]> {
    const supabase = await createClient();

    // 1. Get all voice configs for this source
    const { data: configs, error: configError } = await supabase
        .from('play_voice_config')
        .select('id, character_name, voice')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);

    if (configError || !configs || configs.length === 0) {
        return [];
    }

    const configIds = configs.map(c => c.id);
    const configMap = new Map(configs.map(c => [c.id, c]));

    // 2. Get all audio cache entries for these configs
    const { data: audioEntries, error: audioError } = await supabase
        .from('play_audio_cache')
        .select('config_id, line_index, text_hash, audio_url')
        .in('config_id', configIds);

    if (audioError || !audioEntries) {
        return [];
    }

    // 3. Map to manifest
    return audioEntries.map(entry => {
        const config = configMap.get(entry.config_id)!;
        return {
            lineIndex: entry.line_index,
            characterName: config.character_name,
            textHash: entry.text_hash,
            audioUrl: entry.audio_url,
            voice: config.voice
        };
    });
}
