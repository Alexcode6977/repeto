"use server";

import OpenAI from "openai";
import { ParsedScript, ScriptLine, ScriptScene } from "@/lib/types";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const CHARACTER_DETECTION_PROMPT = `Tu es un expert en analyse de scripts de théâtre français.
ANALYSE ces pages de script et identifie UNIQUEMENT :
1. Le titre de la pièce
2. La liste complète des personnages présents dans ces pages.

RÈGLES :
- Un personnage est une personne qui parle ou qui est mentionnée dans les "Personnages" au début.
- Retourne les noms en MAJUSCULES.
- Ne l'invente pas de personnages.

FORMAT JSON STRICT :
{
  "title": "Titre",
  "characters": ["NOM1", "NOM2"]
}`;

const PARSE_GUIDED_PROMPT = (characters: string[]) => `Tu es un expert en analyse de scripts de théâtre français.
ANALYSE ces pages et extrais les répliques UNIQUEMENT pour les personnages suivants : ${characters.join(", ")}.

FORMAT JSON STRICT :
{
  "lines": [
    {"character": "NOM", "text": "texte", "type": "dialogue"},
    {"character": "SCENE", "text": "Titre Scène", "type": "scene_heading"}
  ],
  "scenes": [{"index": 0, "title": "Titre Scène"}]
}

RÈGLES :
1. N'utilise QUE les noms de personnages fournis.
2. Si un personnage n'est pas dans la liste, ignore sa réplique ou essaie de la rattacher si c'est une variante évidente.
3. Ne pas inclure de didascalies (parenthèses).
4. Retourne UNIQUEMENT le JSON.`;


/**
 * Step 1: Detect characters from a few sample pages
 */
export async function detectCharactersWithVision(pdfBuffer: Buffer): Promise<{ title?: string, characters: string[] } | { error: string }> {
    try {
        console.log("[Vision Parser] Detecting characters...");
        const mupdf = await import("mupdf");
        const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
        const totalPages = doc.countPages();

        // Multi-stage sampling to catch all characters:
        // 1. First 4 pages (usually contains characters list/intro)
        // 2. 1 page every 10 pages for the rest of the document
        // 3. Last 2 pages
        const pagesToSample = new Set<number>();

        // Headers (intro/personnages)
        for (let i = 0; i < Math.min(4, totalPages); i++) pagesToSample.add(i);

        // Sampling middle
        for (let i = 4; i < totalPages; i += 10) pagesToSample.add(i);

        // Footers (end of play)
        if (totalPages > 1) pagesToSample.add(totalPages - 1);
        if (totalPages > 2) pagesToSample.add(totalPages - 2);

        const sortedPages = Array.from(pagesToSample).sort((a, b) => a - b);
        console.log(`[Vision Parser] Sampling ${sortedPages.length} pages for characters: ${sortedPages.join(", ")}`);

        const images: string[] = [];
        for (const pageIdx of sortedPages) {
            const page = doc.loadPage(pageIdx);
            const pixmap = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
            images.push(Buffer.from(pixmap.asPNG()).toString("base64"));
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: CHARACTER_DETECTION_PROMPT },
                    ...images.map(base64 => ({
                        type: "image_url" as const,
                        image_url: { url: `data:image/png;base64,${base64}`, detail: "high" as const }
                    }))
                ]
            }],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return { error: "Pas de réponse de l'IA" };

        const result = JSON.parse(content);
        return {
            title: result.title,
            characters: result.characters || []
        };
    } catch (error: any) {
        console.error("[Vision Parser] Detect error:", error);
        return { error: error.message };
    }
}

/**
 * Step 2: Full parse with validated characters - Processed in chunks to avoid TPM limits
 */
export async function parsePdfWithVision(pdfBuffer: Buffer, validatedCharacters: string[]): Promise<ParsedScript | { error: string }> {
    try {
        console.log(`[Vision Parser] Starting deep parse for ${validatedCharacters.join(", ")}`);
        const mupdf = await import("mupdf");
        const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
        const totalPages = doc.countPages();

        const allLines: ScriptLine[] = [];
        const allScenes: ScriptScene[] = [];
        const maxPagesTotal = Math.min(totalPages, 100); // Allow up to 100 pages total
        const batchSize = 10; // 10 pages per request to stay under 30k TPM

        let previousContextLines: any[] = [];

        for (let i = 0; i < maxPagesTotal; i += batchSize - 1) { // 1 page overlap
            const currentBatchEnd = Math.min(i + batchSize, maxPagesTotal);
            console.log(`[Vision Parser] Processing batch: pages ${i} to ${currentBatchEnd - 1} (Overlap: 1 page)`);

            const images: string[] = [];
            for (let j = i; j < currentBatchEnd; j++) {
                const page = doc.loadPage(j);
                const pixmap = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
                images.push(Buffer.from(pixmap.asPNG()).toString("base64"));
            }

            const contextText = previousContextLines.length > 0
                ? `\nCONTEXTE: Les dernières lignes lues précédemment étaient : ${JSON.stringify(previousContextLines)}. \nNe RÉPÈTE PAS ces lignes, mais assure-toi que la suite est cohérente.`
                : "";

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: PARSE_GUIDED_PROMPT(validatedCharacters) + contextText },
                        ...images.map(base64 => ({
                            type: "image_url" as const,
                            image_url: { url: `data:image/png;base64,${base64}`, detail: "low" as const }
                        }))
                    ]
                }],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0]?.message?.content;
            if (!content) continue;

            const parsed = JSON.parse(content);

            // Add lines from this batch, filtering out exact duplicates of context
            if (parsed.lines && Array.isArray(parsed.lines)) {
                parsed.lines.forEach((line: any) => {
                    // Primitive check to avoid repetition of context lines
                    const isDuplicate = previousContextLines.some(prev =>
                        prev.character === line.character &&
                        prev.text.trim() === line.text.trim()
                    );

                    if (!isDuplicate) {
                        allLines.push({
                            id: String(allLines.length),
                            character: line.character || "INCONNU",
                            text: line.text || "",
                            type: line.type === "scene_heading" ? "scene_heading" : "dialogue",
                        });
                    }
                });

                // Update context for next batch (last 3 lines)
                previousContextLines = parsed.lines.slice(-3).map((l: any) => ({ character: l.character, text: l.text }));
            }

            // Add scenes from this batch (de-duplicated by title)
            if (parsed.scenes && Array.isArray(parsed.scenes)) {
                parsed.scenes.forEach((scene: any) => {
                    const isNew = !allScenes.some(s => s.title === scene.title);
                    if (isNew) {
                        allScenes.push({
                            index: i + (scene.index || 0),
                            title: scene.title
                        });
                    }
                });
            }

            // Small delay to prevent hitting rate limits
            if (i + batchSize < maxPagesTotal) {
                console.log("[Vision Parser] Batch complete, waiting 1s before next batch...");
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        return {
            title: "Script",
            characters: validatedCharacters,
            lines: allLines,
            scenes: allScenes,
        };
    } catch (error: any) {
        console.error("[Vision Parser] Parse error:", error);
        return { error: error.message };
    }
}
