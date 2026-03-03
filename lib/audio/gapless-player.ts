import { ScriptLine } from "@/lib/types";

export class RehearsalAudioEngine {
    private audioContext: AudioContext | null = null;
    private nextStartTime: number = 0;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private activeSources: Set<AudioBufferSourceNode> = new Set();
    private abortController: AbortController | null = null;

    // Configuration
    private overlapDuration: number = 0.150; // 150ms overlap (tuilage)
    private baseDelay: number = 0.050; // 50ms default gap

    constructor() {
        if (typeof window !== "undefined") {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContext();
            }
        }
    }

    /**
     * Resume context (needed for browser autoplay policies)
     */
    private async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Calculate smart delay based on previous line's punctuation
     */
    private calculateSmartDelay(previousText: string): number {
        const trimmed = previousText.trim();

        if (trimmed.endsWith('...')) return 0.6; // Hésitation -> Pause longue
        if (trimmed.endsWith('?')) return 0.4;   // Question -> Attente réponse
        if (trimmed.endsWith('!')) return 0.1;   // Exclamation -> Rapide
        if (trimmed.endsWith('.')) return 0.2;   // Point standard
        if (trimmed.endsWith(',')) return 0.1;   // Virgule (si coupure en segments)

        return this.baseDelay; // Défaut "Tac au tac"
    }

    /**
     * Preload and Decode audio data with retry logic and fallback URLs
     */
    public async loadAudio(urlOrUrls: string | string[], retryCount: number = 2): Promise<AudioBuffer | null> {
        const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];

        for (const url of urls) {
            if (this.bufferCache.has(url)) return this.bufferCache.get(url)!;

            for (let attempt = 0; attempt <= retryCount; attempt++) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        // Supabase Storage returns HTTP 400 for Not Found in some cases
                        if (response.status === 404 || response.status === 400) throw new Error("404");
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const arrayBuffer = await response.arrayBuffer();
                    if (!this.audioContext) return null;
                    if (arrayBuffer.byteLength === 0) {
                        throw new Error("Empty audio buffer received");
                    }

                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.bufferCache.set(url, audioBuffer);
                    return audioBuffer;
                } catch (e) {
                    if (e instanceof Error && e.message === "404") {
                        break; // Stop retrying this URL instantly, move to next fallback
                    }
                    const isLastAttempt = attempt === retryCount;
                    if (isLastAttempt) {
                        console.error(`[RehearsalAudioEngine] Load failed for ${url} after ${retryCount + 1} attempts:`, e);
                    } else {
                        console.warn(`[RehearsalAudioEngine] Load attempt ${attempt + 1} for ${url} failed, retrying...`, e);
                        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                    }
                }
            }
        }
        return null;
    }

    public async preloadBuffers(urlsList: (string | string[])[]): Promise<void> {
        await Promise.all(urlsList.map(urls => this.loadAudio(urls)));
    }

    /**
     * Play a sequence of segments gaplessly.
     * @returns A promise that resolves when the ENTIRE sequence is finished (or aborts).
     */
    public async playSegments(segmentsUrls: (string | string[])[], previousText: string = "", playbackRate: number = 1.0, signal?: AbortSignal): Promise<void> {
        if (!this.audioContext) return;
        await this.resume();

        // If context was stopped earlier, reset current time
        if (this.nextStartTime < this.audioContext.currentTime) {
            this.nextStartTime = this.audioContext.currentTime + 0.05;
        }

        return new Promise(async (resolve, reject) => {
            const cleanup = () => {
                if (signal) {
                    signal.removeEventListener('abort', onAbort);
                }
            };

            const onAbort = () => {
                cleanup();
                this.stop(); // Stops playing sources instantly
                reject(new Error("Playback aborted"));
            };

            if (signal) {
                if (signal.aborted) return onAbort();
                signal.addEventListener('abort', onAbort);
            }

            let loadedSources = 0;
            let lastSourceNode: AudioBufferSourceNode | null = null;

            // Si on enchaîne depuis une phrase précédente avec ponctuation
            if (previousText && this.activeSources.size > 0) {
                const pacingDelay = this.calculateSmartDelay(previousText);
                const effectiveGap = pacingDelay - this.overlapDuration;
                this.nextStartTime += effectiveGap;
            } else {
                this.nextStartTime = this.audioContext!.currentTime + 0.05; // Fresh start
            }

            for (let i = 0; i < segmentsUrls.length; i++) {
                if (signal?.aborted) return; // Exit loop if aborted during load

                const segmentUrls = segmentsUrls[i];
                const buffer = await this.loadAudio(segmentUrls);
                if (!buffer) continue;

                if (signal?.aborted) return;

                const source = this.audioContext!.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = Math.max(0.7, Math.min(1.8, playbackRate));
                source.connect(this.audioContext!.destination);

                this.activeSources.add(source);

                // Cleanup source map when it ends naturally
                source.onended = () => {
                    this.activeSources.delete(source);
                    loadedSources--;
                    if (loadedSources === 0 && !signal?.aborted) {
                        cleanup();
                        resolve();
                    }
                };

                const playTime = this.nextStartTime;
                source.start(playTime);
                lastSourceNode = source;
                loadedSources++;

                // Duration must be adjusted by playbackRate for scheduling the next segment
                const adjustedDuration = buffer.duration / source.playbackRate.value;

                // For segments IN THE SAME LINE, we overlap them to join sentences flawlessly
                // (Stage directions vs Dialogue usually have no gap in natural speech)
                this.nextStartTime = playTime + adjustedDuration - this.overlapDuration;
            }

            // If no valid buffers loaded, resolve immediately
            if (loadedSources === 0 && !signal?.aborted) {
                cleanup();
                resolve();
            }
        });
    }

    public stop() {
        // Stop all actively playing sources immediately
        this.activeSources.forEach(source => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        this.activeSources.clear();

        // Reset timing so next play starts fresh
        if (this.audioContext) {
            this.nextStartTime = this.audioContext.currentTime;
        }
    }

    public clearCache() {
        this.bufferCache.clear();
    }
}
