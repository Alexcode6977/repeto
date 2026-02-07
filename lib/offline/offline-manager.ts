import { db, type OfflineAsset } from './db';
import { getPlayDetails, getScriptDetails } from '@/lib/actions/play';
import { getAudioManifest } from '@/app/actions/offline';
import { determineSourceType } from '@/lib/actions/voice-cache';

export class OfflineManager {
    private static instance: OfflineManager;

    private constructor() { }

    public static getInstance(): OfflineManager {
        if (!OfflineManager.instance) {
            OfflineManager.instance = new OfflineManager();
        }
        return OfflineManager.instance;
    }

    /**
     * Retrieves audio blob URL for a specific line if available and valid.
     */
    public async getAudio(lineId: string, expectedHash: string, scriptId?: string): Promise<string | null> {
        const candidateIds: string[] = [];

        // New format used by offline downloader
        if (scriptId) {
            candidateIds.push(`${scriptId}_${lineId}`);
        }
        // Legacy/direct key format
        candidateIds.push(lineId);

        let asset: OfflineAsset | undefined;
        for (const id of candidateIds) {
            asset = (await db.assets.get(id)) as OfflineAsset | undefined;
            if (asset) break;
        }

        // Last fallback: lookup by script+hash for compatibility when line IDs differ by source.
        if (!asset && scriptId) {
            asset = (await db.assets.where('[scriptId+hash]').equals([scriptId, expectedHash]).first()) as OfflineAsset | undefined;
        }

        if (!asset) return null;

        // Check if the local asset matches the expected hash (cache invalidation)
        if (asset.hash !== expectedHash) {
            console.warn(`[OfflineManager] Hash mismatch for line ${lineId}. Local: ${asset.hash}, Expected: ${expectedHash}`);
            return null;
        }

        const blob = new Blob([asset.blob], { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
    }

    /**
     * Generates a SHA-256 hash for versioning audio assets.
     * Format: SHA256(Text + VoiceID)
     */
    public async generateHash(text: string, voiceId: string): Promise<string> {
        const msgBuffer = new TextEncoder().encode(text + voiceId);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Downloads a full script and its audio assets.
     */
    public async downloadScript(scriptId: string, troupeId?: string, onProgress?: (current: number, total: number) => void): Promise<void> {
        console.log(`[OfflineManager] Downloading script ${scriptId}...`);

        // 1. Fetch Play Details
        let play = await getPlayDetails(scriptId);
        let isPersonalScript = false;

        if (!play) {
            // Fallback: Try personal script
            play = await getScriptDetails(scriptId);
            if (play) isPersonalScript = true;
        }

        if (!play) throw new Error("Script not found");

        // 2. Determine Source Type
        // If it's a personal script, force SourceType to something appropriate or handle it?
        // determineSourceType logic currently expects Troupe/Play context usually.
        // If isPersonalScript, likely we don't have troupeId anyway.
        // Let's rely on determineSourceType logic or force it.
        const sourceType = await determineSourceType(false, troupeId, scriptId);

        // 3. Save Script to IndexedDB
        await db.scripts.put({
            id: play.id,
            title: play.title,
            lines: play.script_content?.lines || [],
            scenes: play.play_scenes || [],
            characters: play.play_characters || [],
            lastSync: new Date()
        });

        console.log(`[OfflineManager] Script stored. Fetching audio manifest...`);

        // 4. Fetch Audio Manifest
        const manifest = await getAudioManifest(sourceType, scriptId);
        console.log(`[OfflineManager] Found ${manifest.length} audio files.`);

        const total = manifest.length;
        let downloadedCount = 0;

        // 5. Download and Store Audio
        // batch requests to avoid overwhelming network but keep it reasonably fast
        const BATCH_SIZE = 5;
        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = manifest.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (entry) => {
                try {
                    // Construct a unique ID for the asset (e.g., scriptId_lineIndex)
                    const assetId = `${scriptId}_${entry.lineIndex}`;

                    // Check if we already have it with correct hash
                    const existing = await db.assets.get(assetId);
                    if (existing && existing.hash === entry.textHash) {
                        downloadedCount++;
                        onProgress?.(downloadedCount, total);
                        return; // UP-TO-DATE
                    }

                    // Download Blob
                    const response = await fetch(entry.audioUrl);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const blob = await response.arrayBuffer();

                    await db.assets.put({
                        id: assetId,
                        scriptId: scriptId,
                        blob: blob,
                        hash: entry.textHash,
                        voiceId: entry.voice
                    });
                    downloadedCount++;
                    onProgress?.(downloadedCount, total);
                } catch (err) {
                    console.error(`[OfflineManager] Failed to download audio for line ${entry.lineIndex}`, err);
                }
            }));
        }

        console.log(`[OfflineManager] Download complete.`);
    }

    /**
     * Syncs an existing script (Manifest check & Diff).
     */
    public async sync(scriptId: string, troupeId?: string): Promise<void> {
        // Re-run downloadScript which handles diffing implicitly (only downloads new hashes)
        await this.downloadScript(scriptId, troupeId);
    }
}

export const offlineManager = OfflineManager.getInstance();
