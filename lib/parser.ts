import { ScriptLine, ParsedScript, ScriptScene } from "./types";
import { COLLECTIVE_ROLES } from "./constants";

/**
 * MASTERCLASS PARSER v2.0
 * ========================
 * A bulletproof theater script parser that works with ANY French play.
 * 
 * Key innovations:
 * 1. Multi-layer filtering (lexical, syntactic, statistical)
 * 2. Confidence scoring for character detection
 * 3. Post-processing validation with frequency analysis
 * 4. Smart title extraction
 */

// ============================================================================
// CONFIGURATION - Easy to tune without changing logic
// ============================================================================

const CONFIG = {
    // Minimum lines a character must speak to be considered real
    MIN_LINES_THRESHOLD: 2,

    // Maximum length for a character name (in characters)
    MAX_NAME_LENGTH: 35,

    // Minimum length for a character name
    MIN_NAME_LENGTH: 2,

    // Maximum number of words in a character name
    MAX_NAME_WORDS: 4,

    // Similarity threshold for merging similar names
    MERGE_SIMILARITY_THRESHOLD: 0.80,
};

// ============================================================================
// BLACKLISTS - Generic patterns that apply to ALL French theater
// ============================================================================

// Single words that NEVER appear alone as character names
const FORBIDDEN_SINGLE_WORDS = new Set([
    // Structural
    "ACTE", "SCÈNE", "SCENE", "TABLEAU", "FIN", "RIDEAU", "DÉCOR", "DECOR",
    "PERSONNAGES", "DISTRIBUTION", "DÉCORS", "COSTUMES",

    // Genre
    "COMÉDIE", "COMEDIE", "DRAME", "TRAGÉDIE", "TRAGEDIE", "VAUDEVILLE", "OPÉRA", "OPERA",
    "FARCE", "PIÈCE", "PIECE", "BALLET", "INTERMÈDE", "PROLOGUE", "ÉPILOGUE",

    // Ordinals (any language form)
    "PREMIER", "PREMIÈRE", "PREMIERE", "SECOND", "SECONDE", "DEUXIÈME", "DEUXIEME",
    "TROISIÈME", "TROISIEME", "QUATRIÈME", "QUATRIEME", "CINQUIÈME", "CINQUIEME",
    "SIXIÈME", "SIXIEME", "SEPTIÈME", "SEPTIEME", "HUITIÈME", "HUITIEME",
    "NEUVIÈME", "NEUVIEME", "DIXIÈME", "DIXIEME", "DERNIER", "DERNIÈRE", "DERNIERE",

    // Numbers
    "UN", "UNE", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF", "DIX",

    // Quantifiers
    "PLUSIEURS", "QUELQUES", "TOUS", "TOUTES", "TOUT", "AUTRE", "AUTRES",
    "CERTAIN", "CERTAINS", "CERTAINE", "CERTAINES", "MÊME", "MEME", "MÊMES", "MEMES",

    // Articles/Prepositions that shouldn't stand alone
    "LE", "LA", "LES", "DE", "DU", "DES", "AU", "AUX", "EN", "ET",

    // Music/Dance terms
    "ENTRÉE", "ENTREE", "MENUET", "CHANSON", "DANSE", "AIR", "ARIETTE", "CHOEUR", "CHŒUR",
    "OUVERTURE", "RÉCIT", "RECIT", "DIVERTISSEMENT", "RITOURNELLE",

    // Common non-character words
    "ENSEMBLE", "VOIX", "DIALOGUE", "MONOLOGUE", "APARTÉ", "APARTE",
    "PUIS", "SEUL", "SEULE", "SEULS", "SEULES",

    // Common interjections and dialogue start words (noise)
    "OUI", "NON", "AH", "OH", "EH", "HÉ", "HE", "BON", "BIEN", "QUOI", "COMMENT",
    "VOILÀ", "VOILA", "TIENS", "TIEN", "TIENS-TOI", "ALLONS", "ALORS", "RIEN", "CHUT",
    "VOYONS", "ÉCOUTE", "ECOUTE", "ÉCOUTEZ", "ECOUTEZ", "REGARDE", "REGARDEZ",
    "ATTENDS", "ATTENDEZ", "DIS", "DITES", "DIS-DONC", "DITES-DONC", "DITES-MOI",
    "ENTENDU", "PARFAIT", "EXCELLENT", "D'ACCORD", "MERCI", "PARDON", "STOP",
    "VITE", "VRAIMENT", "PEUT-ÊTRE", "PEUT-ETRE", "MALHEUREUSEMENT", "HEUREUSEMENT",
    "ÉVIDEMMENT", "EVIDEMMENT", "SÛREMENT", "SUREMENT", "PAREIL", "PAREILLE",
    "MOI", "TOI", "LUI", "NOUS", "VOUS", "EUX", "ELLES",
    "SI", "AINSI", "MAIS", "DONC", "CAR", "PUISQUE", "PARCE", "QUE", "QUAND",
    "MONSIEUR", "MADAME", "MADEMOISELLE", "MESSIEURS", "MESDAMES", "MESDEMOISELLES",
    "PÈRE", "MÈRE", "FRÈRE", "SOEUR", "SŒUR", "FILS", "FILLE",
    "BONJOUR", "BONSOIR", "ADIEU", "SALUT", "BORDEAUX", "MERCI", "PERMETTEZ",

    // Structural (Restored)
    "RIDEAU", "NOIR", "LUMIÈRE", "LUMIERE", "SILENCE", "PAUSE", "TEMPS",
    "PARIS", "FRANCE", "THÉÂTRE", "THEATRE", "SALON", "CHAMBRE", "JARDIN",
    "GENTILHOMME", "BOURGEOIS", "BABILLARD", "BABILLARDE", "VIEILLE", "VIEUX",
]);


