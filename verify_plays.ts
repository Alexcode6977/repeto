
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
