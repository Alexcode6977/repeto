"use server";

import { parseScript } from "@/lib/parser";
import { ParsedScript } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

// pdf-parse required inside action

const AI_CLEANING_PROMPT = `Tu es un expert en restructuration de scripts théâtraux pour le moteur "Repeto". Ta mission est de convertir le texte brut en un script standardisé.

### 1. FORMAT DE SORTIE (STRICT)
Pour chaque intervention, utilise ce modèle exact avec les sauts de ligne :

PERSO [NOM EN MAJUSCULES]
(Ligne vide)
REPLIQUE [Texte du dialogue]
(Ligne vide)

### 2. RÈGLES DE NETTOYAGE
- Supprime les balises \`[source]\`, les numéros de pages et les en-têtes.
- Supprime les lignes vides inutiles.

### 3. FILTRE ANTI-BRUIT (Les Faux Personnages)
Le texte contient des didascalies formatées comme des noms. Tu dois les détecter.
- **RÈGLE :** Un \`PERSO\` doit être un Nom Propre (ex: LUCIEN).
- **INTERDIT (Blacklist)** :
  1. Tout mot finissant par **"-MENT"** (ex: "SEULEMENT", "BRUSQUEMENT").
  2. Les adjectifs/actions : "FURIEUX", "AHURI", "INDIGNÉE", "ALLEZ", "HAUSSANT LES ÉPAULES", "APRÈS UN TEMPS", "ENSEMBLE", "VITE".
- **ACTION :** Si tu trouves un mot interdit isolé, ne crée pas de \`PERSO\`. Intègre-le au début de la \`REPLIQUE\` concernée entre parenthèses.
  *Exemple :* \`(Furieux) C'est faux !\`

### 4. RÈGLE DE DÉCOUPAGE (SEGMENTATION) - TRES IMPORTANT
Le texte source contient des erreurs OCR où deux personnages sont collés sur la même ligne.
Tu dois scanner l'intérieur des phrases.
- **SI** tu trouves un [NOM DE PERSONNAGE] en majuscules au milieu d'une phrase :
- **ALORS** tu dois couper le dialogue et créer une nouvelle entrée \`PERSO\`.

*Exemple du problème :*
Entrée : \`ANNETTE Oui moussié YVONNE Ah non !\`

*Sortie attendue (Tu dois séparer) :*
PERSO ANNETTE
REPLIQUE Oui moussié

PERSO YVONNE
REPLIQUE Ah non !

### 5. CAS SPÉCIAUX
- Si tu trouves "VOIX DE...", attribue le rôle au personnage cité.
  *Exemple :* "VOIX D'ANNETTE" -> PERSO ANNETTE / REPLIQUE (Voix) ...

Génère uniquement le script formaté.`;

/**
 * Clean and restructure a messy script using AI (GPT-4o-mini)
 * For Solo Pro users - Returns formatted text (PERSO/REPLIQUE)
 */
export async function cleanScriptWithAI(rawText: string): Promise<string | { error: string }> {
    try {
        console.log("[AI Clean] Starting AI cleaning, text length:", rawText.length);

        // Limit text length to avoid very long processing times
        const MAX_INPUT_CHARS = 80000;
        let textToProcess = rawText;

        if (rawText.length > MAX_INPUT_CHARS) {
            console.log("[AI Clean] Text too long, truncating from", rawText.length, "to", MAX_INPUT_CHARS);
            textToProcess = rawText.substring(0, MAX_INPUT_CHARS);
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 300000, // 5 minute timeout
        });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: AI_CLEANING_PROMPT },
                { role: "user", content: textToProcess }
            ],
            temperature: 0.3, // Low temperature for consistent formatting
            max_tokens: 16000, // Generous output limit
        });

        const cleanedText = response.choices[0]?.message?.content;

        if (!cleanedText) {
            return { error: "L'IA n'a pas pu nettoyer le script." };
        }

        console.log("[AI Clean] Cleaning complete, output length:", cleanedText.length);
        return cleanedText;
    } catch (error: any) {
        console.error("[AI Clean] Error:", error);

        // Handle timeout specifically
        if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            return { error: "Le nettoyage IA a pris trop de temps. Essayez avec un PDF plus court." };
        }

        return { error: error.message || "Erreur lors du nettoyage IA." };
    }
}

/**
 * Full AI-powered import: Extract PDF text, clean with AI, then parse with existing heuristic parser
 */
