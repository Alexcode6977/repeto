import { ParsedScript, ScriptLine, ScriptScene } from "./types";
import { COLLECTIVE_ROLES } from "./constants";

export interface ParseScriptV3Result extends ParsedScript {
    rawSpeakerLabels: string[];
    unresolvedLabels: string[];
}

const SCENE_HEADER_REGEX = /^(?:ACTE|SC[ÈE]NE|TABLEAU)\s+(?:[IVX0-9]+|PREMI[ÈE]RE?|DEUXI[ÈE]ME|TROISI[ÈE]ME|QUATRI[ÈE]ME|DERNI[ÈE]RE?)\b/i;
const SPEAKER_PREFIX_REGEX = /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s'’ʼ\-]{1,44})\s*[:\.,]\s*(.*)$/;
const SPEAKER_STANDALONE_REGEX = /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s'’ʼ\-]{1,44})\.?$/;
const SPEAKER_LOOSE_REGEX = /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ\s'’ʼ\-]{1,44})\s+(.+)$/;

const BLOCKED_SPEAKER_LABELS = new Set([
    "PERSONNAGES",
    "DISTRIBUTION",
    "RIDEAU",
    "FIN",
    "ACTE",
    "SCENE",
    "SCÈNE",
    "TABLEAU",
]);

const COLLECTIVE_SPEAKER_LABELS = new Set([
    "LES MEMES",
    "LES MÊMES",
    "LES MEMES.",
    "LES MÊMES.",
    "TOUS",
    "TOUTES",
    "TOUS LES DEUX",
    "TOUS DEUX",
    "TOUTES LES DEUX",
    "ENSEMBLE",
]);

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function normalizeSpeakerLabel(raw: string): string {
    let normalized = normalizeWhitespace(raw)
        .replace(/[’ʼ]/g, "'")
        .toUpperCase();

    normalized = normalized.replace(/[.,:;]+$/g, "");
    normalized = normalized.replace(/^VOIX\s+DE\s+LA\s+/i, "");
    normalized = normalized.replace(/^VOIX\s+DU\s+/i, "");
    normalized = normalized.replace(/^VOIX\s+DES\s+/i, "");
    normalized = normalized.replace(/^VOIX\s+DE\s+/i, "");
    normalized = normalized.replace(/^VOIX\s+(?:[A-ZÀ-ÖØ-Þ]+\s+)*D['’ʼ]\s*/i, "");
    normalized = normalizeWhitespace(normalized);

    return normalized;
}

function isCompositeOrCollectiveLabel(label: string): boolean {
    const normalized = normalizeSpeakerLabel(label);
    if (!normalized) return false;
    if (COLLECTIVE_ROLES.has(normalized)) return true;
    if (COLLECTIVE_SPEAKER_LABELS.has(normalized)) return true;
    if (/^(?:TOUS|TOUTES)(?:\s+LES)?\s+(?:DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;
    if (/^LES\s+(?:DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;
    if (/\bET\b|,|\/|&/.test(normalized)) return true;
    return false;
}

function isLikelySpeakerLabel(label: string): boolean {
    const normalized = normalizeSpeakerLabel(label);
    if (!normalized) return false;
    if (normalized.length < 2 || normalized.length > 48) return false;
    if (BLOCKED_SPEAKER_LABELS.has(normalized)) return false;
    if (/\d/.test(normalized)) return false;
    const words = normalized.split(" ").filter(Boolean);
    if (words.length > 6) return false;
    return words.some((word) => /[A-ZÀ-ÖØ-Þ]/.test(word));
}

function isLikelyCollectiveLabel(label: string): boolean {
    const normalized = normalizeSpeakerLabel(label);
    if (!normalized) return false;
    if (normalized.length < 2 || normalized.length > 48) return false;
    if (BLOCKED_SPEAKER_LABELS.has(normalized)) return false;
    if (COLLECTIVE_SPEAKER_LABELS.has(normalized)) return true;
    if (/^(?:TOUS|TOUTES)(?:\s+LES)?\s+(?:DEUX|TROIS|QUATRE|CINQ|[2-9])$/i.test(normalized)) return true;
    if (/^LES\s+(?:DEUX|TROIS|QUATRE|CINQ|[2-9])$/i.test(normalized)) return true;
    if (/\bET\b|,|\/|&/.test(normalized)) return true;
    return false;
}

function isLikelySpeakerToken(label: string): boolean {
    return isLikelySpeakerLabel(label) || isLikelyCollectiveLabel(label);
}

function normalizeStageDirectionText(text: string): string {
    const trimmed = normalizeWhitespace(text);
    if (!trimmed) return "";
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

function wrapStageDirection(text: string): string {
    const normalized = normalizeStageDirectionText(text);
    return normalized ? `(${normalized})` : "";
}

function shouldIgnoreLineAsNoise(line: string): boolean {
    if (!line) return true;
    if (/^\d+$/.test(line)) return true;
    if (/^-{1,3}\s*\d+\s*-{1,3}$/.test(line)) return true;
    return false;
}

function canonicalizeSceneTitle(line: string): string {
    return normalizeWhitespace(line);
}

function getUppercaseRatio(text: string): number {
    const letters = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || [];
    if (letters.length === 0) return 0;
    const uppercase = letters.filter((letter) => letter === letter.toUpperCase() && letter !== letter.toLowerCase()).length;
    return uppercase / letters.length;
}

function isLikelyEntrancePayload(payload: string): boolean {
    const normalized = normalizeWhitespace(payload);
    if (!normalized) return false;
    if (/[!?]/.test(normalized)) return false;
    if (normalized.length > 90) return false;
    const words = normalized.split(" ").filter(Boolean);
    if (words.length > 14) return false;

    const hasEntranceToken = /\b(PUIS|ET|ENTRE|ENTRENT|SORT|SORTENT|LES MEMES|LES MÊMES|TOUS|TOUTES)\b/i.test(normalized);
    const looksLikeUppercaseList = /^[A-ZÀ-ÖØ-Þ'’ʼ\-\s,]+$/.test(normalized);

    if (hasEntranceToken && getUppercaseRatio(normalized) >= 0.55) return true;
    if (looksLikeUppercaseList && getUppercaseRatio(normalized) >= 0.72) return true;
    return false;
}

function isLikelyCastOrEntranceLine(line: string): boolean {
    const normalized = normalizeWhitespace(line);
    if (!normalized) return false;
    if (SCENE_HEADER_REGEX.test(normalized)) return false;
    if (/[!?]/.test(normalized)) return false;
    if (normalized.length > 95) return false;
    if (getUppercaseRatio(normalized) < 0.72) return false;
    return /\b(PUIS|ET|ENTRE|ENTRENT|SORT|SORTENT|LES MEMES|LES MÊMES|TOUS|TOUTES)\b/i.test(normalized) || normalized.includes(",");
}

function splitLeadingStageCue(text: string): { cue: string; remaining: string } {
    const normalized = normalizeWhitespace(text);
    if (!normalized || normalized.startsWith("(")) {
        return { cue: "", remaining: normalized };
    }

    const firstDotIndex = normalized.indexOf(".");
    if (firstDotIndex <= 0) {
        return { cue: "", remaining: normalized };
    }

    const cue = normalizeWhitespace(normalized.slice(0, firstDotIndex + 1));
    const remaining = normalizeWhitespace(normalized.slice(firstDotIndex + 1));
    if (!remaining) {
        return { cue: "", remaining: normalized };
    }

    if (!/^[a-zà-öø-ÿ]/.test(cue)) {
        return { cue: "", remaining: normalized };
    }
    if (/[!?]/.test(cue)) {
        return { cue: "", remaining: normalized };
    }
    if (cue.length > 120) {
        return { cue: "", remaining: normalized };
    }

    const cueWordCount = cue.split(" ").filter(Boolean).length;
    if (cueWordCount > 16) {
        return { cue: "", remaining: normalized };
    }

    return { cue, remaining };
}

type InlineSegment = {
    type: "dialogue" | "stage";
    text: string;
};

function splitInlineParentheticals(text: string): InlineSegment[] {
    const parts = text.split(/(\([^()]*\))/g);
    const segments: InlineSegment[] = [];

    for (const part of parts) {
        const normalized = normalizeWhitespace(part);
        if (!normalized) continue;

        if (normalized.startsWith("(") && normalized.endsWith(")")) {
            const stage = normalizeStageDirectionText(normalized);
            if (stage) {
                segments.push({
                    type: "stage",
                    text: stage,
                });
            }
            continue;
        }

        segments.push({
            type: "dialogue",
            text: normalized,
        });
    }

    return segments;
}

function findNextMeaningfulLine(lines: string[], fromIndex: number): string | null {
    for (let i = fromIndex; i < lines.length; i += 1) {
        const candidate = normalizeWhitespace(lines[i] || "");
        if (!candidate) continue;
        if (shouldIgnoreLineAsNoise(candidate)) continue;
        return candidate;
    }
    return null;
}

export function parseScriptV3(rawText: string): ParseScriptV3Result {
    const lines = rawText
        .replace(/\t/g, " ")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => normalizeWhitespace(line));

    const scriptLines: ScriptLine[] = [];
    const scenes: ScriptScene[] = [];
    const rawSpeakerLabels = new Set<string>();
    const unresolvedLabels = new Set<string>();
    const dialogueCounts = new Map<string, number>();
    const knownSpeakers = new Set<string>();

    let idCounter = 0;
    let currentSpeaker: string | null = null;
    let currentDialogueBuffer: string[] = [];
    let currentStageBuffer: string[] = [];
    let hasSeenSceneHeader = false;
    let sceneLineCounter = 0;

    const flushStageBuffer = () => {
        if (currentStageBuffer.length === 0) return;
        const merged = normalizeWhitespace(currentStageBuffer.join(" "));
        currentStageBuffer = [];
        const wrapped = wrapStageDirection(merged);
        if (!wrapped) return;
        scriptLines.push({
            id: String(idCounter++),
            type: "stage_direction",
            character: "INDICATIONS",
            text: wrapped,
        });
    };

    const appendStage = (text: string) => {
        const normalized = normalizeStageDirectionText(text);
        if (!normalized) return;
        currentStageBuffer.push(normalized);
    };

    const pushDialogueLine = (speaker: string, text: string) => {
        scriptLines.push({
            id: String(idCounter++),
            type: "dialogue",
            character: speaker,
            text,
        });
        dialogueCounts.set(speaker, (dialogueCounts.get(speaker) || 0) + 1);
    };

    const pushDialogue = () => {
        flushStageBuffer();
        if (!currentSpeaker) return;
        const text = normalizeWhitespace(currentDialogueBuffer.join(" "));
        if (!text) return;

        const { cue, remaining } = splitLeadingStageCue(text);
        if (cue) {
            pushStage(cue);
        }

        const segments = splitInlineParentheticals(remaining);
        if (segments.length === 0) {
            pushDialogueLine(currentSpeaker, remaining);
            currentDialogueBuffer = [];
            return;
        }

        for (const segment of segments) {
            if (segment.type === "stage") {
                pushStage(segment.text);
                continue;
            }
            pushDialogueLine(currentSpeaker, segment.text);
        }

        currentDialogueBuffer = [];
    };

    const pushStage = (text: string) => {
        flushStageBuffer();
        const wrapped = wrapStageDirection(text);
        if (!wrapped) return;
        scriptLines.push({
            id: String(idCounter++),
            type: "stage_direction",
            character: "INDICATIONS",
            text: wrapped,
        });
    };

    const setCurrentSpeaker = (rawLabel: string, trailingText: string) => {
        pushDialogue();
        rawSpeakerLabels.add(rawLabel);
        currentSpeaker = normalizeSpeakerLabel(rawLabel);
        knownSpeakers.add(currentSpeaker);
        if (BLOCKED_SPEAKER_LABELS.has(currentSpeaker)) {
            unresolvedLabels.add(currentSpeaker);
        }
        currentDialogueBuffer = trailingText ? [trailingText] : [];
    };

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line || shouldIgnoreLineAsNoise(line)) continue;

        if (SCENE_HEADER_REGEX.test(line)) {
            pushDialogue();
            flushStageBuffer();
            currentSpeaker = null;
            currentDialogueBuffer = [];
            hasSeenSceneHeader = true;
            sceneLineCounter = 0;
            scenes.push({
                index: scriptLines.length,
                title: canonicalizeSceneTitle(line),
            });
            continue;
        }

        if (!hasSeenSceneHeader) {
            appendStage(line);
            continue;
        }

        if (!currentSpeaker && sceneLineCounter <= 2 && isLikelyCastOrEntranceLine(line)) {
            appendStage(line);
            sceneLineCounter += 1;
            continue;
        }

        const prefixMatch = line.match(SPEAKER_PREFIX_REGEX);
        if (prefixMatch && isLikelySpeakerToken(prefixMatch[1])) {
            const trailingText = normalizeWhitespace(prefixMatch[2] || "");
            if (!trailingText || (sceneLineCounter <= 3 && isLikelyEntrancePayload(trailingText))) {
                pushDialogue();
                currentSpeaker = null;
                currentDialogueBuffer = [];
                appendStage(line);
                sceneLineCounter += 1;
                continue;
            }

            setCurrentSpeaker(prefixMatch[1], trailingText);
            sceneLineCounter += 1;
            continue;
        }

        const standaloneMatch = line.match(SPEAKER_STANDALONE_REGEX);
        if (standaloneMatch && isLikelySpeakerToken(standaloneMatch[1])) {
            const nextMeaningful = findNextMeaningfulLine(lines, i + 1);
            const looksLikeHeading = nextMeaningful && (
                SCENE_HEADER_REGEX.test(nextMeaningful)
                || SPEAKER_STANDALONE_REGEX.test(nextMeaningful)
            );

            if (!looksLikeHeading) {
                setCurrentSpeaker(standaloneMatch[1], "");
                sceneLineCounter += 1;
                continue;
            }
        }

        const looseSpeakerMatch = line.match(SPEAKER_LOOSE_REGEX);
        if (looseSpeakerMatch && isLikelySpeakerToken(looseSpeakerMatch[1])) {
            const normalizedCandidate = normalizeSpeakerLabel(looseSpeakerMatch[1]);
            const trailingText = normalizeWhitespace(looseSpeakerMatch[2] || "");
            if (
                knownSpeakers.has(normalizedCandidate)
                && trailingText
                && !isLikelyEntrancePayload(trailingText)
            ) {
                setCurrentSpeaker(looseSpeakerMatch[1], trailingText);
                sceneLineCounter += 1;
                continue;
            }
        }

        if (!currentSpeaker) {
            appendStage(line);
            sceneLineCounter += 1;
            continue;
        }

        currentDialogueBuffer.push(line);
        sceneLineCounter += 1;
    }

    pushDialogue();

    if (scenes.length === 0) {
        scenes.push({
            index: 0,
            title: "SCÈNE 1",
        });
    }

    const characterCandidates = Array.from(dialogueCounts.entries())
        .filter(([label]) => !isCompositeOrCollectiveLabel(label))
        .filter(([label]) => !BLOCKED_SPEAKER_LABELS.has(label))
        .sort((a, b) => b[1] - a[1])
        .map(([label]) => label);

    const canonicalCharacters = Array.from(new Set(characterCandidates));
    const canonicalSet = new Set(canonicalCharacters);

    scriptLines.forEach((line) => {
        if (line.type !== "dialogue") return;
        if (canonicalSet.has(line.character)) return;
        if (isCompositeOrCollectiveLabel(line.character)) return;
        unresolvedLabels.add(line.character);
    });

    return {
        lines: scriptLines,
        scenes,
        characters: canonicalCharacters,
        rawSpeakerLabels: Array.from(rawSpeakerLabels).map((label) => normalizeSpeakerLabel(label)),
        unresolvedLabels: Array.from(unresolvedLabels),
    };
}

export function formatScriptAsCanonicalText(script: ParsedScript): string {
    const sceneByIndex = new Map<number, string>();
    (script.scenes || []).forEach((scene) => {
        sceneByIndex.set(scene.index, canonicalizeSceneTitle(scene.title || ""));
    });

    const blocks: string[] = [];
    for (let i = 0; i < (script.lines || []).length; i += 1) {
        const sceneTitle = sceneByIndex.get(i);
        if (sceneTitle) {
            blocks.push(sceneTitle);
        }

        const line = script.lines[i];
        if (!line) continue;

        if (line.type === "dialogue") {
            blocks.push(`[${normalizeSpeakerLabel(line.character)}]\n${normalizeWhitespace(line.text)}`);
        } else if (line.type === "stage_direction") {
            const wrapped = wrapStageDirection(line.text);
            if (wrapped) blocks.push(wrapped);
        }
    }

    return blocks.join("\n\n").trim();
}
