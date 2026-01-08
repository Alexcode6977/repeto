'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, BookOpen, Play, Sliders, Repeat, Check, X, Users, User, Crown, Menu, X as XIcon, ChevronDown, Star } from "lucide-react";
import { PLANS } from "@/lib/stripe";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
            answer: "Repeto utilise une technologie avancée qui vous écoute en temps réel. Récitez votre texte à votre rythme, et l'application vous donne la réplique suivante automatiquement dès que vous avez fini."
        },
        {
            question: "Puis-je utiliser Repeto hors ligne ?",
            answer: "Oui ! Une fois votre script chargé, le mode lecture basique fonctionne sans internet. La reconnaissance vocale et les voix IA nécessitent cependant une connexion."
        },
        {
            question: "Quels formats de script sont acceptés ?",
            answer: "Nous acceptons tous les fichiers PDF. Notre IA analyse la structure pour identifier automatiquement les personnages et les dialogues."
        },
        {
            question: "Puis-je changer d'avis ?",
            answer: "Bien sûr. L'abonnement est sans engagement, annulable à tout moment depuis votre espace personnel."
        }
    ];

    return (
        <div className="dark bg-[#050508] text-foreground min-h-screen flex flex-col font-sans selection:bg-primary/30 overflow-x-hidden">

            {/* Ambiance Cinématique - Dégradé Bleu Violet */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[10%] w-[1000px] h-[1000px] bg-blue-600/30 rounded-full blur-[150px] opacity-50 mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[5%] w-[800px] h-[800px] bg-purple-600/30 rounded-full blur-[150px] opacity-50 mix-blend-screen" />
                <div className="absolute top-[30%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] opacity-40 mix-blend-screen" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050508_100%)]" />
            </div>

            {/* Navigation */}
            <header className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
                scrolled
                    ? "bg-black/50 backdrop-blur-xl border-white/5 py-4"
                    : "bg-transparent border-transparent py-6"
            )}>
                <div className="w-full max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-purple-600/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sparkles className="w-5 h-5 text-white relative z-10" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Repeto</span>
                    </div>

                    {/* Desktop Menu */}
                    <nav className="hidden md:flex items-center gap-1">
                        {['Fonctionnalités', 'Démo', 'Tarifs', 'FAQ'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollToSection(item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}
                                className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors rounded-full hover:bg-white/5"
                            >
                                {item}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="hidden md:block text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Connexion
                        </Link>
                        <Link href="/signup">
                            <Button className="rounded-full bg-white text-black hover:bg-white/90 px-6 font-bold text-sm h-11 transition-all hover:scale-105 active:scale-95">
                                Essayer
                            </Button>
                        </Link>
                        <button
                            className="md:hidden p-2 text-white"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <XIcon /> : <Menu />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-2xl border-b border-white/10 p-6 space-y-4 animate-in slide-in-from-top-4">
                        {['Fonctionnalités', 'Démo', 'Tarifs', 'FAQ'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollToSection(item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}
                                className="block w-full text-left py-3 text-lg font-medium text-white/80 hover:text-white"
                            >
                                {item}
                            </button>
                        ))}
                        <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                            <Link href="/login">
                                <Button variant="outline" className="w-full rounded-xl border-white/20 text-white hover:bg-white/10 h-12 text-base">
                                    Connexion
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button className="w-full rounded-xl bg-primary text-white hover:bg-primary/90 h-12 text-base font-bold">
                                    Créer un compte
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            <main className="relative z-10 flex-1 w-full">

                {/* Hero Section - Plus aéré */}
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
                            Le souffleur intelligent qui vous donne la réplique, vous fait répéter inlassablement, et ne s'impatiente jamais.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                            <Link href="/signup" className="w-full sm:w-auto">
                                <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-[0_0_30px_rgba(var(--primary),0.4)] hover:shadow-[0_0_40px_rgba(var(--primary),0.6)] hover:scale-105 transition-all">
                                    C'est parti
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

                        {/* Social Proof */}
                        <div className="pt-12 flex items-center justify-center gap-8 text-white/20 grayscale opacity-50 hover:opacity-80 transition-opacity">
                            <p className="text-xs font-medium uppercase tracking-widest text-white/40 mb-2">Ils nous font confiance</p>
                            {/* Placeholder for logos if needed */}
                        </div>
                    </div>
                </section>

                {/* Features - Cartes modernes */}
                <section id="fonctionnalites" className="py-12 relative">
                    <div className="max-w-7xl mx-auto px-6">
                        <h2 className="text-3xl md:text-5xl font-bold text-center mb-20 text-white">
                            Comment ça marche ?
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={<BookOpen className="w-8 h-8 text-blue-400" />}
                                title="Importez"
                                description="PDF, Word ou texte brut. Notre IA analyse et formate instantanément votre script."
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

                {/* Demo Video Section */}
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

                        {/* Video Container with Glassmorphism Wrapper */}
                        <div className="relative group">
                            {/* Glow Effect */}
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

                {/* Pricing - Épuré */}
                <section id="tarifs" className="py-24 bg-white/[0.02]">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold text-white">Tarifs simples</h2>
                            <p className="text-white/50 text-lg">Commencez gratuitement, passez Pro quand vous êtes prêt.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

                            {/* Section Comédien (2/3) */}
                            <div className="lg:col-span-2 flex flex-col space-y-8 animate-in slide-in-from-bottom-4 duration-700 delay-100">
                                <h3 className="text-2xl font-bold text-center text-white flex items-center justify-center gap-3">
                                    <User className="w-6 h-6 text-primary" />
                                    Je suis comédien
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                                    <PricingCard plan="free" icon={<User className="w-6 h-6" />} />
                                    <PricingCard plan="solo_pro" icon={<Crown className="w-6 h-6" />} popular />
                                </div>
                            </div>

                            {/* Section Troupe (1/3) */}
                            <div className="lg:col-span-1 flex flex-col space-y-8 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                                <h3 className="text-2xl font-bold text-center text-white flex items-center justify-center gap-3">
                                    <Users className="w-6 h-6 text-purple-400" />
                                    Je gère une troupe
                                </h3>
                                <div className="flex-1">
                                    <PricingCard plan="troupe" icon={<Users className="w-6 h-6" />} />
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* FAQ - Minimaliste */}
                <section id="faq" className="py-32 max-w-3xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-12 text-white">Questions Fréquentes</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
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
        </div>
    );
}

