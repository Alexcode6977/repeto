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
    onSpeak: (text: string, isDirection: boolean) => Promise<void>
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
            await onSpeak(dialogueText, false);
        }
        return;
    }

    // Case 2: Stage Directions ENABLED
    // We play everything sequentially, preserving the order
    for (const segment of segments) {
        if (!segment.text.trim()) continue;

        if (segment.isDirection) {
            // Remove parentheses for the TTS engine so it doesn't say "Parenthesis..."
            // " (Il sort) " -> "Il sort"
            const cleanText = segment.text
                .replace(/^\s*\(|\)\s*$/g, "") // Remove outer parens
                .trim();

            if (cleanText) {
                // We pass isDirection = true so the caller knows to use the Narrator voice
                await onSpeak(cleanText, true);
            }
        } else {
            // Dialogue
            if (segment.text.trim()) {
                await onSpeak(segment.text, false);
            }
        }
    }
}
