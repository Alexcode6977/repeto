/**
 * Utility for parsing JSON from AI responses that might contain markdown blocks,
 * trailing commas, or other common formatting errors.
 */

export function cleanAndParseJSON<T>(payload: string): T {
    let cleaned = payload.trim();
    if (!cleaned) return {} as T;

    // Remove markdown code blocks if present
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/i, "");
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "");
    }

    if (cleaned.endsWith("```")) {
        cleaned = cleaned.replace(/\s*```$/, "");
    }

    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned) as T;
    } catch (e) {
        // Advanced fallback: try to extract just the JSON object from the string
        // This stops trailing text from ruining the parse
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");

        const firstBracket = cleaned.indexOf("[");
        const lastBracket = cleaned.lastIndexOf("]");

        let start = -1;
        let end = -1;

        if (firstBrace >= 0 && lastBrace > firstBrace && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace;
            end = lastBrace;
        } else if (firstBracket >= 0 && lastBracket > firstBracket) {
            start = firstBracket;
            end = lastBracket;
        }

        if (start >= 0 && end > start) {
            const sliced = cleaned.slice(start, end + 1);
            try {
                // Also attempt to fix trailing commas before parsing
                const noTrailingCommas = sliced.replace(/,\s*([}\]])/g, '$1');
                return JSON.parse(noTrailingCommas) as T;
            } catch (innerError) {
                console.error("Failed to parse even after slicing and cleaning:", innerError);
            }
        }

        throw new Error("Impossible de parser le JSON depuis la réponse de l'IA");
    }
}
