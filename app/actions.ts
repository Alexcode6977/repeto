"use server";

import { parseScript } from "@/lib/parser";
import { ParsedScript } from "@/lib/types";
const pdf = require("pdf-parse/lib/pdf-parse.js");

export async function parsePdfAction(formData: FormData): Promise<ParsedScript | { error: string }> {
    console.log("[Action] Parsing PDF with Structural Reconstruction (No Filtering)...");
    const file = formData.get("file") as File;

    if (!file) {
        return { error: "No file provided" };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // EXTRACTION: Capture layout data for precise text reconstruction
        let allItems: { str: string; x: number; y: number; w: number; h: number }[] = [];

        const render_page = (pageData: any) => {
            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            };
            return pageData.getTextContent(render_options).then((textContent: any) => {
                for (const item of textContent.items) {
                    const str = item.str;
                    // transform: [scaleX, skewY, skewX, scaleY, x, y]
                    const x = item.transform[4];
                    const y = item.transform[5];
                    const w = item.width;
                    const h = Math.abs(item.transform[3]); // Height (scaleY)

                    if (str.trim().length === 0 && w < 2) continue; // Skip empty tiny items

                    allItems.push({ str, x, y, w, h });
                }
                return ""; // We construct text manually
            });
        };

        await pdf(buffer, { pagerender: render_page });

        // RECONSTRUCTION: Build text respecting visual layout (Newlines & Spaces)
        let cleanRawText = "";
        let lastY = -1;
        let lastX = -1;
        let lastWidth = 0;
        let lastHeight = 0;

        for (const item of allItems) {
            // Newline Detection (Significant Y change)
            // PDF coords: Y=0 at bottom.
            // threshold: 70% of current or last line height
            const threshold = (item.h || lastHeight || 10) * 0.7;
            const isNewLine = lastY !== -1 && Math.abs(item.y - lastY) > threshold;

            if (isNewLine) {
                cleanRawText += "\n";
                lastX = -1; // Reset X tracking
            } else {
                // Space Detection (Significant X gap)
                if (lastX !== -1) {
                    const gap = item.x - (lastX + lastWidth);
                    // gap > 15% of font height usually means a space
                    const spaceThreshold = (item.h || 10) * 0.15;
                    if (gap > spaceThreshold) {
                        cleanRawText += " ";
                    }
                }
            }

            cleanRawText += item.str;

            lastY = item.y;
            lastX = item.x;
            lastWidth = item.w;
            lastHeight = item.h;
        }

        console.log("[Action] Text Reconstructed. Length:", cleanRawText.length);
        // console.log("[Action] Preview:", cleanRawText.substring(0, 200));

        // Parse text into structured script
        const script = parseScript(cleanRawText);

        if (script.lines.length === 0) {
            return { error: "Could not detect any dialogue lines. Ensure the script uses standard formatting (CHARACTER NAMES in CAPS)." };
        }

        return script;
    } catch (error) {
        console.error("Error parsing PDF:", error);
        return { error: "Failed to parse PDF file." };
    }
}
