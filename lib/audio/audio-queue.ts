import { synthesizeSpeechWithPlayCache } from "@/app/actions/tts";
import { SourceType } from "@/lib/actions/voice-cache";
import { parseSegments } from "@/lib/utils/stage-directions";
import { ScriptLine } from "@/lib/types";

interface AudioRequest {
    text: string;
    character: string;
    lineIndex: number;
    sourceType: SourceType;
    sourceId: string;
    troupeId?: string;
    isDirection: boolean;
}

type PreloadProgressCallback = (completed: number, total: number) => void;

export class AudioQueue {
    // Cache maps a unique key to a Promise that resolves to the audio URL (or null if error)
    private cache = new Map<string, Promise<string | null>>();
    private maxCacheSize = 50; // Keep enough for a good buffer and history

    constructor() { }

    /**
     * Generate a unique key for the cache
     * Includes all parameters that affect the audio output
     */
    private getCacheKey(req: AudioRequest): string {
        // Include isDirection to differentiate character voice from narrator voice
        // Include sourceType to differentiate play vs script contexts
        const directionMarker = req.isDirection ? "DIR" : "DLG"; // Direction vs Dialogue
        return `${req.sourceType}:${req.sourceId}:${req.lineIndex}:${req.character}:${directionMarker}:${req.text.trim().substring(0, 30)}`;
    }

    private buildRequests(
        lines: ScriptLine[],
        startingIndex: number,
        count: number,
        sourceType: SourceType,
        sourceId: string,
        troupeId: string | undefined,
        showDirections: boolean
    ): AudioRequest[] {
        const requests: AudioRequest[] = [];

        for (let i = 0; i < count; i++) {
            const index = startingIndex + i;
            if (index >= lines.length) break;

            const line = lines[index];
            if (!line) continue;

            const segments = parseSegments(line.text);

            if (!showDirections) {
                const dialogueText = segments
                    .filter(s => !s.isDirection)
                    .map(s => s.text)
                    .join("")
                    .trim();

                if (dialogueText.length > 0) {
                    requests.push({
                        text: dialogueText,
                        character: line.character,
                        lineIndex: index,
                        sourceType,
                        sourceId,
                        troupeId,
                        isDirection: false
                    });
                }
            } else {
                for (const segment of segments) {
                    if (!segment.text.trim()) continue;

                    if (segment.isDirection) {
                        const cleanText = segment.text.replace(/^\s*\(|\)\s*$/g, "").trim();
                        if (cleanText) {
                            requests.push({
                                text: cleanText,
                                character: "didascalies",
                                lineIndex: index,
                                sourceType,
                                sourceId,
                                troupeId,
                                isDirection: true
                            });
                        }
                    } else {
                        if (segment.text.trim()) {
                            requests.push({
                                text: segment.text,
                                character: line.character,
                                lineIndex: index,
                                sourceType,
                                sourceId,
                                troupeId,
                                isDirection: false
                            });
                        }
                    }
                }
            }
        }

        return requests;
    }

    private enqueueRequests(requests: AudioRequest[]): Promise<string | null>[] {
        const uniqueRequests = new Map<string, Promise<string | null>>();

        requests.forEach(req => {
            const key = this.getCacheKey(req);
            let promise = this.cache.get(key);

            if (!promise) {
                promise = this.fetchAudio(req);
                this.cache.set(key, promise);
            }

            uniqueRequests.set(key, promise);
        });

        if (this.cache.size > this.maxCacheSize) {
            const keysToDelete = Array.from(this.cache.keys()).slice(0, this.cache.size - this.maxCacheSize);
            keysToDelete.forEach(k => this.cache.delete(k));
        }

        return Array.from(uniqueRequests.values());
    }

    /**
     * Preload multiple lines (lookahead)
     */
    public preload(
        lines: ScriptLine[],
        startingIndex: number,
        count: number,
        sourceType: SourceType,
        sourceId: string,
        troupeId: string | undefined,
        showDirections: boolean
    ) {
        const requests = this.buildRequests(
            lines,
            startingIndex,
            count,
            sourceType,
            sourceId,
            troupeId,
            showDirections
        );
        this.enqueueRequests(requests);
    }

    public async preloadWithProgress(
        lines: ScriptLine[],
        startingIndex: number,
        count: number,
        sourceType: SourceType,
        sourceId: string,
        troupeId: string | undefined,
        showDirections: boolean,
        onProgress?: PreloadProgressCallback
    ): Promise<{ total: number; completed: number }> {
        const requests = this.buildRequests(
            lines,
            startingIndex,
            count,
            sourceType,
            sourceId,
            troupeId,
            showDirections
        );
        const promises = this.enqueueRequests(requests);
        const total = promises.length;

        if (onProgress) {
            onProgress(0, total);
        }

        if (total === 0) {
            return { total: 0, completed: 0 };
        }

        let completed = 0;
        await Promise.all(
            promises.map(async (promise) => {
                try {
                    await promise;
                } finally {
                    completed += 1;
                    if (onProgress) {
                        onProgress(completed, total);
                    }
                }
            })
        );

        return { total, completed };
    }

    /**
     * Actual API call
     */
    private async fetchAudio(req: AudioRequest): Promise<string | null> {
        try {
            const result = await synthesizeSpeechWithPlayCache(
                req.text,
                req.character,
                req.lineIndex,
                req.sourceType,
                req.sourceId,
                req.troupeId
            );

            if ('audio' in result && result.audio) {
                return result.audio;
            } else {
                // console.warn("[AudioQueue] Fetch failed:", result);
                return null;
            }
        } catch (e) {
            console.error("[AudioQueue] Exception:", e);
            return null;
        }
    }

    /**
     * Get URL for specific segment (Called by player)
     */
    public async getUrl(
        text: string,
        character: string,
        lineIndex: number,
        sourceType: SourceType,
        sourceId: string,
        troupeId?: string,
        isDirection: boolean = false,
        lineId?: string,
        segmentIndex?: number
    ): Promise<string | null> {
        // FAST PATH: If we have the line ID and segment index, we just return the public URL 
        // to the pre-generated file from the background worker. This guarantees 0ms latency and matches 
        // the background generation exactly.
        if (lineId && segmentIndex !== undefined) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
            return `${supabaseUrl}/storage/v1/object/public/audio_cache/${sourceId}/${lineId}_${segmentIndex}.mp3`;
        }

        // Slow path: Fallback to the old live generation cache if we lack metadata
        const req: AudioRequest = {
            text, character, lineIndex, sourceType, sourceId, troupeId, isDirection
        };
        const key = this.getCacheKey(req);

        // If not in cache, fetch immediately (Missed preload or first line)
        if (!this.cache.has(key)) {
            console.log(`[AudioQueue] Cache MISS (Immediate fetch): ${text.substring(0, 20)}...`);
            const promise = this.fetchAudio(req);
            this.cache.set(key, promise);
        } else {
            console.log(`[AudioQueue] Cache HIT: ${text.substring(0, 20)}...`);
        }

        return this.cache.get(key) || null;
    }

    public clear() {
        this.cache.clear();
    }
}
