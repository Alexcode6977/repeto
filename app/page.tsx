import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Mic, BookOpen, Clock, Brain } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-black text-white selection:bg-emerald-500/30">

            {/* Background Ambience */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[100px]" />
            </div>

            {/* Navigation */}
            <header className="relative z-10 w-full max-w-6xl mx-auto p-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Repeto</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                        Se connecter
                    </Link>
                    <Link href="/login">
                        <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/10 hover:text-white px-6">
                            Essayer maintenant
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

                <div className="animate-in fade-in zoom-in duration-700 slide-in-from-bottom-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Nouvelle Version IA
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
                        Apprenez vos textes<br />
                        <span className="bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">sans partenaire.</span>
                    </h1>

                    <p className="max-w-xl mx-auto text-lg text-gray-400 mb-10 leading-relaxed">
                        Repeto donne vie à votre script. Importez votre PDF et répétez avec une IA qui vous donne la réplique, corrige vos erreurs et s'adapte à votre rythme.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/login">
                            <Button size="lg" className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-8 h-12 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1">
                                Commencer gratuitement
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button size="lg" variant="ghost" className="rounded-full text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 px-8 h-12">
                                Voir la démo
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24 w-full">
                    {[
                        {
                            icon: BookOpen,
                            title: "Import Instantané",
                            desc: "PDF, Word ou texte. Repeto analyse automatiquement les personnages et les répliques."
                        },
                        {
                            icon: Mic,
                            title: "Répétition Vocale",
                            desc: "Parlez naturellement. L'IA vous écoute et vous donne la réplique suivante quand vous avez fini."
                        },
                        {
                            icon: Brain,
                            title: "Réalisme Neural",
                            desc: "Des voix ultra-réalistes qui expriment des émotions pour une immersion totale."
                        }
                    ].map((feature, i) => (
                        <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors text-left group">
                            <div className="w-12 h-12 rounded-2xl bg-black/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <feature.icon className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>

            </main>

            <footer className="relative z-10 w-full p-6 text-center text-xs text-gray-600 border-t border-white/5">
                &copy; {new Date().getFullYear()} Repeto. Fait avec passion pour les acteurs.
            </footer>
        </div>
    );
}
