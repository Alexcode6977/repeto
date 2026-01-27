"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles, Users, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export function PricingContent() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-3xl">🎭</span> Souffleur
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost">Connexion</Button>
                        </Link>
                        <Link href="/signup">
                            <Button>S&apos;inscrire</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                        Des tarifs adaptés à <span className="text-primary">chaque comédien</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Commencez gratuitement, évoluez selon vos besoins.
                        Annulez à tout moment.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <span className={cn("text-sm font-medium transition-colors", billingCycle === 'monthly' ? "text-foreground" : "text-muted-foreground")}>
                            Mensuel
                        </span>
                        <div
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className="w-14 h-8 bg-muted rounded-full p-1 cursor-pointer transition-colors relative border border-border"
                        >
                            <div className={cn(
                                "w-6 h-6 bg-primary rounded-full shadow-sm transition-transform duration-300",
                                billingCycle === 'yearly' ? "translate-x-6" : "translate-x-0"
                            )} />
                        </div>
                        <span className={cn("text-sm font-medium transition-colors flex items-center gap-2", billingCycle === 'yearly' ? "text-foreground" : "text-muted-foreground")}>
                            Annuel
                            <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                -20% (2 mois offerts)
                            </span>
                        </span>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-20 px-4">
                <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Free Plan */}
                    <PricingCard
                        plan="free"
                        billingCycle={billingCycle}
                        icon={<User className="w-6 h-6" />}
                        highlighted={false}
                    />

                    {/* Solo Pro Plan */}
                    <PricingCard
                        plan="solo_pro"
                        billingCycle={billingCycle}
                        icon={<Sparkles className="w-6 h-6" />}
                        highlighted={true}
                    />

                    {/* Troupe Plan */}
                    <PricingCard
                        plan="troupe"
                        billingCycle={billingCycle}
                        icon={<Users className="w-6 h-6" />}
                        highlighted={false}
                    />

                    {/* Troupe XL Plan */}
                    <PricingCard
                        plan="troupe_xl"
                        billingCycle={billingCycle}
                        icon={<Users className="w-6 h-6" />}
                        highlighted={false}
                        badge="Grandes Troupes"
                    />
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 px-4 bg-muted/30">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Questions fréquentes
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FAQItem
                            question="Puis-je changer de plan à tout moment ?"
                            answer="Oui ! Vous pouvez upgrader ou downgrader votre abonnement à tout moment. Les changements prennent effet immédiatement, et nous ajustons automatiquement votre facturation au prorata."
                        />
                        <FAQItem
                            question="Comment fonctionne l'abonnement Troupe ?"
                            answer="L'abonnement Troupe est payé par le chef de troupe ou l'association. Une fois actif, tous les membres de la troupe (même avec un compte gratuit) bénéficient des fonctionnalités premium dans le contexte de la troupe."
                        />
                        <FAQItem
                            question="Que se passe-t-il si j'annule mon abonnement ?"
                            answer="Vous gardez l'accès à toutes les fonctionnalités premium jusqu'à la fin de votre période de facturation. Après cela, votre compte revient au plan gratuit, mais vos données sont conservées."
                        />
                        <FAQItem
                            question="Les voix Premium sont-elles disponibles hors ligne ?"
                            answer="Les voix Premium nécessitent une connexion internet pour la génération. Cependant, une fois générées, elles sont mises en cache et peuvent être rejouées hors ligne."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-2xl mx-auto text-center space-y-6">
                    <h2 className="text-3xl font-bold">
                        Prêt à révolutionner vos répétitions ?
                    </h2>
                    <p className="text-muted-foreground">
                        Commencez gratuitement, sans carte bancaire.
                    </p>
                    <Link href="/signup">
                        <Button size="lg" className="rounded-full px-8 h-12 gap-2 text-lg shadow-lg hover:shadow-primary/20 transition-all hover:scale-105">
                            Créer mon compte gratuit
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}

function PricingCard({
    plan,
    billingCycle,
    icon,
    highlighted,
    badge
}: {
    plan: 'free' | 'solo_pro' | 'troupe' | 'troupe_xl';
    billingCycle: 'monthly' | 'yearly';
    icon: React.ReactNode;
    highlighted: boolean;
    badge?: string;
}) {
    const details = PLANS[plan];

    const monthlyPrice = details.price;
    const yearlyPriceTotal = monthlyPrice * 10;

    const formatPrice = (price: number) => {
        if (price === 0) return "Gratuit";
        return Number.isInteger(price)
            ? `${price}€`
            : `${price.toFixed(2).replace('.', ',')}€`;
    };

    const displayPrice = billingCycle === 'monthly'
        ? formatPrice(monthlyPrice)
        : formatPrice(yearlyPriceTotal);

    const period = monthlyPrice === 0 ? "" : billingCycle === 'monthly' ? "/mois" : "/an";

    const savedAmount = monthlyPrice * 2;
    const formattedSavedAmount = Number.isInteger(savedAmount)
        ? `${savedAmount}€`
        : `${savedAmount.toFixed(2).replace('.', ',')}€`;

    return (
        <div className={cn(
            "relative rounded-3xl p-6 flex flex-col transition-all duration-300",
            highlighted
                ? "bg-gradient-to-b from-primary/10 to-background border-2 border-primary shadow-xl shadow-primary/10 scale-105 md:scale-110 xl:scale-105 z-10"
                : "bg-card border border-border hover:border-primary/30 hover:shadow-lg"
        )}>
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max">
                    <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
                        {badge}
                    </span>
                </div>
            )}

            <div className="mb-6">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-xl",
                    highlighted ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground"
                )}>
                    {icon}
                </div>
                <h3 className="text-xl font-bold">{details.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 min-h-[40px]">{details.description}</p>
            </div>

            <div className="mb-6">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">{displayPrice}</span>
                    <span className="text-muted-foreground font-medium">{period}</span>
                </div>
                {billingCycle === 'yearly' && monthlyPrice > 0 && (
                    <p className="text-xs text-emerald-500 font-bold mt-1">
                        Économisez {formattedSavedAmount} / an
                    </p>
                )}
            </div>

            <Link
                href={
                    plan === 'free'
                        ? '/signup'
                        : `/signup?plan=${plan}&billing=${billingCycle}`
                }
                className="block mb-8"
            >
                <Button
                    className="w-full rounded-xl py-6 font-bold"
                    variant={highlighted ? 'default' : 'outline'}
                >
                    {plan === 'free' ? 'Commencer gratuitement' : 'Commencer mon essai gratuit'}
                </Button>
            </Link>

            <div className="space-y-4 flex-1">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inclus :</div>
                <ul className="space-y-3">
                    {details.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                            <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="text-muted-foreground leading-tight">{feature}</span>
                        </li>
                    ))}
                    {(details as any).limitations?.map((limitation: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 text-sm opacity-60">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                <X className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <span className="text-muted-foreground leading-tight">{limitation}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
    return (
        <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-semibold mb-2">{question}</h3>
            <p className="text-muted-foreground">{answer}</p>
        </div>
    );
}