export async function importScriptWithAI(formData: FormData): Promise<ParsedScript | { error: string }> {
    const file = formData.get("file") as File;
    if (!file) return { error: "Pas de fichier" };

    try {
        console.log("[AI Import] Starting AI-powered import for:", file.name);

        // Step 1: Extract raw text from PDF
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdf = require("pdf-parse/lib/pdf-parse.js");
        const data = await pdf(buffer);

        console.log("[AI Import] Extracted text, length:", data.text.length);

        // Step 2: Clean with AI (returns formatted text with PERSO/REPLIQUE)
        const cleanedResult = await cleanScriptWithAI(data.text);

        if (typeof cleanedResult !== "string") {
            return cleanedResult; // Return error
        }

        // Step 3: Parse with existing heuristic parser (YOUR parser!)
        const script = parseScript(cleanedResult);

        if (script.lines.length === 0) {
            return { error: "L'IA a nettoyé le script mais aucun dialogue n'a été détecté. Vérifiez le format." };
        }

        // Add title from filename
        script.title = file.name.replace(".pdf", "");

        console.log("[AI Import] Success! Characters:", script.characters.length, "Lines:", script.lines.length);
        return script;
    } catch (error: any) {
        console.error("[AI Import] Error:", error);
        return { error: error.message || "Erreur lors de l'import IA." };
    }
}

/**
 * Get user's subscription tier for client-side UI decisions
 */
export async function getUserTierAction(): Promise<"free" | "solo_pro" | "troupe"> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return "free";

    const { getEffectiveTier } = await import("@/lib/subscription");
    return await getEffectiveTier(user.id);
}

export async function saveScript(script: ParsedScript) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("scripts")
        .insert({
            user_id: user.id,
            title: script.title || "Untitled Script",
            content: script,
        });

    if (error) {
        console.error("Error saving script:", error);
        throw new Error("Failed to save script");
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
}

export async function updateScriptContent(scriptId: string, newScript: ParsedScript) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check ownership
    const { data: existingScript } = await supabase
        .from("scripts")
        .select("user_id")
        .eq("id", scriptId)
        .single();

    if (!existingScript || existingScript.user_id !== user.id) {
        throw new Error("Unauthorized: You can only update your own scripts");
    }

    const { error } = await supabase
        .from("scripts")
        .update({
            title: newScript.title,
            content: newScript,
        })
        .eq("id", scriptId);

    if (error) {
        console.error("Error updating script:", error);
        throw new Error("Failed to update script");
    }

    revalidatePath("/dashboard");
}

export async function renameScriptAction(scriptId: string, newTitle: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check ownership
    const { data: existingScript } = await supabase
        .from("scripts")
        .select("user_id")
        .eq("id", scriptId)
        .single();

    if (!existingScript || existingScript.user_id !== user.id) {
        throw new Error("Unauthorized: You can only rename your own scripts");
    }

    const { error } = await supabase
        .from("scripts")
        .update({
            title: newTitle,
        })
        .eq("id", scriptId);

    if (error) {
        console.error("Error renaming script:", error);
        throw new Error("Failed to rename script");
    }

    revalidatePath("/dashboard");
}

const ADMIN_EMAIL = "alex69.sartre@gmail.com";

export async function getScripts() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Fetch User's scripts OR Public scripts
    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at, user_id, is_public")
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching scripts:", error);
        return [];
    }

    return data.map((row) => ({
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        characterCount: row.content?.characters?.length || 0,
        lineCount: row.content?.lines?.length || 0,
        is_public: row.is_public || false,
        is_owner: row.user_id === user.id,
    }));
}

export async function togglePublicStatus(scriptId: string, currentStatus: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== ADMIN_EMAIL) {
        throw new Error("Unauthorized: Only Admin can manage library.");
    }

    const { error } = await supabase
        .from("scripts")
        .update({ is_public: !currentStatus })
        .eq("id", scriptId);

    if (error) throw new Error("Failed to update public status");

    revalidatePath("/dashboard");
}

export async function getScriptById(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Allow access if owner OR if public
    const { data, error } = await supabase
        .from("scripts")
        .select("id, title, content, created_at, user_id, is_public")
        .eq("id", id)
        .single();

    if (error || !data) {
        return null;
    }

    // Security Check: Must be owner OR script must be public
    if (data.user_id !== user.id && !data.is_public) {
        throw new Error("Unauthorized access to this script.");
    }

    return {
        id: data.id,
        title: data.title,
        ...data.content,
        created_at: data.created_at,
        is_public: data.is_public
    };
}

