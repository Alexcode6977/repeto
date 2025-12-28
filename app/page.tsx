import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Mic, BookOpen, Podcast, Play, Star, Sliders, Repeat } from "lucide-react";

export default function LandingPage() {
    return (
        // Added 'dark' class to force dark mode variables, and 'bg-background' to apply the dark background color
        <div className="dark bg-background text-foreground min-h-screen flex flex-col font-sans selection:bg-primary/30 overflow-x-hidden">

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
                    <span className="text-lg md:text-xl tracking-tight font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Repeto</span>
                </div>
                <div className="flex items-center gap-3 md:gap-6">
                    <Link href="/login" className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Se connecter
                    </Link>
                    <Link href="/signup" className="hidden md:block">
                        <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-4 py-4 md:px-6 md:py-5 font-semibold text-xs md:text-sm shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                            Essayer gratuitement
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-0 py-16 md:py-24 text-center w-full max-w-full">

                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-8">



                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.2] md:leading-[1.1] text-foreground">
                        Votre partenaire de répétition, <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-teal-400 to-primary">
                            disponible 24/7.
                        </span>
                    </h1>

                    <p className="max-w-xl mx-auto text-base md:text-xl text-muted-foreground leading-relaxed font-light px-4 md:px-0">
                        Le répétiteur infatigable pour maîtriser votre texte avant de retrouver vos partenaires de jeu.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-4">
                        <Link href="/signup" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm md:text-base btn-glow transition-all transform hover:scale-105">
                                Créer un compte
                                <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                        </Link>
                        <Link href="/login" className="w-full sm:w-auto md:hidden">
                            <Button size="lg" variant="outline" className="w-full h-12 rounded-full border-border bg-background/50 text-foreground hover:bg-muted transition-all">
                                Se connecter
                            </Button>
                        </Link>
                        <Link href="/demo">
                            <Button size="lg" variant="ghost" className="h-14 px-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-all group">
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

                {/* How it Works Section */}
                <div className="w-full max-w-6xl mx-auto px-6 mt-32">
                    <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Comment ça marche ?
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0" />

                        <div className="flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)] group-hover:scale-110 transition-transform duration-500 relative z-10 bg-background">
                                <BookOpen className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Bibliothèque ou Import</h3>
                            <p className="text-muted-foreground leading-relaxed max-w-xs">
                                Vous prenez un texte de la biblio ou importez le votre en pdf.
                            </p>
                        </div>

                        <div className="flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-teal-500/10 flex items-center justify-center mb-6 border border-teal-500/20 shadow-[0_0_30px_rgba(20,184,166,0.2)] group-hover:scale-110 transition-transform duration-500 relative z-10 bg-background">
                                <Sliders className="w-10 h-10 text-teal-500 dark:text-teal-400" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Choisissez votre mode</h3>
                            <p className="text-muted-foreground leading-relaxed max-w-xs">
                                Lecture, répétition totale, etc.
                            </p>
                        </div>

                        <div className="flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)] group-hover:scale-110 transition-transform duration-500 relative z-10 bg-background">
                                <Repeat className="w-10 h-10 text-purple-500 dark:text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Répétez à l'infini</h3>
                            <p className="text-muted-foreground leading-relaxed max-w-xs">
                                Progressez à votre rythme.
                            </p>
                        </div>
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
