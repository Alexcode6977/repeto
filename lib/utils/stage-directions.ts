/**
 * Utility functions for handling stage directions (didascalies) in scripts
 */

import { ScriptLine } from "@/lib/types";

/**
 * Remove stage directions (text in parentheses) from a string
 * @param text The text containing potential stage directions
 * @returns The text with stage directions removed
 */
export function removeStageDirections(text: string): string {
    // Remove all text between parentheses (stage directions)
    // Also trim any extra whitespace left behind
    return text.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Filter script lines to show or hide stage directions
 * @param lines Array of script lines
 * @param showStageDirections Whether to show stage directions
 * @returns Filtered array of script lines
 */
export function filterScriptLines(
    lines: ScriptLine[],
    showStageDirections: boolean
): ScriptLine[] {
    if (showStageDirections) {
        return lines;
    }

    return lines
        .filter(line => {
            // If hiding directions, skip standalone stage direction lines
            if (!showStageDirections && line.type === 'stage_direction') {
                return false;
            }
            return true;
        })
        .map(line => ({
            ...line,
            text: line.type === 'dialogue'
                ? removeStageDirections(line.text)
                : line.text
        }));
}

/**
 * Check if a text contains stage directions
 * @param text The text to check
 * @returns True if the text contains parentheses (likely stage directions)
 */
export function hasStageDirections(text: string): boolean {
    return /\([^)]*\)/.test(text);
}

export interface TextSegment {
    text: string;
    isDirection: boolean;
}

/**
 * Parse a text into alternating segments of dialogue and stage directions
 * Used for selective highlighting (highlight dialogue in yellow, keep directions strictly transparent/italic)
 */
export function parseSegments(text: string): TextSegment[] {
    if (!text) return [];

    // Split by parentheses, capturing the delimiters
    // Improved regex to handle nested parens or multiple ones better, though simple is usually enough for scripts
    const parts = text.split(/(\(.*?\))/g);

    return parts
        .filter(part => part !== "") // Keep whitespace segments for correct joining
        .map(part => {
            const trimmed = part.trim();
            // A segment is a direction if it's wrapped in parentheses
            const isDirection = trimmed.startsWith("(") && trimmed.endsWith(")");
            return {
                text: part,
                isDirection
            };
        });
}