export async function deleteScript(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check if script is public before deleting
    const { data: script } = await supabase.from("scripts").select("is_public, user_id").eq("id", id).single();

    if (script?.is_public && user.email !== ADMIN_EMAIL) {
        throw new Error("Cannot delete a public library script.");
    }

    const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Standard users can only delete their own. Admin usually owns the public ones anyway.

    if (error) {
        console.error("Error deleting script:", error);
        throw new Error("Failed to delete script");
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
}
export async function parsePdfAction(formData: FormData): Promise<ParsedScript | { error: string }> {
    const file = formData.get("file") as File;
    if (!file) return { error: "No file provided" };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // REMOVED AI VISION FORCING - Reverting to robust heuristic parsing
        console.log("[Action] Using Heuristic-Guided parsing (No AI)");
        return await parseWithRegex(buffer);

    } catch (error) {
        console.error("Error parsing PDF:", error);
        return { error: "Failed to parse PDF file." };
    }
}



// Helper function for regex-based parsing
async function parseWithRegex(buffer: Buffer, validatedCharacters?: string[]): Promise<ParsedScript | { error: string }> {
    const pdf = require("pdf-parse/lib/pdf-parse.js");
    const { parseScript } = await import("@/lib/parser");

    // OPTION 1: Try standard pdf-parse text first (better for some fonts)
    const standardResult = await pdf(buffer);
    const standardText = standardResult.text;

    // Check if standard extraction looks good (has PERSO lines and no obvious corruption)
    const hasPersoLines = /^PERSO\s+/im.test(standardText);
    const hasCorruption = /[a-z][A-Z][a-z]/.test(standardText); // Pattern like "aSl" indicates font issues

    console.log("[Action] Standard extraction check - PERSO:", hasPersoLines, "Corruption:", hasCorruption);

    let cleanRawText: string;
    let allItems: { str: string; x: number; y: number; w: number }[] = [];

    // For PERSO format with clean text, use standard extraction
    if (hasPersoLines && !hasCorruption) {
        console.log("[Action] Using standard pdf-parse text extraction");
        cleanRawText = standardText;
    } else {
        console.log("[Action] Using custom text reconstruction (layout-aware)");

        const render_page = (pageData: any) => {
            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            };
            return pageData.getTextContent(render_options).then((textContent: any) => {
                for (const item of textContent.items) {
                    const str = item.str;
                    const x = item.transform[4];
                    const y = item.transform[5];
                    const w = item.width;

                    if (str.trim().length === 0 && w < 2) continue;
                    allItems.push({ str, x, y, w });
                }
                return "";
            });
        };

        await pdf(buffer, { pagerender: render_page });

        // RECONSTRUCTION: Build text respecting visual layout
        let cleanRawText = "";
        let lastY = -1;
        let lastX = -1;
        let lastWidth = 0;

        for (const item of allItems) {
            const isNewLine = lastY !== -1 && Math.abs(item.y - lastY) > 6;

            if (isNewLine) {
                cleanRawText += "\n";
                lastX = -1;
            } else {
                if (lastX !== -1) {
                    const gap = item.x - (lastX + lastWidth);
                    if (gap > 2) {
                        cleanRawText += " ";
                    }
                }
            }

            cleanRawText += item.str;

            lastY = item.y;
            lastX = item.x;
            lastWidth = item.w;
        }

        console.log("[Action] Text Reconstructed. Length:", cleanRawText.length);

        // DIAGNOSTIC: Detect text corruption (afflige -> aSlige issue)
        if (cleanRawText.toLowerCase().includes('slige') || cleanRawText.includes('aS')) {
            console.log("[Action] WARNING: Detected potential text corruption (aSlige pattern)");
            // Log a sample of the raw items around the corruption
            const corruptedItems = allItems.filter(item =>
                item.str.toLowerCase().includes('slige') || item.str.includes('aS')
            );
            if (corruptedItems.length > 0) {
                console.log("[Action] Corrupted items:", corruptedItems.slice(0, 5));
            }
        }

        // LIGATURE NORMALIZATION: Fix common PDF OCR issues
        // Some PDFs use typographic ligatures that pdf-parse doesn't decode properly
        const ligatureMap: Record<string, string> = {
            '\uFB00': 'ff',  // ﬀ
            '\uFB01': 'fi',  // ﬁ
            '\uFB02': 'fl',  // ﬂ
            '\uFB03': 'ffi', // ﬃ
            '\uFB04': 'ffl', // ﬄ
            '\uFB05': 'st',  // ﬅ (long st)
            '\uFB06': 'st',  // ﬆ
            '\u0132': 'IJ',  // Ĳ
            '\u0133': 'ij',  // ĳ
            '\u0152': 'OE',  // Œ
            '\u0153': 'oe',  // œ
            '\u00C6': 'AE',  // Æ
            '\u00E6': 'ae',  // æ
        };

        for (const [ligature, replacement] of Object.entries(ligatureMap)) {
            cleanRawText = cleanRawText.replace(new RegExp(ligature, 'g'), replacement);
        }

        const script = parseScript(cleanRawText, validatedCharacters);

        if (script.lines.length === 0) {
            return { error: "Could not detect any dialogue lines. Ensure the script uses standard formatting (CHARACTER NAMES in CAPS)." };
        }

        return script;
    }

    // Standard extraction path (PERSO format with clean text)
    const script = parseScript(cleanRawText, validatedCharacters);

    if (script.lines.length === 0) {
        return { error: "Could not detect any dialogue lines. Ensure the script uses standard formatting (CHARACTER NAMES in CAPS)." };
    }

    return script;
}

