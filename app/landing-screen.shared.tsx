"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, Play, Repeat, Sliders, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SingleMask, TripleMask } from "@/components/icons/masks";
import { PLANS } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import type { LandingBillingCycle, LandingScreenProps } from "@/app/landing-screen.types";

const NAV_ITEMS = ["Fonctionnalités", "Démo", "Tarifs", "FAQ"];

function getSectionId(item: string) {
    return item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function LandingBackground() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[10%] w-[1000px] h-[1000px] bg-blue-600/30 rounded-full blur-[150px] opacity-50 mix-blend-screen" />
            <div className="absolute bottom-[-10%] right-[5%] w-[800px] h-[800px] bg-purple-600/30 rounded-full blur-[150px] opacity-50 mix-blend-screen" />
            <div className="absolute top-[30%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] opacity-40 mix-blend-screen" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050508_100%)]" />
        </div>
    );
}

export function LandingDesktopNav({
    onNavigateSection,
}: Pick<LandingScreenProps, "onNavigateSection">) {
    return (
        <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
                <button
                    key={item}
                    onClick={() => onNavigateSection(getSectionId(item))}
                    className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors rounded-full hover:bg-white/5"
                >
                    {item}
                </button>
            ))}
        </nav>
    );
}

export function LandingSections({
    billingCycle,
    faqs,
    openFaq,
    onToggleBillingCycle,
    onToggleFaq,
}: Pick<LandingScreenProps, "billingCycle" | "faqs" | "openFaq" | "onToggleBillingCycle" | "onToggleFaq">) {
    return (
        <main className="relative z-10 flex-1 w-full">
            <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 max-w-5xl mx-auto">
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4 ring-1 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Disponible en accès anticipé
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white leading-[1.1] drop-shadow-2xl">
                        Apprenez votre texte <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-purple-400 animate-gradient">
                            sans partenaire.
                        </span>
                    </h1>

                    <p className="max-w-xl mx-auto text-lg md:text-xl text-white/60 leading-relaxed">
                        Le comédien virtuel qui vous donne la réplique, vous fait répéter inlassablement, et ne s&apos;impatiente jamais.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                        <Link href="/signup" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-[0_0_30px_rgba(var(--primary),0.4)] hover:shadow-[0_0_40px_rgba(var(--primary),0.6)] hover:scale-105 transition-all">
                                Créer mon compte
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="/demo" className="w-full sm:w-auto">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-all hover:scale-105">
                                <Play className="mr-2 w-4 h-4 fill-white" />
                                Voir la démo
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-12 flex items-center justify-center gap-8 text-white/20 grayscale opacity-50 hover:opacity-80 transition-opacity">
                        <p className="text-xs font-medium uppercase tracking-widest text-white/40 mb-2">Ils nous font confiance</p>
                    </div>
                </div>
            </section>

            <section id="fonctionnalites" className="py-12 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl md:text-5xl font-bold text-center mb-20 text-white">
                        Comment ça marche ?
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<BookOpen className="w-8 h-8 text-blue-400" />}
                            title="Importez"
                            description="PDF, Word ou texte brut. Notre système analyse et formate instantanément votre script."
                            gradient="from-blue-500/20 to-cyan-500/5"
                        />
                        <FeatureCard
                            icon={<Sliders className="w-8 h-8 text-primary" />}
                            title="Configurez"
                            description="Choisissez votre personnage, masquez vos répliques, réglez la vitesse des partenaires."
                            gradient="from-primary/20 to-purple-500/5"
                        />
                        <FeatureCard
                            icon={<Repeat className="w-8 h-8 text-pink-400" />}
                            title="Répétez"
                            description="Lancez-vous. Repeto vous écoute et vous donne la réplique au bon moment."
                            gradient="from-pink-500/20 to-rose-500/5"
                        />
                    </div>
                </div>
            </section>

            <section id="demo" className="py-12 relative">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-12 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold text-white">
                            Découvrir en action
                        </h2>
                        <p className="text-white/50 text-lg">
                            Voyez comment Repeto transforme vos répétitions.
                        </p>
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-purple-600/50 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

                        <div className="relative bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl aspect-video">
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/Tv05QWwsr2c?autoplay=0&rel=0"
                                title="Repeto Demo Video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            <section id="tarifs" className="py-24 bg-white/[0.02]">
                <div className="max-w-[1400px] mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold text-white">Tarifs simples</h2>
                        <p className="text-white/50 text-lg">Commencez gratuitement, passez Pro quand vous êtes prêt.</p>

                        <div className="flex items-center justify-center gap-4 mt-8">
                            <span className={cn("text-sm font-medium transition-colors", billingCycle === "monthly" ? "text-white" : "text-white/50")}>
                                Mensuel
                            </span>
                            <div
                                onClick={onToggleBillingCycle}
                                className="w-14 h-8 bg-white/10 rounded-full p-1 cursor-pointer transition-colors relative border border-white/10"
                            >
                                <div
                                    className={cn(
                                        "w-6 h-6 bg-primary rounded-full shadow-sm transition-transform duration-300",
                                        billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"
                                    )}
                                />
                            </div>
                            <span className={cn("text-sm font-medium transition-colors flex items-center gap-2", billingCycle === "yearly" ? "text-white" : "text-white/50")}>
                                Annuel
                                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    -20% (2 mois offerts)
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1400px] mx-auto">
                        <PricingCard plan="free" icon={<SingleMask className="w-6 h-6" />} billingCycle={billingCycle} />
                        <PricingCard plan="solo_pro" icon={<SingleMask className="w-6 h-6" />} billingCycle={billingCycle} />
                        <PricingCard plan="troupe" icon={<TripleMask className="w-6 h-6" />} billingCycle={billingCycle} />
                        <PricingCard plan="troupe_xl" icon={<TripleMask className="w-6 h-6" />} billingCycle={billingCycle} badge="Grandes Troupes" />
                    </div>
                </div>
            </section>

            <section id="faq" className="py-32 max-w-3xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-12 text-white">Questions Fréquentes</h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden">
                            <button
                                onClick={() => onToggleFaq(index)}
                                className="w-full px-8 py-6 flex items-center justify-between text-left"
                            >
                                <span className="font-medium text-lg text-white/90">{faq.question}</span>
                                <ChevronDown className={cn("w-5 h-5 text-white/50 transition-transform duration-300", openFaq === index && "rotate-180")} />
                            </button>
                            <div className={cn(
                                "px-8 text-white/60 leading-relaxed overflow-hidden transition-all duration-300",
                                openFaq === index ? "pb-8 max-h-40 opacity-100" : "max-h-0 opacity-0"
                            )}>
                                {faq.answer}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}

