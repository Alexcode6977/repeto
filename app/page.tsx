'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Mic, BookOpen, Play, Sliders, Repeat, Check, X, Users, User, Crown, Menu, X as XIcon, ChevronDown } from "lucide-react";
import { PLANS } from "@/lib/stripe";
import { useState, useEffect } from "react";

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setMobileMenuOpen(false);
    };

    const faqs = [
        {
            question: "Comment fonctionne la reconnaissance vocale ?",
            answer: "Repeto utilise une technologie de reconnaissance vocale avancée qui analyse votre prononciation en temps réel. Vous récitez votre texte, et l'application détecte automatiquement si vous avez dit la bonne réplique pour passer à la suivante."
        },
        {
            question: "Puis-je utiliser Repeto sans connexion internet ?",
            answer: "Une connexion internet est nécessaire pour les voix IA (abonnement premium). Cependant, le mode lecture avec voix de synthèse basique fonctionne hors ligne une fois le texte téléchargé."
        },
        {
            question: "Comment importer mon propre texte ?",
            answer: "Vous pouvez importer n'importe quel texte au format PDF. Notre IA analyse automatiquement la structure pour identifier les personnages et les répliques. Vous pouvez ensuite ajuster manuellement si besoin."
        },
        {
            question: "Puis-je annuler mon abonnement à tout moment ?",
            answer: "Oui, vous pouvez annuler à tout moment depuis votre profil. Vous conservez l'accès jusqu'à la fin de la période payée, sans frais supplémentaires."
        },
        {
            question: "Le mode Troupe permet-il de répéter à plusieurs en même temps ?",
            answer: "Le mode Troupe est un espace collaboratif pour gérer vos pièces et planifier vos répétitions. Chaque membre peut s'entraîner individuellement avec les mêmes textes. Les répétitions synchronisées à plusieurs sont prévues pour une future version !"
        }
    ];

    return (
        <div className="dark bg-[#0a0a0f] text-foreground min-h-screen flex flex-col font-sans selection:bg-primary/30 overflow-x-hidden">

            {/* Cinematic Background - Plus marqué */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-transparent to-purple-900/20" />
                {/* Glowing orbs */}
                <div className="absolute top-[-10%] left-[20%] w-[800px] h-[800px] bg-primary/35 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[700px] h-[700px] bg-purple-700/35 rounded-full blur-[150px]" />
                <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] bg-teal-600/20 rounded-full blur-[120px]" />
                {/* Vignette effect */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
            </div>

            {/* Fixed Navigation */}
            <header className={`
                fixed top-0 left-0 right-0 z-50 transition-all duration-300
                ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-lg' : 'bg-transparent'}
            `}>
                <div className="w-full max-w-7xl mx-auto p-4 md:p-6 flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3 group cursor-pointer">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <span className="text-lg md:text-xl tracking-tight font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Repeto</span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('fonctionnalites')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Fonctionnalités
                        </button>
                        <button onClick={() => scrollToSection('demo')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Démo
                        </button>
                        <button onClick={() => scrollToSection('tarifs')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Tarifs
                        </button>
                        <button onClick={() => scrollToSection('faq')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            FAQ
                        </button>
                    </nav>

                    <div className="flex items-center gap-3 md:gap-6">
                        <Link href="/login" className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Se connecter
                        </Link>
                        <Link href="/signup" className="hidden md:block">
                            <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-4 py-4 md:px-6 md:py-5 font-semibold text-xs md:text-sm shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                                Essayer gratuitement
                            </Button>
                        </Link>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 rounded-lg bg-muted/50 text-foreground"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border p-4 space-y-2 animate-in slide-in-from-top-2">
                        <button onClick={() => scrollToSection('fonctionnalites')} className="block w-full px-4 py-3 text-left text-foreground hover:bg-muted rounded-lg transition-colors">
                            Fonctionnalités
                        </button>
                        <button onClick={() => scrollToSection('demo')} className="block w-full px-4 py-3 text-left text-foreground hover:bg-muted rounded-lg transition-colors">
                            Démo
                        </button>
                        <button onClick={() => scrollToSection('tarifs')} className="block w-full px-4 py-3 text-left text-foreground hover:bg-muted rounded-lg transition-colors">
                            Tarifs
                        </button>
                        <button onClick={() => scrollToSection('faq')} className="block w-full px-4 py-3 text-left text-foreground hover:bg-muted rounded-lg transition-colors">
                            FAQ
                        </button>
                        <div className="border-t border-border pt-3 mt-3 space-y-2">
                            <Link href="/login" className="block w-full px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                                Se connecter
                            </Link>
                            <Link href="/signup" className="block">
                                <Button className="w-full rounded-xl">Essayer gratuitement</Button>
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-0 pt-32 md:pt-40 pb-16 text-center w-full max-w-full">

                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-8">

                    {/* Social Proof Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Actuellement en test sur une troupe de théâtre amateur
                    </div>

                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.2] md:leading-[1.1] text-white drop-shadow-lg">
                        Votre partenaire de répétition, <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-teal-400 to-primary">
                            disponible 24/7.
                        </span>
                    </h1>

                    <p className="max-w-xl mx-auto text-base md:text-xl text-gray-300 leading-relaxed font-light px-4 md:px-0 drop-shadow-md">
                        Le répétiteur infatigable pour maîtriser votre texte avant de retrouver vos partenaires de jeu.
                    </p>

                    <div id="demo" className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-4">
                        <Link href="/signup" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm md:text-base btn-glow transition-all transform hover:scale-105">
                                Créer un compte
                                <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                        </Link>
                        <Link href="/demo">
                            <Button size="lg" variant="ghost" className="h-14 px-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition-all group">
                                <Play className="mr-2 w-4 h-4 fill-current opacity-50 group-hover:opacity-100 transition-opacity" />
                                Voir la démo
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Floating UI Elements */}
                <div className="absolute top-1/4 left-10 hidden lg:block animate-pulse duration-[4000ms] opacity-20">
                    <BookOpen className="w-24 h-24 text-white -rotate-12" />
                </div>
                <div className="absolute bottom-1/4 right-10 hidden lg:block animate-pulse duration-[5000ms] opacity-20">
                    <Mic className="w-24 h-24 text-primary rotate-12" />
                </div>

                {/* How it Works Section */}
                <div id="fonctionnalites" className="w-full max-w-6xl mx-auto px-6 mt-32 scroll-mt-24">
                    <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 text-white drop-shadow-lg">
                        Comment ça marche ?
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0" />

                        <div className="flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)] group-hover:scale-110 transition-transform duration-500 relative z-10 bg-background">
                                <BookOpen className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 drop-shadow-md">Bibliothèque ou Import</h3>
                            <p className="text-gray-400 leading-relaxed max-w-xs">
                                Vous prenez un texte de la biblio ou importez le votre en pdf.
                            </p>
                        </div>

                        <div className="flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-teal-500/10 flex items-center justify-center mb-6 border border-teal-500/20 shadow-[0_0_30px_rgba(20,184,166,0.2)] group-hover:scale-110 transition-transform duration-500 relative z-10 bg-background">
                                <Sliders className="w-10 h-10 text-teal-500 dark:text-teal-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 drop-shadow-md">Choisissez votre mode</h3>
                            <p className="text-gray-400 leading-relaxed max-w-xs">
                                Lecture, répétition totale, etc.
                            </p>
                        </div>

                        <div className="flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)] group-hover:scale-110 transition-transform duration-500 relative z-10 bg-background">
                                <Repeat className="w-10 h-10 text-purple-500 dark:text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 drop-shadow-md">Répétez à l'infini</h3>
                            <p className="text-gray-400 leading-relaxed max-w-xs">
                                Progressez à votre rythme.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pricing Section */}
                <div id="tarifs" className="w-full max-w-6xl mx-auto px-6 mt-32 scroll-mt-24">
                    <h2 className="text-3xl md:text-5xl font-bold text-center mb-4 text-white drop-shadow-lg">
                        Tarifs
                    </h2>
                    <p className="text-center text-gray-400 mb-12 max-w-xl mx-auto">
                        Commencez gratuitement, évoluez selon vos besoins.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <PricingCard plan="free" icon={<User className="w-6 h-6" />} />
                        <PricingCard plan="solo_pro" icon={<Crown className="w-6 h-6" />} highlighted />
                        <PricingCard plan="troupe" icon={<Users className="w-6 h-6" />} />
                    </div>
                </div>

                {/* FAQ Section */}
                <div id="faq" className="w-full max-w-3xl mx-auto px-6 mt-32 scroll-mt-24">
                    <h2 className="text-3xl md:text-5xl font-bold text-center mb-4 text-white drop-shadow-lg">
                        Questions fréquentes
                    </h2>
                    <p className="text-center text-gray-400 mb-12">
                        Tout ce que vous devez savoir sur Repeto
                    </p>

                    <div className="space-y-3">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                                >
                                    <span className="font-medium text-foreground pr-4">{faq.question}</span>
                                    <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === index && (
                                    <div className="px-6 pb-4 text-muted-foreground leading-relaxed animate-in slide-in-from-top-2">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </main>

            <footer className="relative z-10 w-full py-12 text-center border-t border-border bg-background/80 dark:bg-black/40 backdrop-blur-xl">
                <p className="text-muted-foreground text-sm">
                    &copy; {new Date().getFullYear()} Repeto. Conçu pour l'excellence.
                </p>
            </footer>
        </div>
    );
}

function PricingCard({
    plan,
    icon,
    highlighted = false
}: {
    plan: 'free' | 'solo_pro' | 'troupe';
    icon: React.ReactNode;
    highlighted?: boolean;
}) {
    const details = PLANS[plan];

    return (
        <div className={`
            relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]
            ${highlighted
                ? 'bg-primary/10 border-2 border-primary shadow-lg shadow-primary/20'
                : 'bg-card/50 border border-border backdrop-blur-sm'
            }
        `}>
            {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                        Populaire
                    </span>
                </div>
            )}

            <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-4
                ${highlighted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
                {icon}
            </div>

            <h3 className="text-xl font-bold mb-1">{details.name}</h3>
            <p className="text-2xl font-bold text-primary mb-2">{details.priceLabel}</p>
            <p className="text-sm text-muted-foreground mb-4">{details.description}</p>

            <Link href="/signup">
                <Button
                    className="w-full mb-4"
                    variant={highlighted ? 'default' : 'outline'}
                >
                    {plan === 'free' ? 'Commencer' : 'Choisir'}
                </Button>
            </Link>

            <ul className="space-y-2 text-sm">
                {details.features.slice(0, 4).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                    </li>
                ))}
                {details.limitations.slice(0, 2).map((limitation, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <X className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{limitation}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