// Multi-word patterns that indicate NON-character names (regex)
const FORBIDDEN_PATTERNS: RegExp[] = [
    // NOTE: We do NOT block "LE/LES + NOUN" generically because:
    // - "LE MUFTI", "LES TURCS", "LE MAÎTRE" are valid characters
    // Only block specific problematic patterns

    // Starts with ordinal
    /^(PREMIER|PREMIÈRE|PREMIERE|SECOND|SECONDE|DEUXIÈME|TROISIÈME|QUATRIÈME)\s+/i,

    // Starts with number word
    /^(DEUX|TROIS|QUATRE|CINQ|SIX)\s+/i,

    // Starts with quantifier (but NOT for collective characters like "LES TURCS")
    // Note: "AUTRE" removed - "AUTRE GASCON" is a valid character
    /^(PLUSIEURS|QUELQUES)\s+/i,

    // Contains digits
    /\d/,

    // Very short with apostrophe (truncated)
    /^L'[A-ZÀ-Þ]{1,2}$/i,

    // Ends with music/dance term ("PREMIÈRE ENTRÉE")
    /(ENTRÉE|ENTREE|CHANSON|MENUET|DANSE|MUSIQUE|BALLET|AIR)$/i,

    // Starts with preposition phrase
    /^(EN|À|AU|AUX|DE|DU|DES|POUR|AVEC|SANS|CHEZ)\s+/i,

    // "FAIT" + anything (stage direction)
    /^FAIT[ES]?\s+/i,

    // Metadata patterns
    /REPRÉSENT/i,
    /SCÈNE|SCENE/i,

    // Descriptive character patterns (ballet intermèdes)
    /BOURGEOIS.*BABILLARD/i,
    /BOURGEOISE.*BABILLARDE/i,

    // Too generic single-word patterns    
    // Group detection (LES FILLES, DES HOMMES)
    /^(LES|DES|UN|UNE|LE|LA)\s+(FILLES|HOMMES|FEMMES|GARÇONS|GENTILHOMMES|VOIX|CHOEUR|CHŒUR|SOLDATS|GENDARMES|PERSONNES|GENS|SPECTATEURS)/i,

    // Dialogue/Interjection patterns
    /^(MAIS|OUI|NON|ET|ELLES|AINSI|ALORS|PUIS|PUISQUE)\s+[A-ZÀ-Þ]/i,
    /^(JE|TU|IL|ELLE|ON|NOUS|VOUS|ILS|ELLES)\s+/i,
    /^(MON|TON|SON|MA|TA|SA|MES|TES|SES)\s+/i,
    /^[A-ZÀ-Þ]+\s+(ET|OU|MAIS)\s+[A-ZÀ-Þ]/i, // Common sentence starts
];


