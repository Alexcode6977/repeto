import { Metadata } from "next";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
    title: "Tarifs | Souffleur",
    description: "Choisissez le plan qui vous convient pour apprendre vos textes de théâtre avec l'aide de votre partenaire virtuel.",
};

export default function PricingPage() {
    return <PricingContent />;
}
