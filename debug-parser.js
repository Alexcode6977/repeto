const fs = require('fs');
const pdf = require('pdf-parse/lib/pdf-parse.js');

async function debugPdf(filename) {
    console.log(`\n=== Debugging: ${filename} ===\n`);

    const buffer = fs.readFileSync(filename);

    let allItems = [];

    const render_page = (pageData) => {
        const render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false
        };
        return pageData.getTextContent(render_options).then((textContent) => {
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

    // Reconstruct text
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

    // Show first 100 lines
    const lines = cleanRawText.split('\n');
    console.log("First 100 lines:\n");

    for (let i = 0; i < Math.min(100, lines.length); i++) {
        const line = lines[i];
        const isAllCaps = line === line.toUpperCase() && line.length > 2;
        const marker = isAllCaps ? ">>> " : "    ";
        console.log(`${i.toString().padStart(3)}: ${marker}${line}`);
    }

    // Find lines matching character patterns
    console.log("\n\n=== Lines matching character pattern (CAPS:) ===\n");
    const charPattern = /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-þ\s\-\'']{1,35})[:\.,]\s*(.*)/;

    let matches = 0;
    for (let i = 0; i < lines.length && matches < 50; i++) {
        const match = lines[i].match(charPattern);
        if (match) {
            console.log(`${i.toString().padStart(3)}: "${match[1]}" -> "${match[2].substring(0, 50)}..."`);
            matches++;
        }
    }
}

debugPdf('./MOLIERE_BOURGEOISGENTILHOMME.pdf');
