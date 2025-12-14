
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Mic, BookOpen, Drama, Star } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#0a0505] text-[#f4e4bc] selection:bg-[#c02424]/30 font-serif overflow-x-hidden">

            {/* Theater Stage Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Left Curtain Gradient */}
                <div className="absolute top-0 left-0 w-[30%] h-full bg-gradient-to-r from-[#1a0505] to-transparent z-10" />
                {/* Right Curtain Gradient */}
                <div className="absolute top-0 right-0 w-[30%] h-full bg-gradient-to-l from-[#1a0505] to-transparent z-10" />
                {/* Top Valence */}
                <div className="absolute top-[-10%] left-0 w-full h-[30%] bg-[#c02424] opacity-20 blur-[100px] rounded-full z-0" />
                {/* Spotlight */}
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#fff5d6] opacity-5 rounded-full blur-[100px]" />
            </div>

            {/* Navigation */}
            <header className="relative z-50 w-full max-w-7xl mx-auto p-6 md:p-8 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c02424] border-2 border-[#d4af37] flex items-center justify-center shadow-[0_0_20px_rgba(192,36,36,0.4)]">
                        <Drama className="w-6 h-6 text-[#fff5d6]" />
                    </div>
                    <span className="text-2xl tracking-tight text-[#fff5d6] font-medium">Repeto</span>
                </div>
                <div className="flex items-center gap-6">
                    <Link href="/login" className="text-sm uppercase tracking-widest text-[#d4af37] hover:text-[#fff5d6] transition-colors font-sans font-bold">
                        Se connecter
                    </Link>
                    <Link href="/login">
                        <Button className="rounded-full bg-[#c02424] hover:bg-[#a01e1e] text-[#fff5d6] border border-[#d4af37]/50 px-8 py-6 font-sans uppercase tracking-wider text-xs font-bold shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all hover:scale-105">
                            Entrer en scène
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-0 py-20 text-center w-full max-w-full">

                <div className="animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-12 max-w-5xl mx-auto">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-[0.2em] mb-10 font-sans backdrop-blur-sm">
                        <Star className="w-3 h-3 fill-current" />
                        Votre souffleur personnel
                        <Star className="w-3 h-3 fill-current" />
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-9xl tracking-tight mb-8 leading-[0.9] text-[#fff5d6] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                        Ne répétez plus <br />
                        <span className="italic text-[#c02424] drop-shadow-[0_0_30px_rgba(192,36,36,0.4)]">jamais seul.</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-xl md:text-2xl text-[#d4af37]/80 mb-14 leading-relaxed font-light italic">
                        "Le théâtre, c'est d'abord un texte." <br />
                        Importez votre pièce. Repeto vous donne la réplique, inlassablement, jusqu'à la perfection.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link href="/login">
                            <Button size="lg" className="rounded-none border-2 border-[#d4af37] bg-transparent hover:bg-[#d4af37] text-[#d4af37] hover:text-[#0a0505] px-12 h-16 text-lg font-sans uppercase tracking-widest font-bold transition-all duration-300">
                                Commencer l'acte I
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Decorator Line */}
                <div className="w-full max-w-xs mx-auto h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent my-24" />

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-7xl mx-auto px-6 w-full">
                    {[
                        {
                            icon: BookOpen,
                            title: "Lecture Intelligente",
                            desc: "Déposez votre PDF. Repeto identifie instantanément votre rôle et vos partenaires."
                        },
                        {
                            icon: Mic,
                            title: "Le Souffleur",
                            desc: "Il vous écoute. Il attend. Et il vous lance la réplique suivante au moment exact."
                        },
                        {
                            icon: Sparkles,
                            title: "Émotion & Nuance",
                            desc: "Plus de voix robotiques. Travaillez avec des partenaires virtuels qui jouent vraiment."
                        }
                    ].map((feature, i) => (
                        <div key={i} className="flex flex-col items-center text-center p-8 rounded-2xl bg-[#fff5d6]/5 border border-[#d4af37]/10 hover:border-[#d4af37]/30 transition-all hover:bg-[#fff5d6]/10 group">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#c02424] to-[#801818] flex items-center justify-center mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-[#d4af37]/20 group-hover:scale-110 transition-transform duration-500">
                                <feature.icon className="w-7 h-7 text-[#fff5d6]" />
                            </div>
                            <h3 className="text-2xl text-[#fff5d6] mb-4 font-medium italic">{feature.title}</h3>
                            <p className="text-lg text-[#d4af37]/70 leading-relaxed font-light">{feature.desc}</p>
                        </div>
                    ))}
                </div>

            </main>

            <footer className="relative z-10 w-full py-12 text-center border-t border-[#d4af37]/10 mt-12 bg-black/40">
                <p className="text-[#d4af37]/40 text-sm font-sans uppercase tracking-widest mb-4">
                    L'outil secret des comédiens
                </p>
                <p className="text-[#666] text-xs font-sans">
                    &copy; {new Date().getFullYear()} Repeto. Tous droits réservés.
                </p>
            </footer>
        </div>
    );
}

