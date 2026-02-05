import { ScriptLine } from "@/lib/types";

interface PlaybackItem {
    audioUrl: string;
    text: string;
    character: string;
    lineIndex: number;
}

export class GaplessAudioPlayer {
    private audioContext: AudioContext | null = null;
    private nextStartTime: number = 0;
    private isPlaying: boolean = false;
    private bufferCache: Map<string, AudioBuffer> = new Map();

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
    public async resume() {
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
     * Preload and Decode audio data with retry logic
     */
    public async loadAudio(url: string, retryCount: number = 2): Promise<AudioBuffer | null> {
        if (this.bufferCache.has(url)) return this.bufferCache.get(url)!;

        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
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
                const isLastAttempt = attempt === retryCount;
                if (isLastAttempt) {
                    console.error(`[GaplessPlayer] Load failed after ${retryCount + 1} attempts:`, e);
                    return null;
                } else {
                    console.warn(`[GaplessPlayer] Load attempt ${attempt + 1} failed, retrying...`, e);
                    // Brief delay before retry
                    await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                }
            }
        }
        return null;
    }

    /**
     * Play a sequence of items with smart timing
     */
    public async playSequence(items: PlaybackItem[], onStart?: (index: number) => void): Promise<void> {
        if (!this.audioContext) return;
        await this.resume();

        this.nextStartTime = this.audioContext.currentTime + 0.1; // Start slightly in future

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const buffer = await this.loadAudio(item.audioUrl);

            if (!buffer) continue;

            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);

            // Schedule
            const playTime = this.nextStartTime;
            source.start(playTime);

            // Schedule callback precisely
            // We use setTimeout for UI updates, adjusted for the time difference
            const timeUntilPlay = (playTime - this.audioContext.currentTime) * 1000;
            if (onStart && timeUntilPlay > 0) {
                setTimeout(() => onStart(item.lineIndex), timeUntilPlay);
            } else if (onStart) {
                onStart(item.lineIndex);
            }

            // Calculate duration and next start time
            const duration = buffer.duration;

            // Determine pacing for NEXT line
            const pacingDelay = this.calculateSmartDelay(item.text);

            // Logic: EndTime - Overlap + Pacing
            // If modulation is negative (overlap), it speeds up. If positive (pacing), it slows down.
            // We want snappy dialogue, so we default to overlap (-150ms) unless there is punctuation requiring a pause.

            // Effective Gap = Pacing - Overlap
            // Example: "Hello." (0.2s pacing) -> 0.2 - 0.15 = +0.05s gap (Tiny pause)
            // Example: "Go!" (0.1s pacing) -> 0.1 - 0.15 = -0.05s overlap (Crossfade)

            const effectiveGap = pacingDelay - this.overlapDuration;
            this.nextStartTime = playTime + duration + effectiveGap;
        }
    }

    public stop() {
        if (this.audioContext) {
            this.audioContext.close().then(() => {
                this.audioContext = new AudioContext();
            });
        }
        this.bufferCache.clear();
    }
}
