import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Mic, BookOpen, Podcast, Play, Star } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen font-sans selection:bg-primary/30 overflow-x-hidden">

            {/* Cinematic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Deep atmospheric glow */}
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[120px] opacity-40" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[120px] opacity-30" />
            </div>

            {/* Navigation */}
            <header className="relative z-50 w-full max-w-7xl mx-auto p-4 md:p-8 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-2 md:gap-3 group cursor-pointer">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="text-lg md:text-xl tracking-tight font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Repeto</span>
                </div>
                <div className="flex items-center gap-3 md:gap-6">
                    <Link href="/login" className="hidden md:block text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                        Se connecter
                    </Link>
                    <Link href="/signup">
                        <Button className="rounded-full bg-white text-black hover:bg-white/90 px-4 py-4 md:px-6 md:py-5 font-semibold text-xs md:text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all transform hover:-translate-y-0.5">
                            Essayer gratuitement
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-0 py-16 md:py-24 text-center w-full max-w-full">

                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-8">



                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.2] md:leading-[1.1]">
                        Apprenez vos textes <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-teal-300 to-white text-glow">
                            sans partenaire.
                        </span>
                    </h1>

                    <p className="max-w-xl mx-auto text-base md:text-xl text-muted-foreground leading-relaxed font-light px-4 md:px-0">
                        L'outil de répétition ultime pour les acteurs exigeants. <br className="hidden md:block" />
                        <strong className="text-white font-medium">Importez votre script</strong>. L'IA vous donne la réplique instantanément.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-4">
                        <Link href="/signup" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm md:text-base btn-glow transition-all transform hover:scale-105">
                                Commencer maintenant
                                <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="lg" variant="ghost" className="h-14 px-8 rounded-full text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
                                <Play className="mr-2 w-4 h-4 fill-current opacity-50 group-hover:opacity-100 transition-opacity" />
                                Voir la démo
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Floating UI Elements (Parallax hint) */}
                <div className="absolute top-1/4 left-10 hidden lg:block animate-pulse duration-[4000ms] opacity-20">
                    <BookOpen className="w-24 h-24 text-white -rotate-12" />
                </div>
                <div className="absolute bottom-1/4 right-10 hidden lg:block animate-pulse duration-[5000ms] opacity-20">
                    <Mic className="w-24 h-24 text-primary rotate-12" />
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-6 mt-32 w-full">
                    {[
                        {
                            icon: BookOpen,
                            title: "Import Instantané",
                            desc: "Déposez votre PDF. Nous structurons tout automatiquement.",
                            color: "bg-blue-500/10 text-blue-400"
                        },
                        {
                            icon: Podcast,
                            title: "Voix Ultra-Réalistes",
                            desc: "Des partenaires virtuels qui jouent avec émotion et justesse.",
                            color: "bg-primary/10 text-primary"
                        },
                        {
                            icon: Star,
                            title: "Interactive Flow",
                            desc: "L'IA vous écoute et vous relance au millimètre près.",
                            color: "bg-purple-500/10 text-purple-400"
                        }
                    ].map((feature, i) => (
                        <div key={i} className="glass p-8 rounded-3xl hover:bg-white/10 transition-all group cursor-default border border-white/5 hover:border-white/20">
                            <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                                <feature.icon className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-base text-muted-foreground leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>

            </main>

            <footer className="relative z-10 w-full py-12 text-center border-t border-white/5 bg-black/40 backdrop-blur-xl">
                <p className="text-muted-foreground text-sm">
                    &copy; {new Date().getFullYear()} Repeto. Conçu pour l'excellence.
                </p>
            </footer>
        </div>
    );
}
