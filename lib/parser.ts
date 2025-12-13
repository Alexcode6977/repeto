import { ScriptLine, ParsedScript } from "./types";

/**
 * Heuristic parser for theater scripts.
 * Tries to identify Character formatted lines vs Dialogue lines.
 */
export function parseScript(rawText: string): ParsedScript {
    // Clean up tabs and excessive spaces
    const cleanText = rawText.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = cleanText.split(/\r?\n/);

    const scriptLines: ScriptLine[] = [];
    const characters = new Set<string>();

    let currentCharacter = "";
    let currentBuffer = "";
    let idCounter = 0;

    // Regex patterns
    // Pattern 1: "ROMÉO :" or "ROMÉO." at start of line
    // Allow hyphens, apostrophes (e.g. JEAN-CLAUDE, D'ANNETTE)
    const characterPrefixRegex = /^([A-ZÀ-ÖØ-Þ\s\-\']{3,})[:\.]\s*(.*)/;

    // Pattern 2: Uppercase line that looks like a name (short-ish)
    const characterLineRegex = /^([A-ZÀ-ÖØ-Þ\s\-\']{3,})$/;

    const IGNORED_NAMES = [
        "SCÈNE", "ACTE", "RIDEAU", "FIN", "TABLEAU", "SCENE",
        "PERSONNAGES", "DISTRIBUTION", "VAUDEVILLE", "COMÉDIE", "DRAME",
        "ON PURGE BÉBÉ", // Specific title
        "REPRÉSENTÉE", "THÉÂTRE", "PARIS",
        "PUIS", "LES MEMES", "LES MÊMES", "TOUS", "TOUT"
    ];


    let lastSpeakers: string[] = []; // Track recently active speakers

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.match(/^\d+$/)) continue; // Ignore page numbers

        let potentialName = "";
        let potentialDialogue = "";
        let isCharacterMatch = false;

        // Check for Character Pattern 1 (Name: Text)
        const prefixMatch = line.match(characterPrefixRegex);
        if (prefixMatch) {
            potentialName = prefixMatch[1].trim();
            potentialDialogue = prefixMatch[2];

            // Heuristic: Characters usually have short names.
            if (potentialName.length < 30) {
                isCharacterMatch = true;
            }
        } else {
            // Check for Character Pattern 2 (Name on its own line)
            const nameMatch = line.match(characterLineRegex);
            if (nameMatch) {
                potentialName = nameMatch[1].trim();
                // Heuristic check
                if (potentialName.length < 30 && potentialName.length > 2) {
                    isCharacterMatch = true;
                }
            }
        }

        if (isCharacterMatch) {
            // Filter out non-character uppercase words
            const upperName = potentialName.toUpperCase();
            const isIgnored = IGNORED_NAMES.some(ignored => upperName.includes(ignored));

            // If it's explicitly ignored, we assume it is a stage direction or metadata.
            // We should SKIP it entirely, not treat it as dialogue.
            if (isIgnored) {
                continue;
            }

            // Special Handling for "TOUS LES DEUX" / "LES DEUX" / "ENSEMBLE"
            const isCollective = ["TOUS LES DEUX", "LES DEUX", "ENSEMBLE"].some(k => upperName.includes(k));

            if (!isIgnored || isCollective) { // Redundant check but safe
                // Determine the character name
                let finalCharacterName = potentialName;

                // Normalize Voices: 
                // "VOIX DE LUCIEN" -> "LUCIEN"
                // "VOIX 'ANNETTE" -> "ANNETTE"
                // "VOIX EXCEDEE 'ANNETTE" -> "ANNETTE"
                // Logic: Remove "VOIX", then remove any sequence of uppercase words/adjectives/prepositions until we hit the name?
                // Or simply: If it starts with VOIX, take the LAST meaningful word/group? 
                // Dangerous for "JEAN PIERRE".
                // Better regex: Strip "VOIX" then any non-name separators/adjectives? 
                // Let's try to match the pattern: VOIX [spaces] [words] [separator like ' DE DU] [NAME]

                if (finalCharacterName.toUpperCase().startsWith("VOIX")) {
                    // Remove "VOIX" prefix
                    let clean = finalCharacterName.replace(/^VOIX\s+/i, "");
                    // Remove common prepositions/adjectives if they don't look like part of the name
                    // "EXCEDEE" seems like an adjective. "DE" is prep. 
                    // Loop: while starts with known prep or adjective-looking thing? Hard.
                    // Try: Strip everything before the last apostrophe or "DE"?
                    // "VOIX 'ANNETTE" -> strip "VOIX '"
                    // "VOIX EXCEDEE 'ANNETTE" -> strip "VOIX EXCEDEE '"

                    // Regex: Remove "VOIX" + optional words + [space/'/DE/DU/DES]
                    // We assume the Name is the Main Entity at the end or distinct.
                    // Valid name chars: [A-ZÀ-ÖØ-Þ\-]
                    // Trash chars: [SPACE] ['] [other letters]

                    // Let's try: Replace "VOIX ... (DE|'| )" with empty?
                    // Aggressive: `^VOIX.*?(?:DE|DU|DES|D'|'|\s)\s*(?=[A-ZÀ-ÖØ-Þ])`
                    // Matches VOIX followed by anything non-greedy, ending with a separator, looking ahead for a Name char.
                    finalCharacterName = finalCharacterName.replace(/^VOIX.*?(?:DE|DU|DES|D'|'|\s)\s*(?=[A-ZÀ-ÖØ-Þ])/i, "");
                }

                if (isCollective && lastSpeakers.length >= 2) {
                    // Combine the last 2 unique speakers
                    const distinct = Array.from(new Set(lastSpeakers)).slice(-2);
                    if (distinct.length === 2) {
                        finalCharacterName = `${distinct[0]} et ${distinct[1]}`;
                    }
                }

                // If we had a previous character speaking, push their buffer
                if (currentCharacter && currentBuffer) {
                    scriptLines.push({
                        id: String(idCounter++),
                        character: currentCharacter,
                        text: currentBuffer.trim(),
                        type: "dialogue",
                    });
                    currentBuffer = "";
                }

                currentCharacter = finalCharacterName;
                characters.add(currentCharacter);

                // Update history if it's a real single character
                if (!isCollective && !finalCharacterName.includes(" et ")) {
                    lastSpeakers.push(finalCharacterName);
                    if (lastSpeakers.length > 5) lastSpeakers.shift(); // keep history small
                }

                if (potentialDialogue) {
                    currentBuffer = potentialDialogue;
                }
                continue;
            }
        }

        // Otherwise, treat as continuation of dialogue
        if (currentCharacter) {
            if (currentBuffer) {
                currentBuffer += " " + line;
            } else {
                currentBuffer = line;
            }
        }
    }

    // Push final buffer
    if (currentCharacter && currentBuffer) {
        scriptLines.push({
            id: String(idCounter++),
            character: currentCharacter,
            text: currentBuffer.trim(),
            type: "dialogue",
        });
    }

    // Filter final character list for the UI
    const filteredCharacters = Array.from(characters).filter(c => {
        // Exclude combined characters (contain " et " or " ET ")
        if (c.includes(" et ") || c.includes(" ET ")) return false;
        // Exclude "VOIX DE" prefix if we want to be strict, or keep them? 
        // User asked to clean up. Let's keep specific voices but maybe exclude 'VOIX' if generic? 
        // Actually, "VOIX DE LUCIEN" is a valid role distinct from "LUCIEN"? 
        // User said "VOIX DE LUCIEN" appeared. Maybe we should map it to "LUCIEN"?
        // For now, let's just filter clearly combined ones and stage directions.
        return true;
    }).sort();

    return {
        lines: scriptLines,
        characters: filteredCharacters,
    };
}
