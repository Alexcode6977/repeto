"use client";

import { useEffect, useState } from "react";
import type { LandingFaqItem, LandingScreenProps } from "@/app/landing-screen.types";

const LANDING_FAQS: LandingFaqItem[] = [
    {
        question: "Comment fonctionne la reconnaissance vocale ?",
        answer: "Repeto utilise une technologie avancée qui vous écoute en temps réel. Récitez votre texte à votre rythme, et l'application vous donne la réplique suivante automatiquement dès que vous avez fini.",
    },
    {
        question: "Puis-je utiliser Repeto hors ligne ?",
        answer: "Oui ! Une fois votre script chargé, le mode lecture basique fonctionne sans internet. La reconnaissance vocale et les voix Premium nécessitent cependant une connexion.",
    },
    {
        question: "Quels formats de script sont acceptés ?",
        answer: "Nous acceptons tous les fichiers PDF. Notre algorithme analyse la structure pour identifier automatiquement les personnages et les dialogues.",
    },
    {
        question: "Puis-je changer d'avis ?",
        answer: "Bien sûr. L'abonnement est sans engagement, annulable à tout moment depuis votre espace personnel.",
    },
];

export function useLandingScreen(): LandingScreenProps {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const onNavigateSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
        setMobileMenuOpen(false);
    };

    return {
        mobileMenuOpen,
        scrolled,
        openFaq,
        billingCycle,
        faqs: LANDING_FAQS,
        onToggleMobileMenu: () => setMobileMenuOpen((current) => !current),
        onCloseMobileMenu: () => setMobileMenuOpen(false),
        onToggleFaq: (index) => setOpenFaq((current) => (current === index ? null : index)),
        onToggleBillingCycle: () =>
            setBillingCycle((current) => (current === "monthly" ? "yearly" : "monthly")),
        onNavigateSection,
    };
}
