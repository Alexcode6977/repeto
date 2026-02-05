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

export class AudioQueue {
    // Cache maps a unique key to a Promise that resolves to the audio URL (or null if error)
    private cache = new Map<string, Promise<string | null>>();
    private maxCacheSize = 50; // Keep enough for a good buffer and history

    constructor() { }

    /**
     * Generate a unique key for the cache
     */
    private getCacheKey(req: AudioRequest): string {
        // Include isDirection/Narrator in key to differentiate voice
        return `${req.sourceId}-${req.lineIndex}-${req.character}-${req.text.trim().substring(0, 20)}`;
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
        // 1. Identify requests to make
        const requests: AudioRequest[] = [];

        for (let i = 0; i < count; i++) {
            const index = startingIndex + i;
            if (index >= lines.length) break;

            const line = lines[index];
            if (!line) continue;

            // Logic duplicated from playLineSequentially / useListen to ensure matching requests
            const segments = parseSegments(line.text);

            if (!showDirections) {
                // Case: Directions DISABLED
                const dialogueText = segments
                    .filter(s => !s.isDirection)
                    .map(s => s.text)
                    .join("")
                    .trim();

                if (dialogueText.length > 0) {
                    requests.push({
                        text: dialogueText,
                        character: line.character, // Character speaks
                        lineIndex: index,
                        sourceType,
                        sourceId,
                        troupeId,
                        isDirection: false
                    });
                }
            } else {
                // Case: Directions ENABLED
                for (const segment of segments) {
                    if (!segment.text.trim()) continue;

                    if (segment.isDirection) {
                        const cleanText = segment.text.replace(/^\s*\(|\)\s*$/g, "").trim();
                        if (cleanText) {
                            requests.push({
                                text: cleanText,
                                character: "didascalies", // Narrator speaks directions
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

        // 2. Trigger fetches for missing cache entries
        requests.forEach(req => {
            const key = this.getCacheKey(req);
            if (!this.cache.has(key)) {
                // console.log(`[AudioQueue] Preloading: ${req.text.substring(0, 20)}...`);
                const promise = this.fetchAudio(req);
                this.cache.set(key, promise);
            }
        });

        // 3. Cleanup Cache (Simple LRU approximation: delete first keys)
        if (this.cache.size > this.maxCacheSize) {
            const keysToDelete = Array.from(this.cache.keys()).slice(0, this.cache.size - this.maxCacheSize);
            keysToDelete.forEach(k => this.cache.delete(k));
        }
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
        isDirection: boolean = false
    ): Promise<string | null> {
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
