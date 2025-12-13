"use server";

import { parseScript } from "@/lib/parser";
import { ParsedScript } from "@/lib/types";
const pdf = require("pdf-parse/lib/pdf-parse.js");

export async function parsePdfAction(formData: FormData): Promise<ParsedScript | { error: string }> {
    const file = formData.get("file") as File;

    if (!file) {
        return { error: "No file provided" };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text using pdf-parse
        const data = await pdf(buffer);
        const rawText = data.text;

        // Parse text into structured script
        const script = parseScript(rawText);

        if (script.lines.length === 0) {
            return { error: "Could not detect any dialogue lines. Ensure the script uses standard formatting (CHARACTER NAMES in CAPS)." };
        }

        return script;
    } catch (error) {
        console.error("Error parsing PDF:", error);
        return { error: "Failed to parse PDF file." };
    }
}
