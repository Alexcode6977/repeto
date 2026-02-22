export interface GoogleVoiceProfile {
    id: string; // Ex: "fr-FR-Chirp3-HD-Aoede"
    name: string; // Ex: "Aoede"
    description: string; // Ex: "L'Élégante : Sophistiquée, posée, voix de premier plan."
    gender: "Masculin" | "Féminin" | "Très Masculin" | "Très Féminin";
    genderScore: number; // 1 à 4
    age: "Très Jeune (Enfant)" | "Adolescent / Jeune Adulte" | "Adulte Mûr" | "Senior (Âgé/Cassé)";
    ageScore: number; // 1 à 4
    pitch: "Très Grave (Basse)" | "Médium-Grave" | "Médium-Aigu" | "Très Aigu (Soprano)";
    pitchScore: number; // 1 à 4
    narrativeReliability: "Faible" | "Moyenne" | "Bonne" | "Très bonne";
    narrativeReliabilityScore: number; // 1 à 4
    register: "Relâché (Argot)" | "Familier" | "Standard" | "Châtié (Précieux)";
    registerScore: number; // 1 à 4
    projection: "Chuchoté" | "Intime (Narrateur)" | "Direct (Parlé haut)" | "Exclamatif (Théâtral)";
    projectionScore: number; // 1 à 4
    speed: "Très Lente" | "Posée" | "Allante" | "Trépidante";
    speedScore: number; // 1 à 4
    texture: "Lisse / Pure" | "Satinée" | "Voilée" | "Granuleuse";
    textureScore: number; // 1 à 4
    temperature: "Glacial (Hostile)" | "Distant (Froid)" | "Avenant (Chaud)" | "Solaire (Empathique)";
    temperatureScore: number; // 1 à 4
    energy: "Atone (Calme)" | "Posé" | "Dynamique" | "Explosif (Intense)";
    energyScore: number; // 1 à 4
}

// Convertit la chaîne descriptive en score (ex: "4 - Très Féminin" -> 4)
function extractScore(value: string): number {
    const match = value.match(/^(\d)/);
    return match ? parseInt(match[1], 10) : 3; // 3 par défaut
}

// Nettoie la valeur de son numéro (ex: "4 - Très Féminin" -> "Très Féminin")
function extractLabel<T extends string>(value: string): T {
    return value.replace(/^\d\s*-\s*/, '').trim() as T;
}