// Known French playwrights (authors, not characters)
const AUTHORS = new Set([
    "MOLIÈRE", "MOLIERE", "RACINE", "CORNEILLE", "MARIVAUX", "BEAUMARCHAIS",
    "FEYDEAU", "LABICHE", "MUSSET", "HUGO", "ROSTAND", "COURTELINE",
    "SARTRE", "CAMUS", "IONESCO", "BECKETT", "ANOUILH", "GIRAUDOUX",
]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize a character name for comparison
 */
function normalizeName(name: string): string {
    return name
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents for comparison
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(s1: string, s2: string): number {
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i++) track[0][i] = i;
    for (let j = 0; j <= s2.length; j++) track[j][0] = j;
    for (let j = 1; j <= s2.length; j++) {
        for (let i = 1; i <= s1.length; i++) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    return track[s2.length][s1.length];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function similarity(s1: string, s2: string): number {
    const n1 = normalizeName(s1);
    const n2 = normalizeName(s2);
    if (n1 === n2) return 1.0;
    const dist = levenshtein(n1, n2);
    return 1.0 - (dist / Math.max(n1.length, n2.length));
}

/**
 * Check if a potential name is likely a real character name
 * Returns a confidence score from 0 to 1
 */
function scoreCharacterName(name: string): number {
    const upper = name.toUpperCase().trim();
    const normalized = normalizeName(name);

    // === HARD FAILURES (score = 0) ===

    // Too short or too long
    if (upper.length < CONFIG.MIN_NAME_LENGTH || upper.length > CONFIG.MAX_NAME_LENGTH) {
        return 0;
    }

    // Too many words
    const words = upper.split(/\s+/);
    if (words.length > CONFIG.MAX_NAME_WORDS) {
        return 0;
    }

    // Single word in forbidden list
    if (words.length === 1 && FORBIDDEN_SINGLE_WORDS.has(upper)) {
        return 0;
    }

    // Contains a forbidden single word as the FIRST word
    if (words.length > 1 && FORBIDDEN_SINGLE_WORDS.has(words[0])) {
        // Exception: "LE MAÎTRE", "LA COMTESSE", "LES TURCS", "L'ÉLÈVE" etc are valid
        const validArticles = ["LE", "LA", "LES", "L'"];
        const validTitles = ["MONSIEUR", "MADAME", "MADEMOISELLE", "MAÎTRE", "MAITRE", "AUTRE"];
        const firstWord = words[0];

        // Allow if first word is a valid article (LE, LA, LES, L')
        if (validArticles.includes(firstWord) || firstWord.startsWith("L'")) {
            // OK - this is a valid character pattern
        } else if (validTitles.includes(firstWord)) {
            // OK - AUTRE GASCON, MONSIEUR JOURDAIN, etc.
        } else {
            return 0;
        }
    }

    // Is an author
    if (AUTHORS.has(upper)) {
        return 0;
    }

    // Matches forbidden pattern
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(upper)) {
            return 0;
        }
    }

    // === SOFT SCORING ===
    let score = 1.0;

    // Penalty for very long names (likely descriptions)
    if (upper.length > 25) {
        score -= 0.3;
    } else if (upper.length > 20) {
        score -= 0.1;
    }

    // Penalty for many words
    if (words.length > 3) {
        score -= 0.2;
    } else if (words.length > 2) {
        score -= 0.1;
    }

    // Bonus for classic name patterns
    // Single word, 4-15 chars = likely a name
    if (words.length === 1 && upper.length >= 4 && upper.length <= 15) {
        score += 0.1;
    }

    // "MONSIEUR/MADAME X" pattern
    if (/^(MONSIEUR|MADAME|MADEMOISELLE|M\.|MME\.?)\s+\w+/i.test(upper)) {
        score += 0.1;
    }

    // "LE/LA + ROLE" pattern - bonus for classic character patterns
    // This includes MUFTI, TURCS, and other valid roles
    if (/^(LE|LA|L'|LES)\s+/i.test(upper)) {
        score += 0.15;
    }

    return Math.max(0, Math.min(1, score));
}

/**
 * Normalize "VOIX DE X" patterns to just "X"
 */
function extractVoixName(name: string): string {
    let result = name.trim();

    if (result.toUpperCase().startsWith("VOIX")) {
        // Remove "VOIX" prefix
        result = result.replace(/^VOIX\s+/i, "");

        // Try to extract name after DE/DU/D'/etc
        const match = result.match(/(?:DE\s+|DU\s+|D'|')(.+)$/i);
        if (match && match[1].trim().length > 2) {
            result = match[1].trim();
        }
    }

    return result;
}

/**
 * Heuristic to guess character gender from name/titles
 */
function getGender(name: string): 'M' | 'F' | 'unknown' {
    const upper = name.toUpperCase();

    // Explicit titles
    if (/\b(MONSIEUR|M\.|MR|MAÎTRE|MAITRE|PÈRE|PERE|FILS|ROI|COMTE|MARQUIS|VALET)\b/i.test(upper)) return 'M';
    if (/\b(MADAME|MME|MADEMOISELLE|MLLE|MÈRE|MERE|FILLE|REINE|COMTESSE|MARQUISE|SUIVANTE)\b/i.test(upper)) return 'F';

    // Common endings (very weak heuristic for French names but better than nothing)
    if (upper.endsWith('E') && !upper.endsWith('RE') && !upper.endsWith('TE')) {
        // Many female names end in E
        const maleexceptions = ["LUCIEN", "JULIEN", "ADRIEN"]; // Not ending in E
        const femaleexceptions = ["CLÉMENCE", "ALICE", "LUCILE", "AGATHE"]; // Ending in E
        // This is very rough, let's keep it minimal
    }

    return 'unknown';
}

/**
 * Try to extract play title from first lines
 */
function extractTitle(lines: string[]): string | undefined {
    // Look in first 20 lines for something that looks like a title
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const line = lines[i].trim();

        // Skip very short or empty lines
        if (line.length < 5) continue;

        // Skip if it's clearly a character line
        if (/^[A-ZÀ-Þ]+[:\.,]/.test(line)) continue;

        // Skip structural markers
        if (/^(ACTE|SCÈNE|SCENE|TABLEAU)/i.test(line)) continue;

        // If it's all caps and reasonable length, might be title
        if (line === line.toUpperCase() && line.length > 5 && line.length < 60) {
            // Check it's not a character name pattern
            if (!line.includes(":") && !line.includes(",")) {
                return line;
            }
        }
    }

    return undefined;
}

/**
 * Step 1: Fast scan to detect potential characters
 */
/**
 * Step 1: Fast scan to detect potential characters
 */
// Collective roles are now imported from constants


/**
 * Step 1: Fast scan to detect potential characters
 */
export function detectCharactersHeuristic(rawText: string): { title?: string, characters: string[] } {
    console.log("[Parser] Running heuristic character detection...");

    const cleanText = rawText.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = cleanText.split(/\r?\n/);

    const title = extractTitle(lines);
    const characterPrefixRegex = /^([A-ZÀ-ÖØ-Þ][a-zà-öA-ZÀ-ÖØ-Þ\s\-\'']+)[:\.,]\s*(.*)/;

    // Track usage stats
    const characterUsage = new Map<string, { headers: number, totalWords: number }>();

    // First pass: detect if file uses PERSO/REPLIQUE format
    const usesPersoFormat = lines.some(line => /^PERSO\s+/i.test(line.trim()));

    if (usesPersoFormat) {
        console.log("[Parser] Detected PERSO/REPLIQUE format - using strict extraction");
    }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line || /^\d+$/.test(line)) continue;
        if (line.length > 60) continue;

        // === NEW BRACKET FORMAT DETECTION ===
        // Detect "[CHARACTER NAME]" format (priority format)
        const bracketCharacterRegex = /^\[([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-']+)\]\s*/;
        const bracketMatch = line.match(bracketCharacterRegex);
        if (bracketMatch) {
            const charName = bracketMatch[1].trim().toUpperCase();
            const stats = characterUsage.get(charName) || { headers: 0, totalWords: 0 };
            stats.headers++;

            // Peek at next lines for dialogue word count (until next bracket or empty line)
            let dialogueWords = 0;
            for (let j = i + 1; j < lines.length && j < i + 5; j++) {
                const nextLine = lines[j].trim();
                if (!nextLine || /^\[/.test(nextLine)) break;
                // Count words, excluding parentheses content for word count
                const cleanLine = nextLine.replace(/\(.*?\)/g, '');
                dialogueWords += cleanLine.split(/\s+/).filter(w => w.length > 0).length;
            }
            stats.totalWords += dialogueWords;
            characterUsage.set(charName, stats);
            continue;
        }
        // === END BRACKET FORMAT DETECTION ===

        // === AI-CLEANED FORMAT DETECTION (PERSO/REPLIQUE) ===
        // Detect "PERSO X" format - extract character name
        const persoMatch = line.match(/^PERSO\s+(.+)$/i);
        if (persoMatch) {
            const charName = persoMatch[1].trim().toUpperCase();
            const stats = characterUsage.get(charName) || { headers: 0, totalWords: 0 };
            stats.headers++;
            // Peek at next line for dialogue word count
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                const repMatch = nextLine.match(/^REPLIQUE\s+(.+)$/i);
                if (repMatch) {
                    stats.totalWords += repMatch[1].split(/\s+/).filter(w => w.length > 0).length;
                }
            }
            characterUsage.set(charName, stats);
            continue;
        }

        // Skip REPLIQUE lines entirely (they are dialogue, not characters)
        if (/^REPLIQUE\s+/i.test(line)) {
            continue;
        }
        // === END AI-CLEANED FORMAT DETECTION ===

        // If file uses PERSO format, skip ALL heuristic detection
        if (usesPersoFormat) {
            continue;
        }

        // === LEGACY HEURISTIC DETECTION (only for non-PERSO files) ===
        let charName = "";
        let isHeader = false;
        let dialogueText = "";

        // Pattern 1: NAME. Dialogue or NAME: Dialogue
        const prefixMatch = line.match(characterPrefixRegex);
        if (prefixMatch) {
            charName = (prefixMatch[1] || "").trim();
            dialogueText = (prefixMatch[2] || "").trim();
            isHeader = true;
        }
        // Pattern 2: Standalone NAME (possibly with a trailing dot)
        else {
            const standaloneRe = /^([A-ZÀ-ÖØ-Þ]{2,}[A-ZÀ-ÖØ-Þ\s\-\'']*[A-ZÀ-ÖØ-Þ\.]?)$/;
            const standaloneMatch = line.match(standaloneRe);
            if (standaloneMatch) {
                charName = (standaloneMatch[1] || "").trim().replace(/\.$/, "");
                isHeader = true;
                // Peek at next line for dialogue
                if (i + 1 < lines.length) {
                    dialogueText = lines[i + 1].trim();
                }
            }
        }

        if (charName) {
            if (!prefixMatch && /[!\?\u2026]$/.test(line)) continue;

            const finalName = extractVoixName(charName);
            const score = scoreCharacterName(finalName);
            const isCollective = COLLECTIVE_ROLES.has(finalName.toUpperCase());

            // Increased from 0.6 to 0.75 to prevent false positives like "CONTINUEZ DONC"
            // But allow collective roles regardless of score
            if (score > 0.75 || isCollective) {
                const normalized = finalName.toUpperCase();
                const stats = characterUsage.get(normalized) || { headers: 0, totalWords: 0 };
                if (isHeader) stats.headers++;
                stats.totalWords += dialogueText.split(/\s+/).filter(w => w.length > 0).length;
                characterUsage.set(normalized, stats);
            }
        }
    }

    // Filter and sort
    const characters = Array.from(characterUsage.entries())
        .filter(([name, stats]) => stats.headers >= 1 && !COLLECTIVE_ROLES.has(name)) // Exclude collective roles from assignable list
        .sort((a, b) => b[1].headers - a[1].headers)
        .map(([name]) => name);

    return { title, characters };
}

export function parseScript(rawText: string, validatedCharacters?: string[], aliasMap?: Record<string, string>): ParsedScript {
    console.log("[Parser] Starting guided heuristic parser...");

    // Create a set for fast lookup if provided
    const charWhitelist = validatedCharacters ? new Set(validatedCharacters.map(c => c.toUpperCase())) : null;
    const aliases = aliasMap || {};

    // Pre-process text
    const cleanText = rawText.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = cleanText.split(/\r?\n/);

    // Try to extract title
    const title = extractTitle(lines);
    if (title) {
        console.log("[Parser] Detected title:", title);
    }

    // Data structures
    let scriptLines: ScriptLine[] = [];
    const scenes: ScriptScene[] = [];
    const characterCounts: Record<string, number> = {};

    let currentCharacter = "";
    let currentBuffer = "";
    let idCounter = 0;

    // Speaker history with gender tracking: { name, gender }
    interface SpeakerInfo { name: string; gender: 'M' | 'F' | 'unknown' }
    let lastSpeakers: SpeakerInfo[] = [];

    // === REGEX PATTERNS ===

    // "CHARACTER." or "CHARACTER," or "CHARACTER:" at start
    // Examples: "LE MAÎTRE DE MUSIQUE." or "Monsieur Jourdain:" or "LUCIEN."
    // Refinement: require at least 2 characters for the name part (avoids "M." or "D." at start of line)
    const characterPrefixRegex = /^([A-ZÀ-ÖØ-Þ][a-zà-öA-ZÀ-ÖØ-Þ\s\-\'']{1,})[:\.,]\s*(.*)/;

    // Bracket-based character detection: [CHARACTER NAME]
    // Allow dialogue on the same line after the bracket
    const bracketCharacterRegex = /^\[([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-']+)\]\s*(.*)/;

    // Standalone uppercase line (possibly with a trailing dot)
    const characterLineRegex = /^\s*([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-\'']{1,35}[\.]?)\s*$/;

    // Scene header
    const sceneRegex = /^(?:SCÈNE|SCENE|ACTE|TABLEAU)\s+(?:[IVX0-9]+|PREMI[ÈE]RE?|DERNI[ÈE]RE?)/i;

    // === STRICT MODE DETECTION ===
    // If we detect the bracket format, we activate STRICT PARSING mode.
    // This bypasses all heuristics and assumes the text is perfectly formatted.
    // We scan the ENTIRE file to be sure (as requested).
    const hasBracketFormat = lines.some(line => /^\s*\[([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-']+)\]/.test(line));

    if (hasBracketFormat) {
        console.log("[Parser] STRICT MODE ACTIVATED (Bracket Format detected)");

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (/^\d+$/.test(trimmedLine)) continue; // Skip page numbers

            // 1. Detect Character: [NAME]
            const bracketMatch = line.match(/^\[([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-']+)\]\s*(.*)/);

            if (bracketMatch) {
                // Flush previous buffer
                if (currentCharacter && currentBuffer) {
                    scriptLines.push({
                        id: String(idCounter++),
                        character: currentCharacter,
                        text: currentBuffer.trim(),
                        type: "dialogue",
                    });
                    currentBuffer = "";
                }

                const rawName = bracketMatch[1].trim();
                const detectedName = extractVoixName(rawName).toUpperCase();
                currentCharacter = aliases[detectedName] || detectedName;
                characterCounts[currentCharacter] = (characterCounts[currentCharacter] || 0) + 1;

                // If there is dialogue on the same line
                const dialogueAfter = bracketMatch[2].trim();
                if (dialogueAfter) {
                    currentBuffer = dialogueAfter;
                }
                continue;
            }

            // 2. Detect Scene Header
            // Even in strict mode, we want to capture scenes
            const cleanLine = trimmedLine.replace(/\(.*?\)/g, "").trim(); // Remove directions for checking
            if (sceneRegex.test(cleanLine)) {
                if (currentCharacter && currentBuffer) {
                    scriptLines.push({
                        id: String(idCounter++),
                        character: currentCharacter,
                        text: currentBuffer.trim(),
                        type: "dialogue",
                    });
                    currentBuffer = "";
                }
                scenes.push({ index: scriptLines.length, title: cleanLine });
                currentCharacter = "";
                currentBuffer = "";
                continue;
            }

            // 3. Detect Orphan Stage Directions OR Add to Dialogue
            // If we have a character, it is dialogue (or embedded directions)
            if (currentCharacter) {
                currentBuffer += (currentBuffer ? " " : "") + trimmedLine;
            } else {
                // No character yet, must be a stage direction (like start of scene)
                // Or a scene description
                scriptLines.push({
                    id: String(idCounter++),
                    character: "INDICATIONS",
                    text: trimmedLine,
                    type: "stage_direction"
                });
            }
        }

        // Flush final buffer for Strict Mode
        if (currentCharacter && currentBuffer) {
            scriptLines.push({
                id: String(idCounter++),
                character: currentCharacter,
                text: currentBuffer.trim(),
                type: "dialogue",
            });
        }

        // Return early - SKIP THE OLD HEURISTIC LOOP
        return {
            lines: scriptLines,
            characters: Object.keys(characterCounts),
            scenes
        };
    }

    // === FALLBACK: LEGACY HEURISTIC LOOP ===
    let previousLine = "";

    for (const originalLine of lines) {
        // Create TWO versions of the line:
        // 1. lineForDetection: Clean line WITHOUT parentheses (for character matching logic)
        const lineForDetection = originalLine
            .replace(/\(.*?\)/g, "")  // Remove parentheses ONLY for detection
            .replace(/\s+/g, " ")
            .trim();

        // 2. lineForDialogue: Line WITH parentheses preserved (for dialogue accumulation)
        const lineForDialogue = originalLine
            .replace(/\s+/g, " ")
            .trim();

        if (!lineForDetection && !lineForDialogue) continue; // Skip strictly empty lines
        if (lineForDetection && /^\d+$/.test(lineForDetection)) continue; // Page numbers

        // Handle pure stage direction lines (where detection line is empty but dialogue line exists)
        // Example: "(Tous sont assis à table)"
        if (!lineForDetection && lineForDialogue) {
            if (currentCharacter) {
                // Determine if we should add a space or not
                currentBuffer += (currentBuffer ? " " : "") + lineForDialogue;
            } else {
                // Orphan stage direction (e.g. start of scene description)
                scriptLines.push({
                    id: String(idCounter++),
                    character: "INDICATIONS", // Neutral character name for scene directions
                    text: lineForDialogue,
                    type: "stage_direction"
                });
            }
            previousLine = lineForDialogue;
            continue;
        }

        // Check for scene header
        if (sceneRegex.test(lineForDetection)) {
            // Flush current buffer
            if (currentCharacter && currentBuffer) {
                scriptLines.push({
                    id: String(idCounter++),
                    character: currentCharacter,
                    text: currentBuffer.trim(),
                    type: "dialogue",
                });
                currentBuffer = "";
            }

            // Add scene to scenes array ONLY (not to scriptLines to avoid duplication)
            scenes.push({ index: scriptLines.length, title: lineForDetection });
            currentCharacter = "";
            currentBuffer = "";
            previousLine = lineForDetection;
            continue; // Skip to next line - don't process scene header as dialogue
        }

        // === AI-CLEANED FORMAT DETECTION (PERSO/REPLIQUE) ===
        // Detect "PERSO X" format - extract character name
        const persoMatch = lineForDetection.match(/^PERSO\s+(.+)$/i);
        if (persoMatch) {
            // Flush current buffer
            if (currentCharacter && currentBuffer) {
                scriptLines.push({
                    id: String(idCounter++),
                    character: currentCharacter,
                    text: currentBuffer.trim(),
                    type: "dialogue",
                });
                currentBuffer = "";
            }
            const detectedName = persoMatch[1].trim().toUpperCase();
            currentCharacter = aliases[detectedName] || detectedName;
            characterCounts[currentCharacter] = (characterCounts[currentCharacter] || 0) + 1;
            previousLine = lineForDetection;
            continue;
        }

        // Detect "REPLIQUE X" format - extract dialogue text (strip REPLIQUE keyword)
        const repliqueMatch = lineForDetection.match(/^REPLIQUE\s+(.+)$/i);
        if (repliqueMatch && currentCharacter) {
            // Use the ORIGINAL line (with parentheses) for dialogue, not the cleaned one
            const originalRepliqueMatch = lineForDialogue.match(/^REPLIQUE\s+(.+)$/i);
            if (originalRepliqueMatch) {
                currentBuffer += (currentBuffer ? " " : "") + originalRepliqueMatch[1].trim();
            }
            previousLine = lineForDetection;
            continue;
        }
        // === END AI-CLEANED FORMAT DETECTION ===

        // === NEW BRACKET FORMAT DETECTION ===
        // Detect "[CHARACTER NAME]" format with optional dialogue on same line
        const bracketMatch = lineForDetection.match(bracketCharacterRegex);

        if (bracketMatch) {
            // Flush current buffer
            if (currentCharacter && currentBuffer) {
                scriptLines.push({
                    id: String(idCounter++),
                    character: currentCharacter,
                    text: currentBuffer.trim(),
                    type: "dialogue",
                });
                currentBuffer = "";
            }

            const rawName = bracketMatch[1].trim();

            // Extract dialogue from ORIGINAL line (with parentheses preserved!)
            const originalBracketMatch = lineForDialogue.match(bracketCharacterRegex);
            const dialogueOnSameLine = originalBracketMatch ? originalBracketMatch[2].trim() : "";

            let finalName = extractVoixName(rawName).toUpperCase();

            // Apply alias mapping
            if (aliases[finalName]) {
                finalName = aliases[finalName];
            }

            // Validate character name (allow technical characters like RÉGIE, LUMIÈRE)
            const score = scoreCharacterName(finalName);

            // If validated characters list provided, check against it
            const isCollective = COLLECTIVE_ROLES.has(finalName.toUpperCase());

            if (charWhitelist && !charWhitelist.has(finalName.toUpperCase()) && !isCollective) {
                let foundSimilar = false;
                for (const valid of charWhitelist) {
                    if (similarity(finalName, valid) > 0.85) {
                        finalName = valid;
                        foundSimilar = true;
                        break;
                    }
                }
                // Skip if not in whitelist and no similar match found, AND not a collective role
                if (!foundSimilar && score < 0.3) {
                    previousLine = lineForDetection;
                    continue;
                }
            }

            currentCharacter = finalName.toUpperCase();
            characterCounts[currentCharacter] = (characterCounts[currentCharacter] || 0) + 1;

            // Track history for collective character resolution
            if (!finalName.includes(",") && !finalName.includes(" et ")) {
                lastSpeakers.push({ name: finalName, gender: getGender(finalName) });
                if (lastSpeakers.length > 10) lastSpeakers.shift();
            }

            // If dialogue is on the same line, start the buffer with it (WITH parentheses!)
            if (dialogueOnSameLine) {
                currentBuffer = dialogueOnSameLine + " ";
            }

            previousLine = lineForDetection;
            continue;
        }

        // Check for character
        let potentialName = "";
        let potentialDialogue = "";
        let matched = false;

        // DIALOGUE CONTINUITY CHECK
        // If the previous line doesn't end with sentence punctuation or ends with a connector,
        // we are very likely continuing a sentence, even if it looks like a character name.
        const isContinuing = previousLine && (
            !/[.!?:…]$/.test(previousLine) ||
            /\b(M\.|Mme\.|Mlle\.|à|de|et|ou|mais|que|qui)\s*$/i.test(previousLine)
        );

        // Pattern 1: "NAME. dialogue" or "NAME: dialogue"
        const prefixMatch = lineForDetection.match(characterPrefixRegex);
        if (prefixMatch) {
            const rawName = prefixMatch[1].trim();
            const afterName = prefixMatch[2].trim();

            // Relaxed check: ALL CAPS is always preferred, but Title Case with ":" is allowed
            const isAllCaps = rawName === rawName.toUpperCase();
            const isTitleCase = /^[A-ZÀ-ÖØ-Þ][a-zà-ö]/.test(rawName);

            if ((isAllCaps || isTitleCase) && rawName.length >= 2) {
                potentialName = rawName;

                // If after starts lowercase, it's a stage direction ("LE MAÎTRE, parlant...")
                if (afterName && /^[a-zà-ö]/.test(afterName)) {
                    potentialDialogue = "";
                } else {
                    // Extract dialogue from ORIGINAL line (with parentheses!)
                    const originalPrefixMatch = lineForDialogue.match(characterPrefixRegex);
                    potentialDialogue = originalPrefixMatch ? originalPrefixMatch[2].trim() : "";
                }
                matched = true;
            }
        } else {
            // Pattern 2: Standalone name on its own line
            const nameMatch = lineForDetection.match(characterLineRegex);
            if (nameMatch) {
                const rawName = nameMatch[1].trim();

                // STANDALONE COMMA CHECK
                // Addresses or mentions like "LANDERNAU," shouldn't be headers
                if (rawName.endsWith(",")) {
                    matched = false;
                } else {
                    const cleanName = rawName.replace(/\.$/, "");
                    // CRITICAL: Must be ALL CAPS
                    const isAllCaps = cleanName === cleanName.toUpperCase() && /[A-ZÀ-Þ]/.test(cleanName);
                    if (isAllCaps && cleanName.length >= 3) {
                        potentialName = cleanName;
                        matched = true;
                    }
                }
            }
        }

        // Apply continuity override
        if (matched && isContinuing && currentCharacter) {
            // console.log(`[Parser] Overriding matched character "${potentialName}" because line is continuing: "${previousLine}"`);
            matched = false;
        }

        if (matched && potentialName) {
            // Normalize the name
            let finalName = extractVoixName(potentialName);

            // Special handling for collective speech: allow them to bypass standard scoring
            const upperName = finalName.toUpperCase();
            const isCollective = /^TOUS$|^TOUTES$|^ENSEMBLE$|^LES\s+(DEUX|TROIS|QUATRE|CINQ)/i.test(upperName) ||
                upperName.includes(" ET ") ||
                (upperName.includes(",") && upperName.length > 5);

            const score = scoreCharacterName(finalName);

            // Increased threshold to 0.7 to prevent false positives like "CONTINUEZ DONC"
            if (score > 0.7 || isCollective) {
                // GUIDED PARSING OVERRIDE: 
                // If we have a whitelist, we ONLY care if it's in the list or very similar.
                // EXCEPTION: Collective characters (TOUS, etc.) always pass.
                if (charWhitelist && !isCollective && !charWhitelist.has(finalName.toUpperCase())) {
                    let foundSimiliar = false;
                    for (const valid of charWhitelist) {
                        if (similarity(finalName, valid) > 0.85) {
                            finalName = valid;
                            foundSimiliar = true;
                            break;
                        }
                    }
                    if (!foundSimiliar) {
                        matched = false;
                    }
                }

                if (matched) {
                    // Flush previous buffer
                    if (currentCharacter && currentBuffer) {
                        scriptLines.push({
                            id: String(idCounter++),
                            character: currentCharacter,
                            text: currentBuffer.trim(),
                            type: "dialogue",
                        });
                        currentBuffer = "";
                    }

                    const upper = finalName.toUpperCase();

                    // 1. Resolve "TOUS" / "TOUTES"
                    if (upper === "TOUS" || upper === "TOUTES" || upper === "ENSEMBLE") {
                        if (validatedCharacters && validatedCharacters.length > 0) {
                            finalName = validatedCharacters.join(", ");
                        }
                    }
                    // 2. Resolve "LES DEUX" / "LES TROIS" etc.
                    else if (/^LES\s+(DEUX|TROIS|QUATRE|CINQ)/i.test(upper)) {
                        const match = upper.match(/^LES\s+(DEUX|TROIS|QUATRE|CINQ)/i);
                        const countMap: Record<string, number> = { "DEUX": 2, "TROIS": 3, "QUATRE": 4, "CINQ": 5 };
                        const count = countMap[match![1].toUpperCase()] || 2;

                        const genderTarget = upper.includes("HOMME") || upper.includes("GARÇON") ? 'M' :
                            upper.includes("FEMME") || upper.includes("FILLE") ? 'F' : 'unknown';

                        const candidates: string[] = [];
                        for (let j = lastSpeakers.length - 1; j >= 0; j--) {
                            const s = lastSpeakers[j];
                            if (candidates.includes(s.name)) continue;
                            if (genderTarget === 'unknown' || s.gender === genderTarget || s.gender === 'unknown') {
                                candidates.push(s.name);
                            }
                            if (candidates.length >= count) break;
                        }

                        if (candidates.length >= 2) {
                            finalName = candidates.reverse().join(", ");
                        }
                    }
                    // 3. Resolve explicit joined names (e.g., "PACAREL ET LANDERNAU")
                    else if (upper.includes(" ET ") || (upper.includes(",") && upper.length > 5)) {
                        const parts = upper.split(/ ET |, /i).map(p => p.trim());
                        const resolvedParts = parts.map(part => {
                            if (charWhitelist && charWhitelist.has(part)) return part;
                            // Exact match in history
                            const historyMatch = lastSpeakers.find(s => s.name.toUpperCase() === part);
                            if (historyMatch) return historyMatch.name;

                            // Fuzzy match against whitelist
                            if (charWhitelist) {
                                for (const valid of charWhitelist) {
                                    if (similarity(part, valid) > 0.85) return valid;
                                }
                            }
                            return part;
                        });
                        finalName = resolvedParts.join(", ");
                    }

                    currentCharacter = finalName;
                    characterCounts[currentCharacter] = (characterCounts[currentCharacter] || 0) + 1;

                    // Track history for non-collective
                    if (!finalName.includes(",") && !finalName.includes(" et ")) {
                        lastSpeakers.push({ name: finalName, gender: getGender(finalName) });
                        if (lastSpeakers.length > 10) lastSpeakers.shift();
                    }

                    if (potentialDialogue) {
                        currentBuffer = potentialDialogue;
                    }
                    continue;
                }
            }
        }

        // Otherwise, add to current dialogue buffer (use lineForDialogue to keep parentheses!)
        if (currentCharacter) {
            currentBuffer += (currentBuffer ? " " : "") + lineForDialogue;
        }

        // Update previous line for next iteration
        previousLine = lineForDetection;
    }

    // Flush final buffer
    if (currentCharacter && currentBuffer) {
        const finalText = currentBuffer.trim();
        scriptLines.push({
            id: String(idCounter++),
            character: currentCharacter,
            text: finalText,
            type: "dialogue",
        });
    }

    console.log("[Parser] First pass complete. Lines:", scriptLines.length);

    // Detect if using clean PERSO/REPLIQUE format
    const usesPersoFormat = rawText.split('\n').some(line => /^PERSO\s+/i.test(line.trim()));
    console.log("[Parser] usesPersoFormat:", usesPersoFormat);

    // === POST-PROCESSING: MERGE SIMILAR NAMES ===
    // DISABLED for PERSO/REPLIQUE format - the PDF is already clean, trust it!
    if (!usesPersoFormat) {
        const sortedChars = Object.keys(characterCounts).sort((a, b) => characterCounts[b] - characterCounts[a]);
        const redirectMap: Record<string, string> = {};

        for (let i = 0; i < sortedChars.length; i++) {
            const primary = sortedChars[i];
            if (redirectMap[primary]) continue;

            for (let j = i + 1; j < sortedChars.length; j++) {
                const candidate = sortedChars[j];
                if (redirectMap[candidate]) continue;
                if (primary.includes(" et ") || candidate.includes(" et ")) continue;

                const sim = similarity(primary, candidate);
                if (sim >= CONFIG.MERGE_SIMILARITY_THRESHOLD) {
                    console.log(`[Parser] Merging "${candidate}" -> "${primary}" (similarity: ${sim.toFixed(2)})`);
                    redirectMap[candidate] = primary;
                }
            }
        }

        // Apply redirects
        scriptLines.forEach(line => {
            if (redirectMap[line.character]) {
                line.character = redirectMap[line.character];
            }
        });
    } else {
        console.log("[Parser] PERSO/REPLIQUE format detected - skipping character merge");
    }

    // === FILTER CHARACTER LIST LINES ===
    // At scene openings, there's often a list of present characters that looks like dialogue
    // Pattern: "MARIE" speaking "JULES, MICHELINE, AGLAÉ" = character list, not dialogue
    const characterSet = new Set(Object.keys(characterCounts).map(c => c.toUpperCase()));

    scriptLines = scriptLines.filter(line => {
        if (line.type !== "dialogue") return true;

        // Split the dialogue into words/names
        const words = line.text.split(/[,\s]+/).map(w => w.trim().toUpperCase()).filter(w => w.length > 1);

        if (words.length < 2) return true; // Single word dialogues are fine

        // Count how many words are known character names
        const matchCount = words.filter(w => characterSet.has(w)).length;
        const ratio = matchCount / words.length;

        // If >80% of words are character names, it's a character list
        if (ratio >= 0.8) {
            console.log(`[Parser] Skipping character list line: "${line.text.substring(0, 60)}..."`);
            return false;
        }
        return true;
    });

    // === FINAL FILTERING ===

    const finalCounts: Record<string, number> = {};
    scriptLines.forEach(line => {
        if (line.type === "dialogue") {
            finalCounts[line.character] = (finalCounts[line.character] || 0) + 1;
        }
    });

    // Only keep characters who meet the minimum threshold
    const realCharacters = Object.keys(finalCounts)
        .filter(c => {
            if (c === "SCENE") return false;

            // PRIORITY: If the character was explicitly validated in the wizard, ALWAYS keep it!
            if (charWhitelist && charWhitelist.has(c.toUpperCase())) {
                return true;
            }

            // For non-whitelisted characters, apply stricter filters
            if (c.includes(" et ") || c.includes(",")) {
                console.log(`[Parser] Filtering out "${c}" (collective character, not in whitelist)`);
                return false;
            }

            if (finalCounts[c] < CONFIG.MIN_LINES_THRESHOLD) {
                console.log(`[Parser] Filtering out "${c}" (only ${finalCounts[c]} line(s), not in whitelist)`);
                return false;
            }
            return true;
        })
        .sort();

    console.log("[Parser] Final characters:", realCharacters.length);
    console.log("[Parser] Characters:", realCharacters.join(", "));

    return {
        title,
        lines: scriptLines,
        characters: realCharacters,
        scenes,
    };
}