function FeatureCard({ icon, title, description, gradient }: { icon: any, title: string, description: string, gradient: string }) {
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
    )
}

function PricingCard({ plan, icon, popular }: { plan: 'free' | 'solo_pro' | 'troupe', icon: any, popular?: boolean }) {
    const details = PLANS[plan];

    return (
        <div className={cn(
            "relative p-8 rounded-3xl border transition-all duration-300 flex flex-col h-full",
            popular
                ? "bg-white/[0.04] border-primary/50 shadow-2xl shadow-primary/10 z-10"
                : "bg-white/[0.02] border-white/5 hover:border-white/10"
        )}>
            {popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-primary/40">
                    Recommandé
                </div>
            )}

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
                        {details.price === 0 ? '0€' : `${details.price}€`}
                    </span>
                    <span className="text-white/40">/mois</span>
                </div>
                <p className="text-center text-sm text-white/40 mt-4 h-10">{details.description}</p>
            </div>

            <ul className="mb-8 space-y-4 flex-1">
                {details.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                    </li>
                ))}
            </ul>

            <Link href="/signup" className="mt-auto w-full">
                <Button className={cn(
                    "w-full h-12 rounded-xl text-base font-medium transition-all",
                    popular
                        ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/5"
                )}>
                    {plan === 'free' ? 'Commencer gratuitement' : 'Choisir ce plan'}
                </Button>
            </Link>
        </div>
    )
}
