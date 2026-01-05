"use server";

import { createClient } from "@/lib/supabase/server";

// Define locally to avoid circular dependency with tts.ts
export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type SourceType = 'library_script' | 'private_script' | 'troupe_play';

export interface VoiceConfig {
    id: string;
    source_type: SourceType;
    source_id: string;
    character_name: string;
    voice: OpenAIVoice;
    created_by: string | null;
    troupe_id: string | null;
}

export interface VoiceAssignment {
    character: string;
    voice: OpenAIVoice;
}

/**
 * Get existing voice config for a play/script
 * Returns null if no config exists (needs first-time generation)
 */
export async function getVoiceConfig(
    sourceType: SourceType,
    sourceId: string
): Promise<VoiceConfig[] | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('play_voice_config')
        .select('*')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);

    if (error) {
        console.error('[VoiceCache] Error fetching config:', error);
        return null;
    }

    return data && data.length > 0 ? data : null;
}

/**
 * Create voice config for first-time generation
 * This locks the voice assignments for the play
 */
export async function createVoiceConfig(
    sourceType: SourceType,
    sourceId: string,
    assignments: VoiceAssignment[],
    troupeId?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Non authentifié" };
    }

    // Check if config already exists
    const existing = await getVoiceConfig(sourceType, sourceId);
    if (existing) {
        return { success: false, error: "Configuration déjà existante" };
    }

    // Insert all voice assignments
    const { error } = await supabase
        .from('play_voice_config')
        .insert(
            assignments.map(a => ({
                source_type: sourceType,
                source_id: sourceId,
                character_name: a.character,
                voice: a.voice,
                created_by: user.id,
                troupe_id: troupeId || null
            }))
        );

    if (error) {
        console.error('[VoiceCache] Error creating config:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Get cached audio for a specific line
 */
export async function getCachedAudio(
    sourceType: SourceType,
    sourceId: string,
    lineIndex: number,
    characterName: string
): Promise<string | null> {
    const supabase = await createClient();

    // First get the config ID for this character
    const { data: config } = await supabase
        .from('play_voice_config')
        .select('id')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .eq('character_name', characterName)
        .single();

    if (!config) return null;

    // Then get the cached audio
    const { data: cache } = await supabase
        .from('play_audio_cache')
        .select('audio_url')
        .eq('config_id', config.id)
        .eq('line_index', lineIndex)
        .single();

    return cache?.audio_url || null;
}

/**
 * Store generated audio in cache
 */
export async function cacheAudio(
    sourceType: SourceType,
    sourceId: string,
    lineIndex: number,
    characterName: string,
    textHash: string,
    audioUrl: string
): Promise<boolean> {
    const supabase = await createClient();

    // Get config ID
    const { data: config } = await supabase
        .from('play_voice_config')
        .select('id')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .eq('character_name', characterName)
        .single();

    if (!config) {
        console.error('[VoiceCache] No config found for character:', characterName);
        return false;
    }

    // Insert or update cache entry
    const { error } = await supabase
        .from('play_audio_cache')
        .upsert({
            config_id: config.id,
            line_index: lineIndex,
            text_hash: textHash,
            audio_url: audioUrl
        }, {
            onConflict: 'config_id,line_index'
        });

    if (error) {
        console.error('[VoiceCache] Error caching audio:', error);
        return false;
    }

    return true;
}

/**
 * Get the voice for a specific character from config
 */
export async function getCharacterVoice(
    sourceType: SourceType,
    sourceId: string,
    characterName: string
): Promise<OpenAIVoice | null> {
    const supabase = await createClient();

    const { data } = await supabase
        .from('play_voice_config')
        .select('voice')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .eq('character_name', characterName)
        .single();

    return data?.voice as OpenAIVoice || null;
}

/**
 * Check if a play has voice config (voices already generated)
 */
export async function hasVoiceConfig(
    sourceType: SourceType,
    sourceId: string
): Promise<boolean> {
    const config = await getVoiceConfig(sourceType, sourceId);
    return config !== null;
}

/**
 * Determine source type based on context
 */
export async function determineSourceType(
    isPublicScript: boolean,
    troupeId?: string,
    playId?: string
): Promise<SourceType> {
    if (playId && troupeId) {
        return 'troupe_play';
    }
    if (isPublicScript) {
        return 'library_script';
    }
    return 'private_script';
}

/**
 * Get all script IDs that have voice configurations
 * Used to display "Voix IA" badge on script cards
 */
export async function getScriptsWithVoiceConfig(): Promise<string[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('play_voice_config')
        .select('source_id')
        .in('source_type', ['library_script', 'private_script']);

    if (error) {
        console.error('[VoiceCache] Error fetching scripts with config:', error);
        return [];
    }

    // Return unique source IDs
    const uniqueIds = [...new Set(data?.map(d => d.source_id) || [])];
    return uniqueIds;
}
/**
 * Generate default voice config if none exists
 * GOVERNANCE RULES:
 * - Library scripts: NEVER auto-assign here (Global Admin must set it up)
 * - Troupe plays: NEVER auto-assign here (Troupe Admin must set it up via Casting)
 * - Private scripts: Auto-assign is allowed (Owner is the user)
 */
export async function ensureVoiceConfig(
    sourceType: SourceType,
    sourceId: string,
    characters: string[],
    troupeId?: string
): Promise<{ success: boolean; error?: string }> {
    // Permission check: Only private scripts can be auto-assigned implicitly
    if (sourceType === 'library_script') {
        // We do NOT auto-assign library scripts. 
        // They must be configured by Global Admin explicitly.
        // User will fall back to browser voices until then.
        return { success: false, error: "Configuration voix bibliothèque manquante" };
    }

    if (sourceType === 'troupe_play') {
        // We do NOT auto-assign troupe plays implicitly on listen.
        // Troupe Admin must configure them in Casting.
        return { success: false, error: "En attente du casting vocal par l'admin" };
    }
    const supabase = await createClient();

    // Check if config exists
    const existing = await hasVoiceConfig(sourceType, sourceId);
    if (existing) return { success: true };

    const VOICES: OpenAIVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

    // Create assignments for private script
    const assignments: VoiceAssignment[] = characters.map((char, index) => ({
        character: char,
        voice: VOICES[index % VOICES.length]
    }));

    return createVoiceConfig(sourceType, sourceId, assignments, troupeId);
}

/**
 * Manually update a voice assignment (Admin/Owner action)
 */
export async function updateVoiceAssignment(
    sourceType: SourceType,
    sourceId: string,
    characterName: string,
    voice: OpenAIVoice,
    troupeId?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non authentifié" };

    // --- GOVERNANCE CHECKS ---

    // 1. Troupe Play: Must be Admin
    if (sourceType === 'troupe_play' && troupeId) {
        const { data: member } = await supabase
            .from('troupe_members')
            .select('role')
            .eq('troupe_id', troupeId)
            .eq('user_id', user.id)
            .single();

        if (member?.role !== 'admin') {
            return { success: false, error: "Seul l'admin de la troupe peut modifier les voix" };
        }
    }

    // 2. Library Script: Must be Global Admin
    if (sourceType === 'library_script') {
        if (user.email !== 'alex69.sartre@gmail.com') {
            return { success: false, error: "Seul l'admin global peut modifier les voix de la bibliothèque" };
        }
    }

    // 3. Private Script: Must be Owner
    if (sourceType === 'private_script') {
        const { data: script } = await supabase
            .from('scripts')
            .select('user_id')
            .eq('id', sourceId)
            .single();

        if (script?.user_id !== user.id) {
            return { success: false, error: "Vous n'êtes pas le propriétaire de ce script" };
        }
    }

    // Upsert the config
    const { error } = await supabase
        .from('play_voice_config')
        .upsert({
            source_type: sourceType,
            source_id: sourceId,
            character_name: characterName,
            voice: voice,
            troupe_id: troupeId || null,
            created_by: user.id
        }, {
            onConflict: 'source_type,source_id,character_name'
        });

    if (error) {
        console.error('[VoiceCache] Error updating voice:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
