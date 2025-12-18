"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Sparkles } from "lucide-react";

export default function DemoPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-primary/30 overflow-hidden">
            {/* Cinematic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[120px] opacity-40" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[120px] opacity-30" />
            </div>

            {/* Header */}
            <header className="relative z-50 w-full max-w-7xl mx-auto p-4 md:p-8 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
                <Link href="/" className="flex items-center gap-2 md:gap-3 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="text-lg md:text-xl tracking-tight font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Repeto</span>
                </Link>

                <Link href="/">
                    <Button variant="ghost" className="rounded-full text-gray-400 hover:text-white hover:bg-white/5 gap-2 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </Button>
                </Link>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-6 pb-12">
                <div className="max-w-5xl w-full space-y-8 animate-in fade-in zoom-in duration-1000">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                            Découvrez <span className="text-primary italic">Repeto</span> en action
                        </h1>
                        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light">
                            Regardez comment REPETO transforme vos séances de répétition avec l'intelligence artificielle.
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
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0" // Placeholder URL
                                title="Repeto Demo Video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    </div>

                    <div className="flex justify-center pt-4">
                        <Link href="/signup">
                            <Button size="lg" className="h-14 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-base btn-glow transition-all transform hover:scale-105">
                                Commencer l'expérience
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 w-full py-8 text-center border-t border-white/5 bg-black/40 backdrop-blur-xl">
                <p className="text-gray-500 text-sm">
                    Rejoignez des milliers de comédiens qui progressent chaque jour.
                </p>
            </footer>
        </div>
    );
}
