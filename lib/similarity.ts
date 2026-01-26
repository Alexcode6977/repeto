/**
 * Play-specific misinterpretation fixes
 */
const PLAY_FIXES: Record<string, [RegExp, string][]> = {
    "ON PURGE BEBE": [
        [/les hybrides/g, "les hébrides"],
        [/\bbene\b/g, "ben"],
        [/\bbain\b/g, "ben"],
        [/\bpalto\b/g, "paletot"],
        [/pas le t[oô]t?/g, "paletot"],
        [/palle taux/g, "paletot"],
        [/choou you/g, "chouilloux"],
        [/chou you/g, "chouilloux"],
        [/choux you/g, "chouilloux"],
        [/shouyo/g, "chouilloux"],
        [/\bchoux\b/g, "chouilloux"],
        [/chou ill?ou/g, "chouilloux"],
    ],
    "FEU LA MERE DE MADAME": [
        // Titres et Noms
        [/\bm[âa]t[âa]me\b/gi, "madame"],
        [/\bmatame\b/gi, "madame"],
        [/\bm[aâ]t[aâ]m\b/gi, "madame"],
        [/\bmoussié\b/gi, "monsieur"],
        [/\btié\b/gi, "dieu"],
        [/\bmon tié\b/gi, "mon dieu"],
        [/\bb[ôo]lichinelle\b/gi, "polichinelle"],
        [/\bpésaces\b/gi, "paysages"],
        [/\bserfice\b/gi, "service"],
        [/\bchipe\b/gi, "jupe"],
        [/\bchipon\b/gi, "jupon"],
        [/\bcrue\b/gi, "grue"],

        // Pronoms et Verbes
        [/\bche\b/gi, "je"],
        [/\bché\b/gi, "j'ai"],
        [/\bch(')?\b/gi, "j$1"], // ch' -> j'
        [/\btemante\b/gi, "demande"],
        [/\btemanté\b/gi, "demandé"],
        [/\btit\b/gi, "dit"],
        [/\bpésoin\b/gi, "besoin"],
        [/\bfoilà\b/gi, "voilà"],

        // Adjectifs, Adverbes et Prépositions
        [/\bpien\b/gi, "bien"],
        [/\bpen\b/gi, "ben"],
        [/\bbas\b/gi, "pas"],
        [/\bti\b/gi, "du"],
        [/\bte\b/gi, "de"], // Attention aux faux positifs, mais c'est spécifique à la pièce
        [/\bt'\b/gi, "d'"],
        [/\bdé\b/gi, "des"],
        [/\bg[ôo]té\b/gi, "côté"],
        [/\bteux\b/gi, "deux"],
        [/\btoucement\b/gi, "doucement"],
        [/\bpient[ôo]t\b/gi, "bientôt"],
        [/\bine\b/gi, "une"],
        [/\bg[ôo]rrect\b/gi, "correct"],
        [/\bécal\b/gi, "égal"],
        [/\btouteuse\b/gi, "douteuse"],
        [/\bfrai\b/gi, "vrai"],
        [/\bgondende\b/gi, "contente"],

        // Autres corrections existantes et variations
        [/\bfoulez\b/gi, "voulez"],
        [/\bfous\b/gi, "vous"],
        [/\bpon\b/gi, "bon"],
        [/\bafec\b/gi, "avec"],
        [/\bpour quoi\b/gi, "pourquoi"],
        [/\bché pas\b/gi, "j'ai pas"],
    ]
};

const GLOBAL_FIXES: [RegExp, string][] = [
    [/\bloin\b/g, "l'un"],
    [/\bêtes\b/g, "êtes"],
    [/\bqu'il\b/g, "qu'il"],
    [/\bqu'elle\b/g, "qu'elle"],
    [/\bdans\b/g, "en"], // Sometimes confused in fast speech
    [/\bes-tu\b/gi, "es-tu"],
    [/\bconnais\b/g, "connais"],
    [/\bchais\b/g, "je sais"], // "chais pas" -> "je sais pas"
    [/\bch'ais\b/g, "je sais"],
    [/\bspa\b/g, "c'est pas"],
    [/\bt'as\b/g, "tu as"],
    [/\bt'es\b/g, "tu es"],
];

export function cleanTranscript(text: string, playTitle?: string): string {
    let t = text.toLowerCase();
    const numbers = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];

    // Fix time formats (e.g. "4h10" -> "quatre heure dix", "5h" -> "cinq heures")
    t = t.replace(/\b(\d{1,2})h(\d{0,2})\b/g, (_match, h, m) => {
        const hVal = parseInt(h);
        const hStr = hVal < numbers.length ? numbers[hVal] : h;

        let mStr = "";
        if (m) {
            const mVal = parseInt(m);
            mStr = " " + (mVal < numbers.length ? numbers[mVal] : m);
        }
        return `${hStr} heure${mStr}`;
    });

    // Replace standalone digits 0-10
    t = t.replace(/\b(\d)\b/g, (match) => numbers[parseInt(match)] || match);

    // Apply play-specific fixes if title matches
    if (playTitle) {
        // NORMALIZE title: Uppercase + No Accents to match keys (e.g. "FEU LA MERE DE MADAME")
        const normalizedTitle = playTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        for (const [title, fixes] of Object.entries(PLAY_FIXES)) {
            // Check if strict inclusion holds (keys are already uppercase/accent-free)
            if (normalizedTitle.includes(title)) {
                for (const [pattern, replacement] of fixes) {
                    t = t.replace(pattern, replacement);
                }
                break;
            }
        }
    }

    // Apply global fixes
    for (const [pattern, replacement] of GLOBAL_FIXES) {
        t = t.replace(pattern, replacement);
    }

    return t;
}

/**
 * Remove stage directions (parentheses and brackets) from text
 */
export function stripStageDirections(text: string): string {
    return text
        .replace(/\(.*?\)/g, "") // Remove (...)
        .replace(/\[.*?\]/g, "") // Remove [...]
        .replace(/\s+/g, " ")    // Normalize spaces
        .trim();
}

/**
 * Memory-efficient Levenshtein distance (O(min(n,m)) space)
 */
export function calculateSimilarity(str1: string, str2: string, playTitle?: string, similarityThreshold: number = 0.85): number {
    if (!str1 || !str2) return (str1 === str2) ? 1.0 : 0.0;

    const normalize = (s: string) =>
        stripStageDirections(s) // NEW: Strip stage directions first
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[',]/g, " ") // Treat apostrophes and commas as spaces (j'ai -> j ai)
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\b(ne|n)\b/g, "") // ONLY remove negation particles for flexibility
            .replace(/\s+/g, " ")
            .trim();

    const s1Value = normalize(cleanTranscript(str1, playTitle));
    const s2Value = normalize(cleanTranscript(str2, playTitle));

    if (s1Value === s2Value) return 1.0;
    if (s1Value.length === 0 || s2Value.length === 0) return 0.0;

    // Use shorter string for current/prev rows to save space
    const s1 = s1Value.length < s2Value.length ? s1Value : s2Value;
    const s2 = s1Value.length < s2Value.length ? s2Value : s1Value;

    const len1 = s1.length;
    const len2 = s2.length;

    let prevRow = new Int32Array(len1 + 1);
    let currRow = new Int32Array(len1 + 1);

    for (let i = 0; i <= len1; i++) prevRow[i] = i;

    for (let j = 1; j <= len2; j++) {
        currRow[0] = j;
        for (let i = 1; i <= len1; i++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            currRow[i] = Math.min(
                currRow[i - 1] + 1,      // insertion
                prevRow[i] + 1,          // deletion
                prevRow[i - 1] + cost    // substitution
            );
        }
        // Swap rows
        const temp = prevRow;
        prevRow = currRow;
        currRow = temp;
    }

    const distance = prevRow[len1];
    const maxLength = Math.max(s1Value.length, s2Value.length);

    // Calculate base similarity
    let score = 1.0 - (distance / maxLength);

    // == SPACELESS FALLBACK ==
    // Robustness for puns and word splitting (ex: "Lanoix" vs "La noix").
    // We compare strings without spaces.
    const s1SpaceLess = s1Value.replace(/\s+/g, "");
    const s2SpaceLess = s2Value.replace(/\s+/g, "");

    // We only compute this if the base score is borderline or if strings lengths are similar
    if (score < 0.9 && Math.abs(s1SpaceLess.length - s2SpaceLess.length) <= 3) {
        // Simple internal Levenshtein for spaceless
        const distSpaceLess = calculateLevenshtein(s1SpaceLess, s2SpaceLess);
        const maxLenSpaceLess = Math.max(s1SpaceLess.length, s2SpaceLess.length);
        const spacelessScore = 1.0 - (distSpaceLess / maxLenSpaceLess);

        // If spaceless is much better, use it (capped at 0.95 to avoid false positives)
        if (spacelessScore > score) {
            score = Math.min(spacelessScore, 0.95);
        }
    }

    // == SHORT LINE TOLERANCE ==
    // For very short theatrical lines (1-2 words), we are more permissive.
    // If distance is only 1 or 2 characters and the line is short, we allow it.
    const wordsCount = s2Value.split(" ").length;
    if (wordsCount <= 2 && distance <= 2) {
        // e.g. "Hein" vs "Hein ?" or "Ah" vs "Oh" (if distance small enough)
        // This helps with transcription noise on interjections.
        return Math.max(score, 0.85);
    }

    // == PHONETIC FALLBACK ==
    // Special layer for homophones (Jean/Gens, Vaux/Veau).
    // If we're still below threshold, check phonetic similarity.
    if (score < similarityThreshold && score >= 0.6) {
        const p1 = frenchPhonetic(s1Value);
        const p2 = frenchPhonetic(s2Value);
        if (p1 === p2) return Math.max(score, similarityThreshold);

        const pDist = calculateLevenshtein(p1, p2);
        const pMaxLen = Math.max(p1.length, p2.length);
        const pScore = 1.0 - (pDist / pMaxLen);

        if (pScore > score) {
            // Boost score if phonetically very similar
            score = Math.max(score, pScore * 0.9); // Slight penalty for phonetic-only
        }
    }

    return score;
}

function frenchPhonetic(text: string): string {
    let s = text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z]/g, " "); // Keep spaces for word concepts

    if (s.trim().length === 0) return "";

    // 0. DIALECT CONSONANT NORMALIZATION (Universal rules for Alsatian/Germanic accents)
    // We are aggressive here because this function is only used as a fallback
    // when strict equality or standard similarity fails.
    s = s
        // b ↔ p (pien/bien, bas/pas, pon/bon, rapière/rabiere)
        .replace(/p/g, "b")
        // d ↔ t (temante/demande, tit/dit, te/de, gondende/contente)
        .replace(/t/g, "d")
        // g ↔ c (k) (gôté/côté, gondende/contente, écal/égal)
        // We normalize to 'k' equivalent sound (which is often mapped to 'k' later, but here we map g->c or similar)
        // Actually, later we map c->k. Let's map g->k if hard, but g varies.
        // Simple swap: specific "g" hard sound to "k" sound replacement logic is complex.
        // Let's stick to the mapped pairs: Hard G <-> K/C.
        .replace(/g(?=[aou])/g, "c")
        .replace(/gu/g, "c") // guerre -> cuerre (match k)

        // j ↔ ch (che/je, chipe/jupe) - but allow 'ch' to be normalized later
        .replace(/\bch/g, "j")
        .replace(/\bsh/g, "j") // shouyo -> chouilloux -> jouilloux

        // v ↔ f (frai/vrai, foilà/voilà)
        .replace(/f/g, "v");

    // 1. Phonetization (Word-aware)
    s = s.replace(/\bph/g, "f")
        .replace(/qu|ck|k/g, "k")
        .replace(/c(?=[eiy])/g, "s")
        .replace(/c/g, "k")
        .replace(/g(?=[eiy])/g, "j")
        .replace(/gu/g, "g")
        .replace(/\best\b/g, "e") // "est" sounds like "e"
        .replace(/ai|ei|et|er|ez/g, "e")
        .replace(/au|eau/g, "o")
        .replace(/ou/g, "u")
        .replace(/e?an|e?am|e?en|e?em/g, "2")
        .replace(/ein|ain|in|im/g, "1")
        .replace(/on|om/g, "3")
        .replace(/oi/g, "wa")
        .replace(/h/g, "");

    // 2. Word-level silent terminal letters
    s = s.split(/\s+/).map(word => {
        if (word.length <= 1) return word;
        // Strip common silent terminals in theatrical French
        let w = word.replace(/[stdxgp]+$/g, "");
        // Special: final 'e' after consonant is often silent
        w = w.replace(/e$/g, "");
        return w;
    }).join("");

    // 3. Final Consonants simplification (now that words are joined)
    s = s.replace(/([b-df-hj-np-rt-vw-z])\1+/g, "$1");

    return s;
}

/**
 * Basic Levenshtein distance for internal use
 */
function calculateLevenshtein(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[len1][len2];
}
