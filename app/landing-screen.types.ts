export type LandingBillingCycle = "monthly" | "yearly";

export interface LandingFaqItem {
    question: string;
    answer: string;
}

export interface LandingScreenProps {
    mobileMenuOpen: boolean;
    scrolled: boolean;
    openFaq: number | null;
    billingCycle: LandingBillingCycle;
    faqs: LandingFaqItem[];
    onToggleMobileMenu: () => void;
    onCloseMobileMenu: () => void;
    onToggleFaq: (index: number) => void;
    onToggleBillingCycle: () => void;
    onNavigateSection: (id: string) => void;
}
