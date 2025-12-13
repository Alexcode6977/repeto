"use server";

import { parseScript } from "@/lib/parser";
import { ParsedScript } from "@/lib/types";
const pdf = require("pdf-parse/lib/pdf-parse.js");

export async function parsePdfAction(formData: FormData): Promise<ParsedScript | { error: string }> {
    console.log("[Action] Parsing PDF with Font Filtering...");
    const file = formData.get("file") as File;

    if (!file) {
        return { error: "No file provided" };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Advanced Parsing: Capture Font IDs to detect Italics/Stage Directions

        let allItems: { str: string, font: string, y: number, hasParens: boolean }[] = [];

        const render_page = (pageData: any) => {
            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            };
            return pageData.getTextContent(render_options).then((textContent: any) => {
                let lastY = -1;
                let pageText = "";

                for (const item of textContent.items) {
                    const str = item.str;
                    const font = item.fontName;
                    // transform is [scaleX, skewY, skewX, scaleY, x, y]
                    const y = item.transform && item.transform.length >= 6 ? item.transform[5] : 0;

                    allItems.push({ str, font, y, hasParens: str.includes("(") || str.includes(")") });

                    // Simple reconstruction for logging/fallback (adds newline if Y changes)
                    if (lastY !== -1 && Math.abs(y - lastY) > 5) {
                        pageText += "\n";
                    }
                    pageText += str;
                    lastY = y;
                }
                return pageText;
            });
        };

        const options = {
            pagerender: render_page,
        };

        const data = await pdf(buffer, options);
        // data.text now contains our manually rebuilt text (per page), joined by pdf-parse with \n\n.

        // --- ANALYSIS ---
        const fontStats: Record<string, { total: number, inParens: number }> = {};

        allItems.forEach(item => {
            if (!fontStats[item.font]) fontStats[item.font] = { total: 0, inParens: 0 };
            fontStats[item.font].total++;
            if (item.str.match(/[()]/)) {
                fontStats[item.font].inParens++;
            }
        });

        let stageFontCandidate = "";
        let maxParens = 0;

        Object.keys(fontStats).forEach(font => {
            if (fontStats[font].inParens > maxParens) {
                maxParens = fontStats[font].inParens;
                stageFontCandidate = font;
            }
        });

        // --- RECONSTRUCT CLEAN TEXT ---
        let cleanRawText = "";
        let lastY = -1;

        // Iterate all items flatly. Note: layout logic is approximate across pages but should suffice for scripts.
        for (const item of allItems) {
            // FILTER: If this item uses the Stage Font, SKIP IT.
            // Check if font matches AND if it has a significant parens count (avoid deleting rare random parens in main font)
            if (item.font === stageFontCandidate && maxParens > 0) {
                continue;
            }

            // Insert Newline if Y changed significantly
            // Handle page breaks (Y jumps up) -> insert newline too.
            if (lastY !== -1 && Math.abs(item.y - lastY) > 5) {
                cleanRawText += "\n";
            } else if (lastY !== -1 && item.y !== lastY) {
                // If small change but not same line? Maybe sub/superscript?
                // Usually treating as same line is safer, or adding space.
                // But PDF items separates words often on same Y.
            }

            cleanRawText += item.str;
            lastY = item.y;
        }

        // Fallback: If heuristic failed (no parens found?), use original data.text (which uses our render_page output now)
        if (maxParens === 0) {
            cleanRawText = data.text;
        }

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
