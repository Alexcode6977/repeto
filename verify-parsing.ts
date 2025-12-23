import fs from "fs";
import path from "path";
import { ParsedScript } from "./lib/types";

// Helper for basic Levenshtein (internal use)
function calculateLevenshtein(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[len1][len2];
}

/**
 * Basic PDF text extraction using pdf-parse for baseline comparison
 */
async function getRawPdfText(pdfPath: string): Promise<string> {
    const pdf = require("pdf-parse");
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    return data.text;
}

/**
 * Compare raw text vs parsed JSON
 */
function runFidelityAudit(rawText: string, parsedScript: ParsedScript) {
    console.log("\n=== PARSER FIDELITY AUDIT REPORT ===");

    // Normalization helper for fuzzy search
    const fuzzy = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 30);

    const parsedLines = parsedScript.lines;
    const allDialogueFuzzy = parsedLines.map(l => fuzzy(l.text)).join("|");

    // 1. Missing Segments Audit
    const rawParagraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 30);
    let missingCount = 0;

    rawParagraphs.forEach(p => {
        const cleanP = fuzzy(p);
        if (cleanP.length < 15) return;

        if (/^[A-Z\s]{3,20}$/.test(p.trim())) return;

        if (!allDialogueFuzzy.includes(cleanP)) {
            const isDidascalie = /\(.*\)|\[.*\]/.test(p) || p.trim().startsWith('(');
            if (!isDidascalie) {
                missingCount++;
                if (missingCount < 8) console.log(`[CHECK] Potential missing block: "${p.trim().substring(0, 60)}..."`);
            }
        }
    });

    // 2. Statistics
    const totalRawChars = rawText.replace(/\s+/g, "").length;
    const totalParsedChars = parsedLines.map(l => l.text.replace(/\s+/g, "").length).reduce((a, b) => a + b, 0);
    const coverage = (totalParsedChars / totalRawChars) * 100;

    console.log(`\nStatistics:`);
    console.log(`- Raw PDF Content (chars): ${totalRawChars}`);
    console.log(`- Parsed Script Content (chars): ${totalParsedChars}`);
    console.log(`- Semantic Coverage: ${coverage.toFixed(2)}%`);
    console.log(`- Unmatched Paragraphs (likely stage directions): ${missingCount}`);

    console.log("\nConclusion:");
    if (coverage > 80) {
        console.log("✅ PARSING FIDELITY: HIGH (Dialogue coverage looks solid)");
    } else if (coverage > 50) {
        console.log("⚠️ PARSING FIDELITY: MODERATE (Check for missing scenes if coverage seems low)");
    } else {
        console.log("❌ PARSING FIDELITY: LOW (Significant gaps detected)");
    }
}

async function main() {
    const pdfPath = process.argv[2];
    const jsonPath = process.argv[3];

    if (!pdfPath || !jsonPath) {
        console.log("Usage: npx ts-node verify-parsing.ts <path_to_pdf> <path_to_json>");
        process.exit(1);
    }

    try {
        console.log(`Auditing ${path.basename(pdfPath)}...`);
        const rawText = await getRawPdfText(pdfPath);
        const parsedJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as ParsedScript;
        runFidelityAudit(rawText, parsedJson);
    } catch (e) {
        console.error("Audit failed:", e);
    }
}

main();
