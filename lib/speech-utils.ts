export type Emotion = 'neutral' | 'question' | 'exclamation' | 'hesitation' | 'anger' | 'sadness' | 'joy' | 'fear' | 'irony' | 'tenderness';

export interface TextSegment {
    text: string;
    emotion: Emotion;
    pauseAfter: number;
}

const NEXT_COMMANDS = ["passe", "passer", "je passe", "suivante", "suite", "suivant", "next", "joker"];
const PREV_COMMANDS = ["précédente", "retour", "reviens", "arrière", "répète", "précédent"];

/**
 * Check if text contains a "Next" voice command
 */
export function isNextCommand(text: string): boolean {
    const normalized = text.toLowerCase().replace(/[.,!?]/g, "").trim();
    return NEXT_COMMANDS.some(cmd =>
        normalized === cmd ||
        normalized.startsWith(cmd + " ") ||
        normalized.endsWith(" " + cmd) ||
        normalized.includes(cmd)
    );
}

/**
 * Check if text contains a "Previous" voice command
 */
export function isPrevCommand(text: string): boolean {
    const normalized = text.toLowerCase().replace(/[.,!?]/g, "").trim();
    return PREV_COMMANDS.some(cmd =>
        normalized === cmd ||
        normalized.startsWith(cmd + " ") ||
        normalized.endsWith(" " + cmd) ||
        normalized.includes(cmd)
    );
}

/**
 * Detect the emotional tone of a text segment
 */
export function detectEmotion(text: string): Emotion {
    const lower = text.toLowerCase();

    if ((text.match(/!/g) || []).length >= 2) return 'anger';
    if (text === text.toUpperCase() && text.length > 10) return 'anger';
    if (text.includes('...')) return 'hesitation';

    if (text.includes('?')) {
        const ironicPatterns = ['vraiment', 'sérieusement', 'vous croyez', 'tu crois', 'n\'est-ce pas'];
        if (ironicPatterns.some(p => lower.includes(p))) return 'irony';
        return 'question';
    }

    const joyWords = [
        'magnifique', 'merveilleux', 'excellent', 'bravo', 'parfait', 'génial', 'super', 'hourra', 'vive',
        'bonheur', 'heureux', 'heureuse', 'joie', 'ravir', 'ravi', 'ravie', 'enchanter', 'enchanté',
        'formidable', 'splendide', 'sublime', 'divin', 'adorable', 'chéri', 'chérie', 'amour',
        'victoire', 'triomphe', 'succès', 'miracle', 'prodige', 'merci'
    ];
    if (joyWords.some(w => lower.includes(w))) return 'joy';

    const angerWords = [
        'malheur', 'diable', 'damnation', 'sacrebleu', 'morbleu', 'tonnerre', 'idiot', 'imbécile',
        'fureur', 'rage', 'colère', 'déteste', 'haïr', 'haine', 'maudit', 'maudite', 'enfer',
        'scélérat', 'traître', 'misérable', 'infâme', 'monstre', 'démon', 'canaille',
        'insolent', 'impertinent', 'assez', 'taisez', 'silence', 'sortez', 'dehors'
    ];
    if (angerWords.some(w => lower.includes(w))) return 'anger';

    const sadWords = [
        'hélas', 'malheur', 'triste', 'mort', 'perdu', 'adieu', 'jamais plus',
        'larmes', 'pleurer', 'sanglot', 'douleur', 'souffrir', 'souffrance', 'peine',
        'abandonner', 'abandonné', 'seul', 'seule', 'solitude', 'désespoir',
        'mourir', 'fin', 'perdu', 'perdre', 'regret', 'regretter'
    ];
    if (sadWords.some(w => lower.includes(w))) return 'sadness';

    const fearWords = [
        'peur', 'effroi', 'terreur', 'trembler', 'frémir', 'épouvante',
        'au secours', 'à l\'aide', 'sauvez', 'fuyez', 'danger', 'menace',
        'horreur', 'horrible', 'affreux', 'effrayant', 'terrifiant'
    ];
    if (fearWords.some(w => lower.includes(w))) return 'fear';

    const tendernessWords = [
        'mon coeur', 'ma chère', 'mon cher', 'mon amour', 'ma douce', 'tendresse',
        'caresse', 'embrasser', 'baiser', 'doux', 'douce', 'gentle', 'cher ami'
    ];
    if (tendernessWords.some(w => lower.includes(w))) return 'tenderness';

    const ironyWords = ['certes', 'évidemment', 'bien sûr', 'naturellement', 'sans doute'];
    if (ironyWords.some(w => lower.includes(w)) && text.includes('!')) return 'irony';

    if (text.includes('!')) return 'exclamation';

    return 'neutral';
}

/**
 * Calculate pause duration after a segment (in ms)
 */
export function calculatePause(text: string): number {
    const vary = (base: number, variance: number) => base + Math.random() * variance;

    if (text.includes('...')) return vary(550, 150);
    if (/[!?]{2,}/.test(text)) return vary(500, 100);
    if (text.endsWith('?')) return vary(380, 80);
    if (text.endsWith('!')) return vary(350, 100);
    if (text.endsWith(';')) return vary(280, 60);
    if (text.endsWith(':')) return vary(320, 80);
    if (text.length < 30) return vary(180, 60);
    if (text.length > 100) return vary(400, 100);

    return vary(250, 80);
}

/**
 * Check if text contains any voice command
 */
export function isVoiceCommand(text: string): boolean {
    return isNextCommand(text) || isPrevCommand(text);
}

/**
 * Segment text into natural chunks with emotion detection
 */
export function segmentText(text: string): TextSegment[] {
    const rawSegments = text.split(/(?<=[.!?;])\s+/).filter(s => s.trim());

    return rawSegments.map(segment => {
        const emotion = detectEmotion(segment);
        const pauseAfter = calculatePause(segment);
        return { text: segment, emotion, pauseAfter };
    });
}

/**
 * Phonetic corrections for better theatrical French delivery
 */
export function applyPhoneticCorrections(text: string): string {
    return text
        .replace(/\b1\b/g, 'un')
        .replace(/\b2\b/g, 'deux')
        .replace(/\b3\b/g, 'trois')
        .replace(/\b4\b/g, 'quatre')
        .replace(/\b5\b/g, 'cinq')
        .replace(/\b10\b/g, 'dix')
        .replace(/\b100\b/g, 'cent')
        .replace(/\b1000\b/g, 'mille')
        .replace(/\bMr\b/gi, 'Monsieur')
        .replace(/\bMme\b/gi, 'Madame')
        .replace(/\bMlle\b/gi, 'Mademoiselle')
        .replace(/\bM\.\s/g, 'Monsieur ')
        .replace(/\bSt\-/gi, 'Saint-')
        .replace(/\bSte\-/gi, 'Sainte-')
        .replace(/\bHélas\b/gi, 'Hélàs')
        .replace(/\bMorbleu\b/gi, 'Morbleû')
        .replace(/\bPalsambleu\b/gi, 'Palsembleû')
        .replace(/\bParbleu\b/gi, 'Parbleû');
}
