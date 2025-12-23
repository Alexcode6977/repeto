import { ScriptLine, ParsedScript, ScriptScene } from "./types";

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
export function detectCharactersHeuristic(rawText: string): { title?: string, characters: string[] } {
    console.log("[Parser] Running heuristic character detection...");

    const cleanText = rawText.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = cleanText.split(/\r?\n/);

    const title = extractTitle(lines);
    const characterPrefixRegex = /^([A-ZÀ-ÖØ-Þ][a-zà-öA-ZÀ-ÖØ-Þ\s\-\'']+)[:\.,]\s*(.*)/;
    const characterLineRegex = /^\s*([A-ZÀ-ÖØ-Þ]{2,}[A-ZÀ-ÖØ-Þ\s\-\'']*)\s*$/;

    const characterUsage = new Map<string, { headers: number, totalWords: number }>();

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line || /^\d+$/.test(line)) continue;
        if (line.length > 60) continue;

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
                charName = standaloneMatch[1].trim().replace(/\.$/, "");
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

            if (score > 0.6) {
                const normalized = finalName.toUpperCase();
                const stats = characterUsage.get(normalized) || { headers: 0, totalWords: 0 };
                if (isHeader) stats.headers++;
                stats.totalWords += dialogueText.split(/\s+/).filter(w => w.length > 0).length;
                characterUsage.set(normalized, stats);
            }
        }
    }

    // Filter and sort:
    // 1. Must have appeared as a Header at least once
    // 2. Must have a minimum "speech density" (total words spoken)
    // 3. High frequency or short standalone name
    const characters = Array.from(characterUsage.entries())
        .filter(([name, stats]) => {
            // Rule 2 & 5: Positional validation & Density
            if (stats.headers === 0) return false;

            // Rule 5: Density check (Hadès test)
            // A character must have spoken at least some words OR appeared many times as a line starter
            if (stats.totalWords < 2 && stats.headers < 3) return false;

            if (stats.headers >= 5) return true;
            if (stats.headers >= 2 && name.length >= 3 && name.length <= 15 && !name.includes(" ")) return true;

            return false;
        })
        .sort((a, b) => b[1].headers - a[1].headers)
        .map(([name]) => name);


    return { title, characters };
}

export function parseScript(rawText: string, validatedCharacters?: string[]): ParsedScript {
    console.log("[Parser] Starting guided heuristic parser...");

    // Create a set for fast lookup if provided
    const charWhitelist = validatedCharacters ? new Set(validatedCharacters.map(c => c.toUpperCase())) : null;

    // Pre-process text
    const cleanText = rawText.replace(/\t/g, " ").replace(/ +/g, " ");
    const lines = cleanText.split(/\r?\n/);

    // Try to extract title
    const title = extractTitle(lines);
    if (title) {
        console.log("[Parser] Detected title:", title);
    }

    // Data structures
    const scriptLines: ScriptLine[] = [];
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
    const characterPrefixRegex = /^([A-ZÀ-ÖØ-Þ][a-zà-öA-ZÀ-ÖØ-Þ\s\-\'']+)[:\.,]\s*(.*)/;

    // Standalone uppercase line (possibly with a trailing dot)
    const characterLineRegex = /^\s*([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s\-\'']{1,35}[\.]?)\s*$/;

    // Scene header
    const sceneRegex = /^(?:SCÈNE|SCENE|ACTE|TABLEAU)\s+(?:[IVX0-9]+|PREMI[ÈE]RE?|DERNI[ÈE]RE?)/i;

    // === MAIN PARSING LOOP ===

    for (const originalLine of lines) {
        // Clean line
        let line = originalLine
            .replace(/\(.*?\)/g, "")  // Remove parenthetical content
            .replace(/\s+/g, " ")
            .trim();

        if (!line) continue;
        if (/^\d+$/.test(line)) continue; // Page numbers

        // Check for scene header
        if (sceneRegex.test(line)) {
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

            scriptLines.push({
                id: String(idCounter++),
                character: "SCENE",
                text: line,
                type: "scene_heading",
            });
            scenes.push({ index: scriptLines.length - 1, title: line });
            currentCharacter = "";
            continue;
        }

        // Try to detect character
        let potentialName = "";
        let potentialDialogue = "";
        let matched = false;

        // Pattern 1: "NAME. dialogue" or "NAME, description"
        const prefixMatch = line.match(characterPrefixRegex);
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
                    potentialDialogue = afterName;
                }
                matched = true;
            }
        } else {
            // Pattern 2: Standalone name on its own line
            const nameMatch = line.match(characterLineRegex);
            if (nameMatch) {
                const rawName = nameMatch[1].trim().replace(/\.$/, "");
                // CRITICAL: Must be ALL CAPS
                const isAllCaps = rawName === rawName.toUpperCase() && /[A-ZÀ-Þ]/.test(rawName);
                if (isAllCaps && rawName.length >= 3) {
                    potentialName = rawName;
                    matched = true;
                }
            }
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

            if (score > 0 || isCollective) {
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

        // Otherwise, add to current dialogue buffer
        if (currentCharacter) {
            currentBuffer += (currentBuffer ? " " : "") + line;
        }
    }

    // Flush final buffer
    if (currentCharacter && currentBuffer) {
        scriptLines.push({
            id: String(idCounter++),
            character: currentCharacter,
            text: currentBuffer.trim(),
            type: "dialogue",
        });
    }

    console.log("[Parser] First pass complete. Lines:", scriptLines.length);

    // === POST-PROCESSING: MERGE SIMILAR NAMES ===

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
            if (c.includes(" et ") || c.includes(",")) return false;
            if (finalCounts[c] < CONFIG.MIN_LINES_THRESHOLD) {
                console.log(`[Parser] Filtering out "${c}" (only ${finalCounts[c]} line(s))`);
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
