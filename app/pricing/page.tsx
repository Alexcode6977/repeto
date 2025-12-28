import { Metadata } from "next";
import Link from "next/link";
import { Check, X, Sparkles, Users, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/stripe";

export const metadata: Metadata = {
    title: "Tarifs | Souffleur",
    description: "Choisissez le plan qui vous convient pour apprendre vos textes de théâtre avec l'aide de l'IA.",
};

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold">
                        🎭 Souffleur
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
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Des tarifs adaptés à <span className="text-primary">chaque comédien</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Commencez gratuitement, évoluez selon vos besoins.
                        Annulez à tout moment.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-20 px-4">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                    {/* Free Plan */}
                    <PricingCard
                        plan="free"
                        icon={<User className="w-8 h-8" />}
                        highlighted={false}
                    />

                    {/* Solo Pro Plan */}
                    <PricingCard
                        plan="solo_pro"
                        icon={<Sparkles className="w-8 h-8" />}
                        highlighted={true}
                        badge="Populaire"
                    />

                    {/* Troupe Plan */}
                    <PricingCard
                        plan="troupe"
                        icon={<Users className="w-8 h-8" />}
                        highlighted={false}
                    />
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 px-4 bg-muted/30">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Questions fréquentes
                    </h2>
                    <div className="space-y-6">
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
                            question="Les voix IA sont-elles disponibles hors ligne ?"
                            answer="Les voix IA nécessitent une connexion internet pour la génération. Cependant, une fois générées, elles sont mises en cache et peuvent être rejouées hors ligne."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-6">
                        Prêt à révolutionner vos répétitions ?
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        Commencez gratuitement, sans carte bancaire.
                    </p>
                    <Link href="/signup">
                        <Button size="lg" className="gap-2">
                            Créer mon compte gratuit
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}

function PricingCard({
    plan,
    icon,
    highlighted,
    badge
}: {
    plan: 'free' | 'solo_pro' | 'troupe';
    icon: React.ReactNode;
    highlighted: boolean;
    badge?: string;
}) {
    const details = PLANS[plan];

    return (
        <div className={`
            relative rounded-2xl p-8 
            ${highlighted
                ? 'bg-primary/10 border-2 border-primary shadow-lg shadow-primary/20'
                : 'bg-card border border-border'
            }
        `}>
            {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                        {badge}
                    </span>
                </div>
            )}

            <div className={`
                w-16 h-16 rounded-xl flex items-center justify-center mb-6
                ${highlighted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
                {icon}
            </div>

            <h3 className="text-2xl font-bold mb-2">{details.name}</h3>
            <p className="text-muted-foreground mb-4">{details.description}</p>

            <div className="mb-6">
                <span className="text-4xl font-bold">{details.priceLabel}</span>
            </div>

            <Link href={plan === 'free' ? '/signup' : `/signup?plan=${plan}`}>
                <Button
                    className="w-full mb-6"
                    variant={highlighted ? 'default' : 'outline'}
                >
                    {plan === 'free' ? 'Commencer gratuitement' : 'Choisir ce plan'}
                </Button>
            </Link>

            <ul className="space-y-3">
                {details.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                    </li>
                ))}
                {details.limitations.map((limitation, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <X className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-sm">{limitation}</span>
                    </li>
                ))}
            </ul>
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
