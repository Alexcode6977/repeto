import { jsPDF } from "jspdf";
import { ScriptLine } from "./types";
import { ScriptSettings } from "@/components/script-setup";

export const exportToPdf = (
    lines: (ScriptLine & { originalIndex: number })[],
    scriptTitle: string,
    userCharacter: string,
    settings: ScriptSettings,
    sceneMap: Map<number, string>
) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let y = margin;

    // Helper for visibility masking
    const getVisibleText = (text: string, character: string) => {
        const isUser = character.toLowerCase().trim() === userCharacter.toLowerCase().trim() ||
            character.toLowerCase().split(/[\s,]+/).includes(userCharacter.toLowerCase().trim());

        if (!isUser || settings.visibility === "visible") return text;

        if (settings.visibility === "hint") {
            const words = text.split(" ");
            if (words.length <= 2) return text;
            return `${words[0]} ${words[1]} ...`;
        }

        // Hidden
        return "...............";
    };

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(scriptTitle || "Extrait de Script", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Rôle : ${userCharacter} - Mode : ${settings.mode} - Visibilité : ${settings.visibility}`, margin, y);
    y += 15;

    doc.setTextColor(0); // Reset color

    lines.forEach((line) => {
        const sceneTitle = sceneMap.get(line.originalIndex);
        if (sceneTitle) {
            if (y > pageHeight - 40) {
                doc.addPage();
                y = margin;
            }
            y += 10;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bolditalic");
            doc.setTextColor(124, 58, 237); // Primary color (violet)
            doc.text(sceneTitle.toUpperCase(), margin, y);
            doc.setTextColor(0);
            y += 8;
        }

        const isUser = line.character.toLowerCase().trim() === userCharacter.toLowerCase().trim() ||
            line.character.toLowerCase().split(/[\s,]+/).includes(userCharacter.toLowerCase().trim());

        // Character Name
        if (y > pageHeight - 30) {
            doc.addPage();
            y = margin;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", isUser ? "bold" : "normal");
        if (isUser) {
            doc.setTextColor(234, 179, 8); // Yellow for user character
        } else {
            doc.setTextColor(100);
        }
        doc.text(line.character.trim().toUpperCase(), margin, y);
        doc.setTextColor(0);
        y += 6;

        // Dialogue
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const visibleText = getVisibleText(line.text, line.character);
        const splitText = doc.splitTextToSize(visibleText, pageWidth - (margin * 2));

        splitText.forEach((textLine: string) => {
            if (y > pageHeight - 15) {
                doc.addPage();
                y = margin;
            }
            doc.text(textLine, margin, y);
            y += 6;
        });

        y += 4; // Spacing between blocks
    });

    // Save PDF
    doc.save(`${scriptTitle.replace(/\s+/g, '_')}_${settings.mode}.pdf`);
};
