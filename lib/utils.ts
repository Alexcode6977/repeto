import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ParsedScript } from "./types";
import { COLLECTIVE_ROLES } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeLabel(value: string): string {
  return (value || "").toUpperCase().trim();
}

export function resolveLineCharacter(script: ParsedScript, characterName: string): string {
  if (!characterName) return "";
  const normalized = normalizeLabel(characterName);
  const mapped = script.mappings?.aliases?.[normalized];
  return mapped ? normalizeLabel(mapped) : normalized;
}

function isCollectiveCharacterLabel(characterName: string): boolean {
  const normalized = normalizeLabel(characterName);

  if (COLLECTIVE_ROLES.has(normalized)) return true;
  if (/^TOUS(?:\s+LES)?\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;
  if (/^TOUTES(?:\s+LES)?\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;
  if (/^LES\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;

  return false;
}

export function getSceneStartIndexForLine(script: ParsedScript, lineIndex: number): number {
  let currentStart = 0;
  for (const scene of script.scenes || []) {
    if (scene.index <= lineIndex) {
      currentStart = scene.index;
    } else {
      break;
    }
  }
  return currentStart;
}

function getSceneOrderForLine(script: ParsedScript, lineIndex: number): number {
  if (!script.scenes || script.scenes.length === 0) return 0;
  let sceneOrder = 0;
  for (let i = 0; i < script.scenes.length; i++) {
    if (script.scenes[i].index <= lineIndex) {
      sceneOrder = i;
    } else {
      break;
    }
  }
  return sceneOrder;
}

/**
 * Resolve collective members for a specific script line using saved mappings.
 * Returns undefined when no mapping applies.
 */
export function getCollectiveMembersForLine(script: ParsedScript, lineIndex: number): Set<string> | undefined {
  const line = script.lines?.[lineIndex];
  if (!line || !line.character) return undefined;

  const mappings = script.mappings?.collectives;
  if (!mappings) return undefined;

  const lineLabel = resolveLineCharacter(script, line.character);
  const currentSceneStart = getSceneStartIndexForLine(script, lineIndex);
  const currentSceneOrder = getSceneOrderForLine(script, lineIndex);

  const sceneMatch = mappings.by_scene?.find((item) => {
    const labelMatch = normalizeLabel(item.label) === lineLabel;
    if (!labelMatch) return false;
    // Backward compatible: accept either real scene start index or scene order.
    return item.scene_index === currentSceneStart || item.scene_index === currentSceneOrder;
  });

  if (sceneMatch && sceneMatch.members?.length > 0) {
    return new Set(sceneMatch.members.map((member) => normalizeLabel(member)).filter(Boolean));
  }

  const globalMatch = mappings.global?.find((item) => normalizeLabel(item.label) === lineLabel);
  if (globalMatch && globalMatch.members?.length > 0) {
    return new Set(globalMatch.members.map((member) => normalizeLabel(member)).filter(Boolean));
  }

  return undefined;
}

/**
 * Pre-calculate a map of scene start indexes to the set of characters present in that scene.
 * This allows O(1) lookups during runtime.
 */
export function getSceneCharacters(script: ParsedScript): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();

  if (!script.lines || script.lines.length === 0) return map;

  // Use script.scenes to determine boundaries
  const sortedScenes = [...(script.scenes || [])].sort((a, b) => a.index - b.index);

  // If no explicit scenes defined, treat whole script as one scene
  if (sortedScenes.length === 0) {
    const chars = new Set<string>();
    script.lines.forEach((line, index) => {
      if (line && line.type === 'dialogue' && line.character) {
        chars.add(resolveLineCharacter(script, line.character));
        const collectiveMembers = getCollectiveMembersForLine(script, index);
        collectiveMembers?.forEach((member) => chars.add(member));
      }
    });
    map.set(0, chars);
    return map;
  }

  // Process each scene range
  for (let i = 0; i < sortedScenes.length; i++) {
    const currentScene = sortedScenes[i];
    const nextScene = sortedScenes[i + 1];
    const startIdx = currentScene.index;
    const endIdx = nextScene ? nextScene.index : script.lines.length;

    const charsInScene = new Set<string>();
    for (let j = startIdx; j < endIdx; j++) {
      const line = script.lines[j];
      if (line && line.type === 'dialogue' && line.character) {
        charsInScene.add(resolveLineCharacter(script, line.character));
        const collectiveMembers = getCollectiveMembersForLine(script, j);
        collectiveMembers?.forEach((member) => charsInScene.add(member));
      }
    }
    map.set(startIdx, charsInScene);
  }

  return map;
}

/**
 * Determines if a given line belongs to the user.
 * 
 * @param characterName The character name of the current line
 * @param userCharacters The list of characters assigned to the user
 * @param activeSceneCharacters (Optional) The set of characters present in the current scene. 
 *                              If provided, checking for collective roles (TOUS) will only return true 
 *                              if the user has a character in that scene.
 * @param collectiveMembers (Optional) The explicit resolved members for the
 *                              collective line (if mappings are available).
 */
export function isUserLine(
  script: ParsedScript,
  characterName: string,
  userCharacters: string[],
  activeSceneCharacters?: Set<string>,
  collectiveMembers?: Set<string>
): boolean {
  if (!characterName || !userCharacters || userCharacters.length === 0) return false;

  const resolvedLineChar = resolveLineCharacter(script, characterName);

  // 1. Direct Match: Is this specific character assigned to the user?
  // We check parts too because sometimes names are "Romeo, Juliette" and user is "Romeo"
  const lineParts = resolvedLineChar.split(/[\s,]+/).map(p => p.trim());

  const isDirectMatch = userCharacters.some(userChar => {
    const normalizedUserChar = normalizeLabel(userChar || "");
    return resolvedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
  });

  if (isDirectMatch) return true;

  // 2. Explicit collective mapping (preferred when available)
  if (collectiveMembers && collectiveMembers.size > 0) {
    return userCharacters.some((userChar) => collectiveMembers.has(normalizeLabel(userChar)));
  }

  // 2. Collective Roles Match (TOUS, ENSEMBLE...)
  // Only applies if the user actually has a character present in the active scene (if context provided)
  if (isCollectiveCharacterLabel(resolvedLineChar)) {
    if (activeSceneCharacters) {
      // Check if ANY of the user's characters are in the scene
      const userHasCharInScene = userCharacters.some(userChar =>
        activeSceneCharacters.has(normalizeLabel(userChar))
      );
      return userHasCharInScene;
    } else {
      // Fallback if no scene context (e.g. legacy behavior or simple list view): Always true for collective
      return true;
    }
  }

  return false;
}