export const GOOGLE_VOICES: GoogleVoiceProfile[] = [
    {
        id: "fr-FR-Chirp3-HD-Achernar", name: "Achernar", description: "L'Élégante : Sophistiquée, posée, voix de premier plan.",
        gender: "Très Féminin", genderScore: 4, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Intime (Narrateur)", projectionScore: 2, speed: "Allante", speedScore: 3, texture: "Lisse / Pure", textureScore: 1,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Achird", name: "Achird", description: "Le Mentor : Mature, rassurant, type 'père' ou 'professeur'.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Châtié (Précieux)", registerScore: 4,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Solaire (Empathique)", temperatureScore: 4, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Algenib", name: "Algenib", description: "Le Sportif : Direct, tonique, sans fioritures.",
        gender: "Masculin", genderScore: 2, age: "Adolescent / Jeune Adulte", ageScore: 2, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Trépidante", speedScore: 4, texture: "Voilée", textureScore: 3,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Algieba", name: "Algieba", description: "Le Solennel : Rythme lent, profond, très théâtral.",
        gender: "Masculin", genderScore: 2, age: "Senior (Âgé/Cassé)", ageScore: 4, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Très Lente", speedScore: 1, texture: "Voilée", textureScore: 3,
        temperature: "Distant (Froid)", temperatureScore: 2, energy: "Posé", energyScore: 2
    },
    {
        id: "fr-FR-Chirp3-HD-Alnilam", name: "Alnilam", description: "Masculin standard, sans relief particulier.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Posé", energyScore: 2
    },
    {
        id: "fr-FR-Chirp3-HD-Aoede", name: "Aoede", description: "La Lyrique : Très fluide, mélodieuse, idéale pour les textes longs.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Posée", speedScore: 2, texture: "Satinée", textureScore: 2,
        temperature: "Solaire (Empathique)", temperatureScore: 4, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Autonoe", name: "Autonoe", description: "La Pragmatique : Diction très nette, très 'moderne'.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Distant (Froid)", temperatureScore: 2, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Callirrhoe", name: "Callirrhoe", description: "Féminin doux, assez proche de Leda.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Chuchoté", projectionScore: 1, speed: "Allante", speedScore: 3, texture: "Lisse / Pure", textureScore: 1,
        temperature: "Solaire (Empathique)", temperatureScore: 4, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Charon", name: "Charon", description: "Le Sombre : Grave, posé, parfait pour les antagonistes.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Distant (Froid)", temperatureScore: 2, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Despina", name: "Despina", description: "Féminin classique, utile pour les petits rôles.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Enceladus", name: "Enceladus", description: "Le Robuste : Voix pleine, un peu lourde, rôles physiques.",
        gender: "Masculin", genderScore: 2, age: "Adolescent / Jeune Adulte", ageScore: 2, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Distant (Froid)", temperatureScore: 2, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Erinome", name: "Erinome", description: "La Mystérieuse : Ton un peu voilé, intime.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Chuchoté", projectionScore: 1, speed: "Allante", speedScore: 3, texture: "Lisse / Pure", textureScore: 1,
        temperature: "Solaire (Empathique)", temperatureScore: 4, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Fenrir", name: "Fenrir", description: "L'Autoritaire : Puissant, avec du grain, rôle de chef.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Granuleuse", textureScore: 4,
        temperature: "Distant (Froid)", temperatureScore: 2, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Gacrux", name: "Gacrux", description: "La Matriarche : Voix mûre, assurée, autorité naturelle.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2, // Note: Le fichier source disait Masculin 2, on garde tel quel pour correspondre
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Exclamatif (Théâtral)", projectionScore: 4, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Iapetus", name: "Iapetus", description: "Masculin mûr, assez proche d'Achird.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Solaire (Empathique)", temperatureScore: 4, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Kore", name: "Kore", description: "La Pétillante : Très proche de l'utilisateur, amicale.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Solaire (Empathique)", temperatureScore: 4, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Laomedeia", name: "Laomedeia", description: "Féminin un peu plus aigu, voix de jeune fille.",
        gender: "Féminin", genderScore: 3, age: "Très Jeune (Enfant)", ageScore: 1, pitch: "Très Aigu (Soprano)", pitchScore: 4,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Familier", registerScore: 2,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Lisse / Pure", textureScore: 1,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Leda", name: "Leda", description: "La Douce : Calme, timbre cristallin, rôles candides.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Chuchoté", projectionScore: 1, speed: "Allante", speedScore: 3, texture: "Lisse / Pure", textureScore: 1,
        temperature: "Solaire (Empathique)", temperatureScore: 4, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Orus", name: "Orus", description: "L'Énergique : Parle un peu plus fort par défaut, extraverti.",
        gender: "Masculin", genderScore: 2, age: "Adolescent / Jeune Adulte", ageScore: 2, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Lisse / Pure", textureScore: 1,
        temperature: "Solaire (Empathique)", temperatureScore: 4, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Puck", name: "Puck", description: "L'Agile : Ton jeune, dynamique, excellent pour la comédie.",
        gender: "Masculin", genderScore: 2, age: "Adolescent / Jeune Adulte", ageScore: 2, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Explosif (Intense)", energyScore: 4
    },
    {
        id: "fr-FR-Chirp3-HD-Pulcherrima", name: "Pulcherrima", description: "La Distinguée : Très articulée, un peu formelle.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Rasalgethi", name: "Rasalgethi", description: "Masculin grave, assez proche de Charon.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Très Grave (Basse)", pitchScore: 1,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Intime (Narrateur)", projectionScore: 2, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Glacial (Hostile)", temperatureScore: 1, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Sadachbia", name: "Sadachbia", description: "Masculin neutre, très polyvalent.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3, // Le CSV dit féminin 3, le nom et titre contredisent, respect strict de la grille
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Sadaltager", name: "Sadaltager", description: "Masculin rapide, utile pour les rôles bavards.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3, // Idem
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Schedar", name: "Schedar", description: "Le Neutre : Clair et polyvalent, bon 'jeune premier'.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3, // Idem
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Sulafat", name: "Sulafat", description: "Féminin mature, utile pour les rôles de 'Rang B'.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2, // Idem
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Posée", speedScore: 2, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Posé", energyScore: 2
    },
    {
        id: "fr-FR-Chirp3-HD-Umbriel", name: "Umbriel", description: "Masculin un peu plus sec, moins chaleureux.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Granuleuse", textureScore: 4,
        temperature: "Distant (Froid)", temperatureScore: 2, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Vindemiatrix", name: "Vindemiatrix", description: "La Singulière : Timbre atypique, pour personnages typés.",
        gender: "Féminin", genderScore: 3, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Aigu", pitchScore: 3,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Familier", registerScore: 2,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Satinée", textureScore: 2,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Zephyr", name: "Zephyr", description: "La Vive : Claire, rapide, idéale pour les rôles énergiques.",
        gender: "Masculin", genderScore: 2, age: "Adolescent / Jeune Adulte", ageScore: 2, pitch: "Très Aigu (Soprano)", pitchScore: 4,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Standard", registerScore: 3,
        projection: "Direct (Parlé haut)", projectionScore: 3, speed: "Allante", speedScore: 3, texture: "Lisse / Pure", textureScore: 1,
        temperature: "Avenant (Chaud)", temperatureScore: 3, energy: "Dynamique", energyScore: 3
    },
    {
        id: "fr-FR-Chirp3-HD-Zubenelgenubi", name: "Zubenelgenubi", description: "L'Intellectuel : Précis, calme, ton professoral.",
        gender: "Masculin", genderScore: 2, age: "Adulte Mûr", ageScore: 3, pitch: "Médium-Grave", pitchScore: 2,
        narrativeReliability: "Bonne", narrativeReliabilityScore: 3, register: "Châtié (Précieux)", registerScore: 4,
        projection: "Intime (Narrateur)", projectionScore: 2, speed: "Posée", speedScore: 2, texture: "Satinée", textureScore: 2,
        temperature: "Distant (Froid)", temperatureScore: 2, energy: "Posé", energyScore: 2
    }
];

export function getGoogleVoiceById(id: string): GoogleVoiceProfile | undefined {
    return GOOGLE_VOICES.find(v => v.id === id || v.name === id || "fr-FR-Chirp3-HD-" + id === id || "fr-FR-Chirp3-HD-" + v.name === id);
}
