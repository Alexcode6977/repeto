import { ScriptLine, ParsedScript, ScriptScene } from "./types";

/**
 * Heuristic parser for theater scripts.
 * Tries to identify Character formatted lines vs Dialogue lines.
 */
export function parseScript(rawText: string): ParsedScript {
    // Clean up tabs and excessive spaces
    const cleanText = rawText.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = cleanText.split(/\r?\n/);

    const scriptLines: ScriptLine[] = [];
    const scenes: ScriptScene[] = [];
    const characters = new Set<string>();

    let currentCharacter = "";
    let currentBuffer = "";
    let idCounter = 0;

    // Regex patterns
    // Pattern 1: "ROMÉO :" or "ROMÉO." or "ROMÉO," at start of line
    // Allow hyphens, apostrophes (e.g. JEAN-CLAUDE, D'ANNETTE)
    const characterPrefixRegex = /^([A-ZÀ-ÖØ-Þ\s\-\']{3,})[:\.,]\s*(.*)/;

    // Pattern 2: Uppercase line that looks like a name (short-ish)
    // Allow optional trailing punctuation (e.g. "YVONNE," or "LUCIEN.") and leading/trailing whitespace
    const characterLineRegex = /^\s*([A-ZÀ-ÖØ-Þ\s\-\']{3,})[,.]?\s*$/;

    const IGNORED_NAMES = [
        "RIDEAU", "FIN",
        "PERSONNAGES", "DISTRIBUTION", "VAUDEVILLE", "COMÉDIE", "DRAME",
        "ON PURGE BÉBÉ", // Specific title
        "FEU LA MERE DE MADAME", "FEU LA MÈRE DE MADAME", // New title
        "REPRÉSENTÉE", "THÉÂTRE", "PARIS",
        "PUIS", "LES MEMES", "LES MÊMES", "TOUS", "TOUT",
        "OUI", "NON", "AH", "OH", "EH", "BON", "BIEN" // Interjections safety
    ];


    let lastSpeakers: string[] = []; // Track recently active speakers

    lines.forEach((originalLine) => {
        // Aggressive cleanup: remove ANY text inside parentheses (residuals) and normalize spaces
        let line = originalLine.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();

        if (!line) return; // Skip empty lines after cleanup
        if (line.match(/^\d+$/)) return; // Ignore page numbers

        // Check for Scene Header (SCENE I, ACTE II, TABLEAU 3, SCENE PREMIERE)
        const sceneMatch = line.match(/^(?:SCÈNE|SCENE|ACTE|TABLEAU)\s+(?:[IVX0-9]+|PREMIERE|PREMIÈRE)/i);
        if (sceneMatch) {
            scriptLines.push({
                id: String(idCounter++),
                character: "SCENE",
                text: line,
                type: "scene_heading",
            });
            scenes.push({
                index: scriptLines.length - 1,
                title: line
            });
            currentCharacter = ""; // Reset context
            currentBuffer = "";
            return;
        }

        let potentialName = "";
        let potentialDialogue = "";
        let isCharacterMatch = false;

        // Check for Character Pattern 1 (Name: Text)
        const prefixMatch = line.match(characterPrefixRegex);
        if (prefixMatch) {
            potentialName = prefixMatch[1].trim();
            const afterName = prefixMatch[2].trim();

            // Heuristic: If text after name starts with Lowercase, it is likely a DIDASCALIE (Stage Direction).
            // e.g. "YVONNE, couchée." -> "couchée." is direction.
            // e.g. "LUCIEN, entrant." -> "entrant." is direction.
            // e.g. "YVONNE, C'est moi." -> "C'est moi." is dialogue (Uppercase).
            if (afterName && /^[a-zà-öø-þ]/.test(afterName)) {
                // It's a stage direction. We ignore it for the dialogue buffer.
                // Ideally we could store it as type='stage_direction' but for now we just don't add it to speech.
                potentialDialogue = "";
            } else {
                potentialDialogue = afterName;
            }

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
                return;
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
                    // 1. Remove "VOIX" prefix
                    finalCharacterName = finalCharacterName.replace(/^VOIX\s+/i, "");

                    // 2. Normalize complexity (e.g. "EXCEDEE 'ANNETTE" -> "ANNETTE")
                    // Look for separators: DE, DU, DES, D', '
                    // We match lazily to find the FIRST separator sequence (preserving "VALET DE CHAMBRE")
                    const separatorMatch = finalCharacterName.match(/^.*?(?:DE\s+|DU\s+|DES\s+|D'|')\s*(.*)$/i);
                    if (separatorMatch && separatorMatch[1].trim()) {
                        finalCharacterName = separatorMatch[1].trim();
                    }
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
                return;
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
    });

    // Push final buffer
    if (currentCharacter && currentBuffer) {
        scriptLines.push({
            id: String(idCounter++),
            character: currentCharacter,
            text: currentBuffer.trim(),
            type: "dialogue",
        });
    }


    // --- POST-PROCESSING: Fuzzy Merging ---

    // 1. Count occurrences
    const counts: Record<string, number> = {};
    scriptLines.forEach(line => {
        counts[line.character] = (counts[line.character] || 0) + 1;
    });

    // 2. Identify primary characters (e.g. appeared more than once? or just sort by freq)
    const sortedChars = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

    // Map to redirect merged chars
    const redirectMap: Record<string, string> = {};

    // Helper calculate similarity (Levenshtein based, simplified version of the lib one)
    // We can't easily import from lib/similarity inside this purely logic file if it causes issues?
    // Actually we can, but let's inline a simple one or assume import is fine. 
    // Let's implement a simple dist here to be safe and self-contained or import if we added it at top.
    // I will use a simple inline Levenshtein for 2 strings.
    const levenshtein = (s1: string, s2: string) => {
        const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
        for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
        for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + indicator);
            }
        }
        return track[s2.length][s1.length];
    };

    // 3. Merge Loop
    for (let i = 0; i < sortedChars.length; i++) {
        const primary = sortedChars[i];
        if (redirectMap[primary]) continue; // Already merged into something else

        for (let j = i + 1; j < sortedChars.length; j++) {
            const candidate = sortedChars[j];
            if (redirectMap[candidate]) continue;

            // Don't merge collective/combined chars automatically
            if (primary.includes(" et ") || candidate.includes(" et ")) continue;

            const dist = levenshtein(primary, candidate);
            const maxLength = Math.max(primary.length, candidate.length);
            const similarity = 1.0 - (dist / maxLength);

            // Merge if:
            // - Very similar (> 0.85) e.g. ANNETTE vs ANETTE (raised threshold slightly)
            // - OR candidate matches "DE [PRIMARY]" pattern specifically

            const isDePrefix = candidate.match(new RegExp(`^(?:VOIX )?(?:DE |D'|DU )${primary}$`));

            if (similarity > 0.85 || isDePrefix) {
                // Merge candidate into primary
                redirectMap[candidate] = primary;
            }
        }
    }

    // 4. Remap Lines and Rebuild Set
    const finalCharacters = new Set<string>();

    scriptLines.forEach(line => {
        if (redirectMap[line.character]) {
            line.character = redirectMap[line.character];
        }
        finalCharacters.add(line.character);
    });

    // Filter final character list for the UI
    const filteredCharacters = Array.from(finalCharacters).filter(c => {
        // Exclude internal types or combined characters
        if (c === "SCENE") return false;
        if (c.includes(" et ") || c.includes(" ET ")) return false;
        return true;
    }).sort();

    return {
        lines: scriptLines,
        characters: filteredCharacters,
        scenes,
    };
}
