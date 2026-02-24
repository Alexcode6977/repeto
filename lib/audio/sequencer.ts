import { ScriptLine } from "@/lib/types";
import { parseSegments } from "@/lib/utils/stage-directions";

/**
 * Orchestrates the sequential playback of a script line, handling stage directions.
 * 
 * @param line The script line to play
 * @param showDirections Whether stage directions should be spoken (if true, uses mixed voices)
 * @param onSpeak Callback to execute the actual TTS. Returns a Promise that resolves when speaking finishes.
 */
export async function playLineSequentially(
    line: ScriptLine,
    showDirections: boolean,
    onSpeak: (text: string, isDirection: boolean, segmentIndex: number) => Promise<void>
): Promise<void> {
    const segments = parseSegments(line.text);

    // Case 1: Stage Directions DISABLED
    // We strictly filter them out and play only dialogue segments joined together
    // This creates a smoother experience than playing dialogue segments one by one with gaps.
    if (!showDirections) {
        const dialogueText = segments
            .filter(s => !s.isDirection)
            .map(s => s.text)
            .join("") // Join with empty string because parseSegments retains spaces in segments
            .trim();

        if (dialogueText.length > 0) {
            // If we hid directions, we treat the remaining combined text as segment 0 because the backend UI mapping depends on original segments...
            // Wait, actually the backend generated segment 0, 1, 2. If we merge them, the cached files won't match.
            // But we must stick to the signature. We'll pass 0.
            await onSpeak(dialogueText, false, 0);
        }
        return;
    }

    // Case 2: Stage Directions ENABLED
    // We play everything sequentially, preserving the order
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment.text.trim()) continue;

        if (segment.isDirection) {
            // Remove parentheses for the TTS engine so it doesn't say "Parenthesis..."
            // " (Il sort) " -> "Il sort"
            const cleanText = segment.text
                .replace(/^\s*\(|\)\s*$/g, "") // Remove outer parens
                .trim();

            if (cleanText) {
                // We pass isDirection = true so the caller knows to use the Narrator voice
                await onSpeak(cleanText, true, i);
            }
        } else {
            // Dialogue
            if (segment.text.trim()) {
                await onSpeak(segment.text, false, i);
            }
        }
    }
}