export function LandingFooter() {
    return (
        <footer className="py-12 border-t border-white/5 bg-black/50 text-center">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
                <p className="text-sm text-white/40">© {new Date().getFullYear()} Repeto. Fait avec passion pour les artistes.</p>
                <div className="flex gap-6 text-sm text-white/40">
                    <Link href="/terms" className="hover:text-white transition-colors">CGU</Link>
                    <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
                    <Link href="mailto:contact@repeto.app" className="hover:text-white transition-colors">Contact</Link>
                </div>
            </div>
        </footer>
    );
}

function FeatureCard({
    icon,
    title,
    description,
    gradient,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
}) {
    return (
        <div className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className={cn("absolute inset-0 rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", gradient)} />
            <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-500">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-white/50 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function PricingCard({
    plan,
    icon,
    popular,
    billingCycle,
    badge,
}: {
    plan: "free" | "solo_pro" | "troupe" | "troupe_xl";
    icon: React.ReactNode;
    popular?: boolean;
    billingCycle: LandingBillingCycle;
    badge?: string;
}) {
    const details = PLANS[plan];
    const monthlyPrice = details.price;
    const yearlyPriceTotal = monthlyPrice * 10;

    const formatPrice = (price: number) => {
        if (price === 0) return "0€";
        return Number.isInteger(price)
            ? `${price}€`
            : `${price.toFixed(2).replace(".", ",")}€`;
    };

    const displayPrice = billingCycle === "monthly"
        ? formatPrice(monthlyPrice)
        : formatPrice(yearlyPriceTotal);

    const period = monthlyPrice === 0 ? "" : billingCycle === "monthly" ? "/mois" : "/an";

    const savedAmount = monthlyPrice * 2;
    const formattedSavedAmount = Number.isInteger(savedAmount)
        ? `${savedAmount}€`
        : `${savedAmount.toFixed(2).replace(".", ",")}€`;

    return (
        <div className={cn(
            "relative p-8 rounded-3xl border transition-all duration-300 flex flex-col h-full",
            popular
                ? "bg-white/[0.04] border-primary/50 shadow-2xl shadow-primary/10 z-10 scale-105"
                : "bg-white/[0.02] border-white/5 hover:border-white/10"
        )}>
            {badge ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white/10 border border-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                    {badge}
                </div>
            ) : null}
            {popular ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-primary/40">
                    Recommandé
                </div>
            ) : null}

            <div className="mb-8">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                    popular ? "bg-primary text-white" : "bg-white/5 text-white/60"
                )}>
                    {icon}
                </div>
                <h3 className="text-lg font-medium text-white/60 text-center mb-2">{details.name}</h3>
                <div className="flex items-baseline justify-center gap-1 text-white">
                    <span className="text-4xl font-bold tracking-tight">
                        {displayPrice}
                    </span>
                    <span className="text-white/40">{period}</span>
                </div>
                {billingCycle === "yearly" && monthlyPrice > 0 ? (
                    <p className="text-center text-xs text-emerald-400 font-bold mt-2">
                        Économisez {formattedSavedAmount} / an
                    </p>
                ) : null}
                <p className="text-center text-sm text-white/40 mt-4 h-10">{details.description}</p>
            </div>

            <ul className="mb-8 space-y-4 flex-1">
                {details.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-white/70">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                    </li>
                ))}
            </ul>

            <Link href={`/signup?plan=${plan}&billing=${billingCycle}`} className="mt-auto w-full">
                <Button className={cn(
                    "w-full h-12 rounded-xl text-base font-bold transition-all",
                    popular
                        ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/5"
                )}>
                    {plan === "free" ? "Commencer gratuitement" : "Commencer mon essai gratuit"}
                </Button>
            </Link>
        </div>
    );
}
