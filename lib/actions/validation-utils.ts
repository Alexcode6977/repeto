import { ScriptMappings } from "@/lib/types";
import { ImportDiagnosticsResult, ImportDecisionStatus } from "@/app/(protected)/dashboard/actions";

export function normalizeCharacterLabel(value: string): string {
    return (value || "")
        .replace(/[’ʼ]/g, "'")
        .toUpperCase()
        .replace(/[.,:;]+$/g, "")
        .replace(/^VOIX\s+DE\s+LA\s+/i, "")
        .replace(/^VOIX\s+DU\s+/i, "")
        .replace(/^VOIX\s+DES\s+/i, "")
        .replace(/^VOIX\s+DE\s+/i, "")
        .replace(/^VOIX\s+(?:[A-ZÀ-ÖØ-Þ]+\s+)*D['’ʼ]\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function detectCycles(aliases: Record<string, string>): boolean {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const dfs = (node: string): boolean => {
        if (visiting.has(node)) return true;
        if (visited.has(node)) return false;

        visiting.add(node);
        const next = aliases[node];
        if (next && aliases[next] && dfs(next)) return true;

        visiting.delete(node);
        visited.add(node);
        return false;
    };

    for (const key of Object.keys(aliases)) {
        if (dfs(key)) return true;
    }
    return false;
}

export function ensureAllBlockingDecisionsResolved(
    diagnostics: ImportDiagnosticsResult,
    decisions: Record<string, ImportDecisionStatus>
): { ok: true } | { ok: false; error: string } {
    for (const blocking of diagnostics.blockingDecisions) {
        const decision = decisions[blocking.id];
        if (decision !== "accept" && decision !== "reject") {
            return { ok: false, error: `Decision manquante pour: ${blocking.label}` };
        }
    }
    return { ok: true };
}

export function validateResolvedMappings(
    diagnostics: ImportDiagnosticsResult,
    decisions: Record<string, ImportDecisionStatus>,
    mappings: ScriptMappings
): { ok: true; sanitized: ScriptMappings } | { ok: false; error: string } {
    const decisionsCheck = ensureAllBlockingDecisionsResolved(diagnostics, decisions);
    if (!decisionsCheck.ok) return decisionsCheck;

    const sanitized: ScriptMappings = {
        canonical_characters: (mappings.canonical_characters || []).map((c) => normalizeCharacterLabel(c)).filter(Boolean),
        aliases: {},
        collectives: {
            global: [],
            by_scene: []
        }
    };

    const canonicalSet = new Set(sanitized.canonical_characters);
    const validPairs: Record<string, string> = {};

    for (const [rawSource, rawTarget] of Object.entries(mappings.aliases || {})) {
        const source = normalizeCharacterLabel(rawSource || "");
        const target = normalizeCharacterLabel(rawTarget || "");

        if (!source || !target || source === target) continue;
        if (!canonicalSet.has(target)) {
            let foundInAliases = false;
            let current = target;
            for (let i = 0; i < 5; i++) {
                current = normalizeCharacterLabel(mappings.aliases?.[current] || "");
                if (canonicalSet.has(current)) {
                    validPairs[source] = current;
                    foundInAliases = true;
                    break;
                }
                if (!current) break;
            }
            if (!foundInAliases) continue;
        } else {
            validPairs[source] = target;
        }
    }

    if (detectCycles(validPairs)) return { ok: false, error: "Des cycles ont ete detectes dans les alias." };
    sanitized.aliases = validPairs;

    const sanitizeCollectives = (list: any[], includeScene: boolean) => {
        return (list || []).map((item) => {
            const result: any = {
                label: normalizeCharacterLabel(item.label || ""),
                members: (item.members || [])
                    .map((member: string) => normalizeCharacterLabel(member))
                    .filter((m: string) => m && canonicalSet.has(m))
            };
            if (includeScene && typeof item.scene_index === "number") {
                result.scene_index = item.scene_index;
            }
            return result;
        }).filter((item) => item.label && item.members.length > 0);
    };

    sanitized.collectives = {
        global: sanitizeCollectives(mappings.collectives?.global || [], false),
        by_scene: sanitizeCollectives(mappings.collectives?.by_scene || [], true)
    };

    return { ok: true, sanitized };
}
