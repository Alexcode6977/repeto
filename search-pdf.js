const fs = require('fs');
const pdf = require('pdf-parse/lib/pdf-parse.js');

async function search(filename, terms) {
    const buffer = fs.readFileSync(filename);
    let allItems = [];

    const render_page = (pageData) => {
        return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false }).then((tc) => {
            for (const item of tc.items) {
                if (item.str.trim()) allItems.push({ str: item.str, y: item.transform[5] });
            }
            return '';
        });
    };

    await pdf(buffer, { pagerender: render_page });

    // Reconstruct
    let text = '';
    let lastY = -1;
    for (const item of allItems) {
        if (lastY !== -1 && Math.abs(item.y - lastY) > 6) text += '\n';
        else if (text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n')) text += ' ';
        text += item.str;
        lastY = item.y;
    }

    const lines = text.split('\n');

    for (const term of terms) {
        console.log('\n=== Searching for: ' + term + ' ===');
        let found = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toUpperCase().includes(term.toUpperCase())) {
                console.log(i + ': ' + lines[i].substring(0, 120));
                found++;
                if (found >= 8) break;
            }
        }
        if (found === 0) console.log('NOT FOUND');
    }
}

search('./MOLIERE_BOURGEOISGENTILHOMME.pdf', ['MUFTI', 'TURCS', 'DERVICHES', 'GENTILHOMME', 'BABILLARD', 'GASCON']);