export async function detectCharactersAction(formData: FormData): Promise<{ title?: string, characters: string[] } | { error: string }> {
    const file = formData.get("file") as File;
    if (!file) return { error: "Pas de fichier" };

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        const { detectCharactersHeuristic } = await import("@/lib/parser");
        const pdf = require("pdf-parse/lib/pdf-parse.js");

        // Use the SAME text reconstruction as finalizeParsingAction
        // This ensures characters detected here will also be found in parsing
        let allItems: { str: string; x: number; y: number; w: number }[] = [];

        const render_page = (pageData: any) => {
            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            };
            return pageData.getTextContent(render_options).then((textContent: any) => {
                for (const item of textContent.items) {
                    const str = item.str;
                    const x = item.transform[4];
                    const y = item.transform[5];
                    const w = item.width;

                    if (str.trim().length === 0 && w < 2) continue;
                    allItems.push({ str, x, y, w });
                }
                return "";
            });
        };

        await pdf(buffer, { pagerender: render_page });

        // Reconstruct text (same logic as parseWithRegex)
        let cleanRawText = "";
        let lastY = -1;
        let lastX = -1;
        let lastWidth = 0;

        for (const item of allItems) {
            const isNewLine = lastY !== -1 && Math.abs(item.y - lastY) > 6;

            if (isNewLine) {
                cleanRawText += "\n";
                lastX = -1;
            } else {
                if (lastX !== -1) {
                    const gap = item.x - (lastX + lastWidth);
                    if (gap > 2) {
                        cleanRawText += " ";
                    }
                }
            }

            cleanRawText += item.str;

            lastY = item.y;
            lastX = item.x;
            lastWidth = item.w;
        }

        console.log("[Action] Detection using reconstructed text. Length:", cleanRawText.length);

        // Apply same ligature normalization as parseWithRegex
        const ligatureMap: Record<string, string> = {
            '\uFB00': 'ff', '\uFB01': 'fi', '\uFB02': 'fl', '\uFB03': 'ffi', '\uFB04': 'ffl',
            '\uFB05': 'st', '\uFB06': 'st', '\u0132': 'IJ', '\u0133': 'ij',
            '\u0152': 'OE', '\u0153': 'oe', '\u00C6': 'AE', '\u00E6': 'ae',
        };
        for (const [ligature, replacement] of Object.entries(ligatureMap)) {
            cleanRawText = cleanRawText.replace(new RegExp(ligature, 'g'), replacement);
        }

        return detectCharactersHeuristic(cleanRawText);
    } catch (error: any) {
        console.error("[Action] Detect error:", error);
        return { error: error.message };
    }
}

export async function finalizeParsingAction(formData: FormData, characters: string[]): Promise<ParsedScript | { error: string }> {
    const file = formData.get("file") as File;
    if (!file) return { error: "Pas de fichier" };

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        // Use the guided parse with validated characters
        return await parseWithRegex(buffer, characters);
    } catch (error: any) {
        console.error("[Action] Finalize error:", error);
        return { error: error.message };
    }
}
