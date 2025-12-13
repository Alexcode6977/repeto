export function cleanTranscript(text: string): string {
    let t = text.toLowerCase();
    const numbers = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];

    // Fix time formats (e.g. "4h10" -> "quatre heure dix", "5h" -> "cinq heures")
    // Match XhY or Xh
    t = t.replace(/\b(\d{1,2})h(\d{0,2})\b/g, (_match, h, m) => {
        const hVal = parseInt(h);
        const hStr = hVal < numbers.length ? numbers[hVal] : h; // "quatre"

        // Handle minutes
        let mStr = "";
        if (m) {
            const mVal = parseInt(m);
            // "dix" for 10, otherwise keep digits if > 12 (simplified) or mapped if small
            mStr = " " + (mVal < numbers.length ? numbers[mVal] : m);
        }

        // Plural "heures" if h > 1 ? Actually spoken is often "quatre heure dix" (singular sounding) but "cinq heures" (plural sounding).
        // Let's use "heure" generic or "heures". Script usually has "heures".
        // Example: "quatre heure dix" (singular in script?). User says "4h10".
        // Let's force "heure" (singular) and let fuzzy match handle the 's' difference (levenshtein is small).
        return `${hStr} heure${mStr}`;
    });

    // Replace standalone digits 0-10
    t = t.replace(/\b(\d)\b/g, (match) => numbers[parseInt(match)] || match);

    // Specific fixes for "On purge bébé"
    t = t.replace(/les hybrides/g, "les hébrides");
    t = t.replace(/\bbene\b/g, "ben");
    t = t.replace(/\bbain\b/g, "ben");

    // Paletot fixes
    t = t.replace(/\bpalto\b/g, "paletot");
    t = t.replace(/pas le t[oô]t?/g, "paletot");
    t = t.replace(/palle taux/g, "paletot");

    return t;
}

export function calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0.0;

    const normalize = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "") // Keep only alphanumeric
            .replace(/\s+/g, " ")
            .trim();

    // Clean specific misinterpretations before normal processing
    const s1 = normalize(cleanTranscript(str1));
    const s2 = normalize(cleanTranscript(str2));

    if (s1 === s2) return 1.0;

    // Levenshtein distance implementation
    const track = Array(s2.length + 1).fill(null).map(() =>
        Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
        track[j][0] = j;
    }

    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator, // substitution
            );
        }
    }

    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);

    return 1.0 - (distance / maxLength);
}
