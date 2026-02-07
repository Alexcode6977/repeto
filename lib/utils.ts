import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ParsedScript } from "./types";
import { COLLECTIVE_ROLES } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function isCollectiveCharacterLabel(characterName: string): boolean {
  const normalized = characterName.toUpperCase().trim();

  if (COLLECTIVE_ROLES.has(normalized)) return true;
  if (/^TOUS(?:\s+LES)?\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;
  if (/^TOUTES(?:\s+LES)?\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;
  if (/^LES\s+(DEUX|TROIS|QUATRE|CINQ|[2-5])$/i.test(normalized)) return true;

  return false;
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
    script.lines.forEach(line => {
      if (line.type === 'dialogue' && line.character) {
        chars.add(line.character.toUpperCase());
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
      if (line.type === 'dialogue' && line.character) {
        // Determine the clean character name (e.g., removing VOIX DE...)
        // For simplicity here we assume the parser has already cleaned it mostly, 
        // but we might want to normalize. 
        // However, line.character from parsed script is usually trustworthy.
        charsInScene.add(line.character.toUpperCase());
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
 */
export function isUserLine(characterName: string, userCharacters: string[], activeSceneCharacters?: Set<string>): boolean {
  if (!characterName || !userCharacters || userCharacters.length === 0) return false;

  const normalizedLineChar = characterName.toUpperCase().trim();

  // 1. Direct Match: Is this specific character assigned to the user?
  // We check parts too because sometimes names are "Romeo, Juliette" and user is "Romeo"
  const lineParts = normalizedLineChar.split(/[\s,]+/).map(p => p.trim());

  const isDirectMatch = userCharacters.some(userChar => {
    const normalizedUserChar = (userChar || "").toUpperCase().trim();
    return normalizedLineChar === normalizedUserChar || lineParts.includes(normalizedUserChar);
  });

  if (isDirectMatch) return true;

  // 2. Collective Roles Match (TOUS, ENSEMBLE...)
  // Only applies if the user actually has a character present in the active scene (if context provided)
  if (isCollectiveCharacterLabel(normalizedLineChar)) {
    if (activeSceneCharacters) {
      // Check if ANY of the user's characters are in the scene
      const userHasCharInScene = userCharacters.some(userChar =>
        activeSceneCharacters.has(userChar.toUpperCase().trim())
      );
      return userHasCharInScene;
    } else {
      // Fallback if no scene context (e.g. legacy behavior or simple list view): Always true for collective
      return true;
    }
  }

  return false;
}
