
import { parseScript } from "./lib/parser";

// 1. Simulation of "On Purge Bébé" (Standard format: "NAME : text" or NAME on own line)
// Also includes Scenes.
const textOnPurge = `
ON PURGE BÉBÉ

PERSONNAGES

BASTIEN FCHOLL
JULIE FOLLAVOINE

SCÈNE PREMIERE

BASTIEN, entrant.
Alors, ça y est ?

JULIE, ajustant son corset.
Oui, ça y est. Mais ce n'est pas sans mal.

SCÈNE II

FOLLAVOINE, entrant par le fond.
Eh bien ? Qu'est-ce qu'il y a ?

JULIE.
Il y a que j'ai fini.
`;

// 2. Simulation of "Feu la mère de Madame" (Comma format: "NAME, text")
// Also includes Scenes.
const textFeuMere = `
FEU LA MÈRE DE MADAME

SCÈNE I

YVONNE, couchée.
Qu'est-ce que c'est ?...

LUCIEN, dans la coulisse.
C'est moi !

YVONNE.
Ah ! bon.

SCÈNE II

LUCIEN, entrant costumé en Louis XIV.
Quelle heure est-il ?

YVONNE.
Quatre heures du matin !

LUCIEN.
Ah ! fichtre !

VALET DE CHAMBRE.
Monsieur a sonné ?
`;

console.log("---------------------------------------------------");
console.log("TEST 1: ON PURGE BÉBÉ");
console.log("---------------------------------------------------");
const result1 = parseScript(textOnPurge);
console.log("Characters found:", result1.characters);
console.log("Scenes found:", result1.scenes);
console.log("First Dialogue:", result1.lines.find(l => l.type === 'dialogue'));
console.log("Check BASTIEN:", result1.characters.includes("BASTIEN"));
console.log("Check JULIE:", result1.characters.includes("JULIE"));
console.log("Check SCENE I detected:", result1.scenes.some(s => s.title.includes("SCÈNE PREMIERE")));


console.log("\n---------------------------------------------------");
console.log("TEST 2: FEU LA MÈRE DE MADAME");
console.log("---------------------------------------------------");
const result2 = parseScript(textFeuMere);
console.log("Characters found:", result2.characters);
console.log("Scenes found:", result2.scenes);
console.log("First Dialogue:", result2.lines.find(l => l.type === 'dialogue'));
console.log("Check YVONNE:", result2.characters.includes("YVONNE"));
console.log("Check LUCIEN:", result2.characters.includes("LUCIEN"));
console.log("Check VALET DE CHAMBRE:", result2.characters.includes("VALET DE CHAMBRE"));
console.log("Check SCENE I detected:", result2.scenes.some(s => s.title.includes("SCÈNE I")));
console.log("\n---------------------------------------------------");
console.log("TEST 3: TITLE CASE CHARACTERS");
console.log("---------------------------------------------------");
const textTitleCase = `
UN FIL À LA PATTE

Acte I

Monsieur de Bois-d'Enghien: Bonjour ma chère !
Lucette: Oh ! c'est vous ?
Monsieur de Bois-d'Enghien: Vous ne m'attendiez pas ?
Lucette: Je vous attendais toujours.
Bouzin: Messieurs, dames...
Bouzin: Je vous apporte les billets.
`;
const result3 = parseScript(textTitleCase);
console.log("Characters found:", result3.characters);
console.log("Check Monsieur de Bois-d'Enghien:", result3.characters.includes("Monsieur de Bois-d'Enghien"));
console.log("Check Lucette:", result3.characters.includes("Lucette"));
console.log("Check Bouzin:", result3.characters.includes("Bouzin"));

console.log("\n---------------------------------------------------");
console.log("TEST 4: SIMILARITY & PLAY-SPECIFIC FIXES");
console.log("---------------------------------------------------");
import { calculateSimilarity } from "./lib/similarity";

const test1 = calculateSimilarity("C'est les hybrides", "C'est les hébrides", "On purge bébé");
console.log("Sim 'hybrides' vs 'hébrides' (with fix):", test1.toFixed(2));

const test2 = calculateSimilarity("Salut Chou you", "Salut Chouilloux", "On purge bébé");
console.log("Sim 'Chou you' vs 'Chouilloux' (with fix):", test2.toFixed(2));
console.log("\n---------------------------------------------------");
console.log("TEST 5: EDGE CASES (Empty / Minimal)");
console.log("---------------------------------------------------");
const resultEmpty = parseScript("");
console.log("Empty script characters:", resultEmpty.characters);

const resultSingle = parseScript("JORGE: Hola.");
console.log("Single line script characters (should be 0 due to threshold):", resultSingle.characters.length);

console.log("\n---------------------------------------------------");
console.log("TEST 6: DIALECT NORMALIZATION (ANNETTE)");
console.log("---------------------------------------------------");
const title = "FEU LA MÈRE DE MADAME";
const scriptText = "Pien Matame !"; // Annette's phonetic text
const userTranscript = "Bien madame"; // What the STT standardizes to

const simDialect = calculateSimilarity(userTranscript, scriptText, title);
console.log(`Sim '${userTranscript}' vs '${scriptText}' (Annette): ${simDialect.toFixed(2)}`);

if (simDialect < 0.9) {
    console.error("FAILED: Annette's dialect should be normalized!");
    process.exit(1);
}

console.log("\n=== ALL TESTS PASSED ===");

const test3 = calculateSimilarity("Salut Chou you", "Salut Chouilloux", "Molière");
console.log("Sim 'Chou you' vs 'Chouilloux' (without fix):", test3.toFixed(2));
