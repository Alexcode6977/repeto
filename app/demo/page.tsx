"use client";

import { RehearsalMode } from "@/components/rehearsal-mode";
import { ParsedScript } from "@/lib/types";
import { useRouter } from "next/navigation";

const DEMO_SCRIPT: ParsedScript = {
    title: "Le Bourgeois Gentilhomme - Acte II, Scène 4",
    characters: ["MONSIEUR JOURDAIN", "MAÎTRE DE PHILOSOPHIE"],
    scenes: [
        { index: 0, title: "La Leçon d'Orthographe" }
    ],
    lines: [
        { id: "1", character: "MAÎTRE DE PHILOSOPHIE", text: "Je vous expliquerai à fond toutes ces curiosités.", type: "dialogue" },
        { id: "2", character: "MONSIEUR JOURDAIN", text: "Je vous en prie. Au reste, il faut que je vous fasse une confidence. Je suis amoureux d'une personne de grande qualité, et je souhaiterais que vous m'aidassiez à lui écrire quelque chose dans un petit billet que je veux laisser tomber à ses pieds.", type: "dialogue" },
        { id: "3", character: "MAÎTRE DE PHILOSOPHIE", text: "Fort bien.", type: "dialogue" },
        { id: "4", character: "MONSIEUR JOURDAIN", text: "Cela sera galant, oui ?", type: "dialogue" },
        { id: "5", character: "MAÎTRE DE PHILOSOPHIE", text: "Sans doute. Sont-ce des vers que vous lui voulez écrire ?", type: "dialogue" },
        { id: "6", character: "MONSIEUR JOURDAIN", text: "Non, non, point de vers.", type: "dialogue" },
        { id: "7", character: "MAÎTRE DE PHILOSOPHIE", text: "Vous ne voulez que de la prose ?", type: "dialogue" },
        { id: "8", character: "MONSIEUR JOURDAIN", text: "Non, je ne veux ni prose ni vers.", type: "dialogue" },
        { id: "9", character: "MAÎTRE DE PHILOSOPHIE", text: "Il faut bien que ce soit l'un, ou l'autre.", type: "dialogue" },
        { id: "10", character: "MONSIEUR JOURDAIN", text: "Pourquoi ?", type: "dialogue" },
        { id: "11", character: "MAÎTRE DE PHILOSOPHIE", text: "Par la raison, Monsieur, qu'il n'y a pour s'exprimer que la prose, ou les vers.", type: "dialogue" },
        { id: "12", character: "MONSIEUR JOURDAIN", text: "Il n'y a que la prose ou les vers ?", type: "dialogue" },
        { id: "13", character: "MAÎTRE DE PHILOSOPHIE", text: "Non, Monsieur : tout ce qui n'est point prose est vers ; et tout ce qui n'est point vers est prose.", type: "dialogue" },
        { id: "14", character: "MONSIEUR JOURDAIN", text: "Et comme l'on parle, qu'est-ce que c'est donc que cela ?", type: "dialogue" },
        { id: "15", character: "MAÎTRE DE PHILOSOPHIE", text: "De la prose.", type: "dialogue" },
        { id: "16", character: "MONSIEUR JOURDAIN", text: "Quoi ? quand je dis : « Nicole, apportez-moi mes pantoufles, et me donnez mon bonnet de nuit », c'est de la prose ?", type: "dialogue" },
        { id: "17", character: "MAÎTRE DE PHILOSOPHIE", text: "Oui, Monsieur.", type: "dialogue" },
        { id: "18", character: "MONSIEUR JOURDAIN", text: "Par ma foi ! il y a plus de quarante ans que je dis de la prose sans que j'en susse rien, et je vous suis le plus obligé du monde de m'avoir appris cela. Je voudrais donc lui mettre dans un billet : Belle Marquise, vos beaux yeux me font mourir d'amour ; mais je voudrais que cela fût mis d'une manière galante, que cela fût tourné gentiment.", type: "dialogue" },
        { id: "19", character: "MAÎTRE DE PHILOSOPHIE", text: "Mettre que les feux de ses yeux réduisent votre cœur en cendres ; que vous souffrez nuit et jour pour elle les violences d'un...", type: "dialogue" },
        { id: "20", character: "MONSIEUR JOURDAIN", text: "Non, non, non, je ne veux point tout cela ; je ne veux que ce que je vous ai dit : Belle Marquise, vos beaux yeux me font mourir d'amour.", type: "dialogue" },
        { id: "21", character: "MAÎTRE DE PHILOSOPHIE", text: "Il faut bien étendre un peu la chose.", type: "dialogue" },
        { id: "22", character: "MONSIEUR JOURDAIN", text: "Non, vous dis-je, je ne veux que ces seules paroles-là dans le billet ; mais tournées à la mode ; bien arrangées comme il faut. Je vous prie de me dire un peu, pour voir, les diverses manières dont qu'on les peut mettre.", type: "dialogue" },
        { id: "23", character: "MAÎTRE DE PHILOSOPHIE", text: "On les peut mettre premièrement comme vous avez dit : Belle Marquise, vos beaux yeux me font mourir d'amour. Ou bien : D'amour mourir me font, belle Marquise, vos beaux yeux. Ou bien : Vos yeux beaux d'amour me font, belle Marquise, mourir. Ou bien : Mourir vos beaux yeux, belle Marquise, d'amour me font. Ou bien : Me font vos yeux beaux mourir, belle Marquise, d'amour.", type: "dialogue" },
        { id: "24", character: "MONSIEUR JOURDAIN", text: "Mais de toutes ces façons-là, laquelle est la meilleure ?", type: "dialogue" },
        { id: "25", character: "MAÎTRE DE PHILOSOPHIE", text: "Celle que vous avez dite : Belle Marquise, vos beaux yeux me font mourir d'amour.", type: "dialogue" },
        { id: "26", character: "MONSIEUR JOURDAIN", text: "Cependant je n'ai point étudié, et j'ai fait cela tout du premier coup. Je vous remercie de tout mon cœur, et vous prie de venir demain de bonne heure.", type: "dialogue" },
        { id: "27", character: "MAÎTRE DE PHILOSOPHIE", text: "Je n'y manquerai pas.", type: "dialogue" }
    ]
};

export default function DemoPage() {
    const router = useRouter();

    return (
        <RehearsalMode
            script={DEMO_SCRIPT}
            userCharacter="MONSIEUR JOURDAIN"
            onExit={() => router.push("/")}
            isDemo={true}
        />
    );
}
