/**
 * Play-specific misinterpretation fixes
 */
const PLAY_FIXES: Record<string, [RegExp, string][]> = {
    "ON PURGE BÉBÉ": [
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
    "FEU LA MÈRE DE MADAME": [
        [/\bmatame\b/gi, "madame"],
        [/\bpien\b/gi, "bien"],
        [/\bfoulez\b/gi, "voulez"],
        [/\bfous\b/gi, "vous"],
        [/\bte\b/gi, "de"],
        [/\bpon\b/gi, "bon"],
        [/\bafec\b/gi, "avec"],
        [/\bché\b/gi, "j'ai"],
        [/\bpour quoi\b/gi, "pourquoi"],
        [/\bché pas\b/gi, "j'ai pas"],
        [/\btit\b/gi, "dit"],
        [/\btites\b/gi, "dites"],
    ]
};

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
        const normalizedTitle = playTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        for (const [title, fixes] of Object.entries(PLAY_FIXES)) {
            if (normalizedTitle.includes(title)) {
                for (const [pattern, replacement] of fixes) {
                    t = t.replace(pattern, replacement);
                }
                break;
            }
        }
    }

    return t;
}

/**
 * Memory-efficient Levenshtein distance (O(min(n,m)) space)
 */
export function calculateSimilarity(str1: string, str2: string, playTitle?: string): number {
    if (!str1 || !str2) return (str1 === str2) ? 1.0 : 0.0;

    const normalize = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
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

    return 1.0 - (distance / maxLength);
}
