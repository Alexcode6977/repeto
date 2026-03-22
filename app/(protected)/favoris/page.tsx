"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Headphones, BookOpen, Heart, Play, Plus, BookText, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useHaptic } from "@/lib/hooks/use-haptic";

const mockFavoris = [
    {
        id: '1',
        scriptId: 'uuid-1',
        pieceTitle: 'Feu la mère de Madame',
        author: 'Georges Feydeau',
        character: 'Lucienne',
        mode: 'repeat', // repeat | listen | read
        config: { tolerance: 'Normale', visibility: 'Indices', readingMode: 'Intégral' },
        lastSession: 'Il y a 2 heures',
    },
    {
        id: '2',
        scriptId: 'uuid-2',
        pieceTitle: "L'aveu de Phèdre à Œnone",
        author: 'Jean Racine',
        character: 'Phèdre',
        mode: 'listen',
        config: { readingMode: 'Intégral', speed: 'Normale' },
        lastSession: 'Hier',
    },
    {
        id: '3',
        scriptId: 'uuid-1',
        pieceTitle: 'Feu la mère de Madame',
        author: 'Georges Feydeau',
        character: 'Lucienne',
        mode: 'repeat',
        config: { tolerance: 'Stricte', visibility: 'Caché', readingMode: 'Solo' },
        lastSession: 'Mardi dernier',
    },
];

export default function FavorisPage() {
    const router = useRouter();
    const { trigger } = useHaptic();
    const [favoris, setFavoris] = useState(mockFavoris);

    const handleLancer = (favori: typeof mockFavoris[0]) => {
        trigger('medium');
        // Pour l'instant, on redirige vers le dashboard (qui sera Mes Textes).
        // Plus tard : router.push(`/scripts/${favori.scriptId}/rehearse/${favori.mode}/active?config=...`)
        router.push("/dashboard");
    };

    if (favoris.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 rounded-3xl bg-[#EEEDFE] flex items-center justify-center mb-8 shadow-inner">
                    <Heart className="w-12 h-12 text-[#7F77DD] opacity-80" strokeWidth={1.5} />
                </div>
                <h1
                    className="text-2xl font-bold tracking-tight text-foreground mb-3"
                    style={{ fontFamily: 'var(--font-syne, sans-serif)' }}
                >
                    Pas encore de favoris
                </h1>
                <p className="text-muted-foreground mb-10 max-w-sm leading-relaxed">
                    Commencez par ajouter un texte, puis sauvegardez votre configuration préférée pour y accéder en un tap.
                </p>
                <div className="flex flex-col gap-4 w-full max-w-sm">
                    <Link href="/dashboard" className="w-full">
                        <Button
                            className="w-full h-14 rounded-2xl bg-[#7F77DD] hover:bg-[#7F77DD]/90 text-white font-bold text-base shadow-lg shadow-[#7F77DD]/20 hover:scale-[1.02] transition-all"
                            onClick={() => trigger('light')}
                        >
                            <BookText className="w-5 h-5 mr-2" />
                            Mes Textes
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        className="w-full h-14 rounded-2xl border-[#CECBF6] text-[#7F77DD] hover:bg-[#EEEDFE]/50 font-bold text-base transition-all"
                        onClick={() => {
                            trigger('light');
                            const btn = document.getElementById('global-import-btn');
                            if (btn) btn.click();
                            else router.push('/dashboard?import=true');
                        }}
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Importer mon texte
                    </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-12 font-medium uppercase tracking-wider">
                    Sauvegardez un favori après une session.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto w-full pb-6 px-4 md:px-0">
            {/* Header Favoris */}
            <div className="mb-8 pt-4">
                <h1
                    className="text-2xl font-bold tracking-tight text-foreground"
                    style={{ fontFamily: 'var(--font-syne, sans-serif)' }}
                >
                    Mes favoris
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Lancez une session en un tap
                </p>
            </div>

            {/* Liste Cards */}
            <div className="grid grid-cols-1 gap-4">
                {favoris.map((favori) => (
                    <Card
                        key={favori.id}
                        className="overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card"
                    >
                        <div className="flex flex-col p-5">
                            {/* Card Top */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        favori.mode === 'repeat' ? "bg-purple-500/10 text-[#7F77DD]" :
                                            favori.mode === 'listen' ? "bg-teal-500/10 text-teal-600" :
                                                "bg-amber-500/10 text-amber-600"
                                    )}>
                                        {favori.mode === 'repeat' && <Mic className="w-5 h-5" />}
                                        {favori.mode === 'listen' && <Headphones className="w-5 h-5" />}
                                        {favori.mode === 'read' && <BookOpen className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                            {favori.mode === 'repeat' ? "Répéter" : favori.mode === 'listen' ? "Écouter" : "Lire"}
                                            <span className="hidden sm:inline text-muted-foreground/40">—</span>
                                            <span className="text-foreground">{favori.character}</span>
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                            {favori.pieceTitle} · {favori.author}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-2 shrink-0"
                                    onClick={() => {
                                        trigger('light');
                                        setFavoris(favoris.filter(f => f.id !== favori.id));
                                    }}
                                >
                                    <Heart className="w-5 h-5 fill-current" />
                                </Button>
                            </div>

                            {/* Tags Configuration */}
                            <div className="flex flex-wrap gap-1.5 mb-5 pl-13 sm:pl-[52px]">
                                {Object.values(favori.config).map((val, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-secondary-foreground border border-border/50">
                                        {val}
                                    </span>
                                ))}
                            </div>

                            {/* Card Bottom */}
                            <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    Dernière : {favori.lastSession}
                                </span>
                                <Button
                                    size="sm"
                                    className={cn(
                                        "h-9 px-4 rounded-xl font-bold shadow-sm transition-all hover:scale-105 active:scale-95",
                                        favori.mode === 'repeat'
                                            ? "bg-[#7F77DD] hover:bg-[#7F77DD]/90 text-white shadow-[#7F77DD]/20"
                                            : favori.mode === 'listen'
                                                ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
                                                : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                                    )}
                                    onClick={() => handleLancer(favori)}
                                >
                                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                    Lancer
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
