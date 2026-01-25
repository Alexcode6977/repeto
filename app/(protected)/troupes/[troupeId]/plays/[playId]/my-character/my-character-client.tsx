"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mic, MessageSquare, Lightbulb, BarChart3, Calendar, Clock, Target, Film, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useHaptic } from "@/lib/hooks/use-haptic";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface LineError {
    lineIndex: number;
    lineText: string;
    characterName: string;
    errorCount: number;
    errorTypes: Record<string, number>;
}

interface MyCharacterClientProps {
    troupeId: string;
    playId: string;
    playTitle: string;
    character: {
        id: string;
        name: string;
        description?: string;
        lineCount: number;
        sceneCount: number;
    };
    feedbacks: {
        id: string;
        text: string;
        type?: string;
        created_at: string;
        event_id?: string;
        events?: { id: string; title: string; start_time: string } | null;
    }[];
    uniqueEvents: { id: string; title: string; start_time: string }[];
    scenes: { id: string; title: string; scene_number: number }[];
    lineErrors: LineError[];
    stats: {
        totalSessions: number;
        totalMinutes: number;
        avgFirstTryRate: number;      // New
        totalLinesValidated: number;  // New
        totalLinesSkipped: number;    // New
        totalLinesWrong: number;      // New
        recentSessions: any[];
    };
}

export function MyCharacterClient({
    troupeId,
    playId,
    playTitle,
    character,
    feedbacks,
    uniqueEvents,
    scenes,
    lineErrors,
    stats
}: MyCharacterClientProps) {
    const { trigger } = useHaptic();
    const [selectedEventId, setSelectedEventId] = useState<string>("all");

    const filteredFeedbacks = selectedEventId === "all"
        ? feedbacks
        : feedbacks.filter(fb => fb.event_id === selectedEventId);

    const feedbackItems = filteredFeedbacks.filter(fb => fb.type !== 'indication');
    const indicationItems = filteredFeedbacks.filter(fb => fb.type === 'indication');

    return (
        <div className="flex flex-col gap-5 p-4 pb-24 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/troupes/${troupeId}/plays/${playId}`}>
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{playTitle}</p>
                    <h1 className="text-xl font-black tracking-tight">Mon Personnage</h1>
                </div>
            </div>

            {/* Character Card - Compact */}
            <Card className="p-4 bg-primary/10 border-primary/20 rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold shadow-lg shadow-primary/30">
                        {character.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-primary leading-tight">{character.name}</h2>
                        {character.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{character.description}</p>
                        )}
                    </div>
                    <div className="flex gap-3 text-center">
                        <div>
                            <p className="text-lg font-bold text-primary">{character.lineCount}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">répliques</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-primary">{character.sceneCount}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">scènes</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Record Voice Button - Smaller */}
            <Link href={`/troupes/${troupeId}/plays/${playId}/record`} className="block w-1/2">
                <motion.div whileTap={{ scale: 0.98 }} onClick={() => trigger('medium')}>
                    <Card className="p-3 bg-red-500/10 hover:bg-red-500/20 border-0 rounded-2xl cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                <Mic className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-red-400">Enregistrer</h3>
                                <p className="text-[9px] text-red-400/60">Ma voix</p>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </Link>

            {/* Stats Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Statistiques</h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Card className="p-3 bg-card border-border rounded-xl text-center">
                        <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Target className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-xl font-bold">{stats.totalSessions}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Répétitions</p>
                    </Card>
                    <Card className="p-3 bg-card border-border rounded-xl text-center">
                        <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-teal-400" />
                        </div>
                        <p className="text-xl font-bold">{stats.totalMinutes}<span className="text-sm">m</span></p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Temps total</p>
                    </Card>

                    {/* NEW STATS */}
                    <Card className="p-3 bg-card border-border rounded-xl text-center">
                        <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-green-400" />
                        </div>
                        <p className="text-xl font-bold">{stats.avgFirstTryRate}%</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Taux 1er coup</p>
                    </Card>
                    <Card className="p-3 bg-card border-border rounded-xl text-center">
                        <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-xl font-bold">{stats.totalLinesValidated}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Répliques Dites</p>
                    </Card>
                </div>
            </div>

            {/* Difficult Lines - Compact with Sheet */}
            {lineErrors.length > 0 && (
                <Sheet>
                    <SheetTrigger asChild>
                        <motion.div whileTap={{ scale: 0.98 }} onClick={() => trigger('selection')}>
                            <Card className="p-4 bg-orange-500/10 border-orange-500/20 rounded-2xl cursor-pointer hover:bg-orange-500/15 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-orange-400">Répliques à travailler</h3>
                                            <p className="text-[10px] text-orange-400/70">{lineErrors.length} points de blocage identifiés</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded-full px-3 text-xs font-bold">
                                        Voir
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-t-white/10 dark:bg-[#0a0a0a]">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                Répliques Difficiles
                            </SheetTitle>
                        </SheetHeader>

                        <div className="space-y-3 overflow-y-auto pb-8 h-full">
                            {lineErrors.map((error, idx) => (
                                <Card key={idx} className="p-4 bg-orange-500/5 border-orange-500/10 rounded-xl">
                                    <div className="flex justify-between items-start gap-4 mb-2">
                                        <span className="text-[10px] uppercase font-bold text-orange-500/50 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                            Ligne {error.lineIndex + 1}
                                        </span>
                                        <span className="text-xs font-black text-orange-500">
                                            {error.errorCount} échecs
                                        </span>
                                    </div>
                                    <p className="text-base text-foreground font-serif leading-relaxed">"{error.lineText}"</p>

                                    {/* Error breakdown mini-badges */}
                                    <div className="flex gap-2 mt-3">
                                        {Object.entries(error.errorTypes).map(([type, count]) => (
                                            <span key={type} className="text-[9px] uppercase font-bold text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded">
                                                {type === 'skip' ? 'Passée' : type === 'timeout' ? 'Trop lent' : 'Erreur'} : {count}
                                            </span>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>
            )}

            {/* Scene List */}
            {scenes.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Film className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scènes</h3>
                    </div>
                    <div className="space-y-2">
                        {scenes.slice(0, 5).map((scene) => (
                            <Card key={scene.id} className="p-3 bg-muted/20 border-0 rounded-xl flex items-center justify-between">
                                <span className="text-sm font-medium">{scene.title || `Scène ${scene.scene_number}`}</span>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Feedbacks & Indications - Tabs */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Retours reçus</h3>
                    </div>

                    {uniqueEvents.length > 0 && (
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder="Toutes séances" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes séances</SelectItem>
                                {uniqueEvents.map((ev) => (
                                    <SelectItem key={ev.id} value={ev.id}>
                                        {ev.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <Tabs defaultValue="feedbacks" className="w-full">
                    <TabsList className="w-full bg-muted/30 rounded-xl p-1">
                        <TabsTrigger value="feedbacks" className="flex-1 text-xs rounded-lg">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Feedbacks ({feedbackItems.length})
                        </TabsTrigger>
                        <TabsTrigger value="indications" className="flex-1 text-xs rounded-lg">
                            <Lightbulb className="w-3 h-3 mr-1" />
                            Indications ({indicationItems.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="feedbacks" className="mt-3 space-y-2">
                        {feedbackItems.length === 0 ? (
                            <Card className="p-5 bg-muted/10 border-0 rounded-xl text-center">
                                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground">Aucun feedback reçu.</p>
                            </Card>
                        ) : (
                            feedbackItems.map((fb) => (
                                <Card key={fb.id} className="p-3 bg-yellow-500/5 border-yellow-500/10 rounded-xl">
                                    <p className="text-sm text-foreground italic">"{fb.text}"</p>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                            {fb.events?.title || 'Séance'} • {new Date(fb.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="indications" className="mt-3 space-y-2">
                        {indicationItems.length === 0 ? (
                            <Card className="p-5 bg-muted/10 border-0 rounded-xl text-center">
                                <Lightbulb className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground">Aucune indication de jeu.</p>
                            </Card>
                        ) : (
                            indicationItems.map((fb) => (
                                <Card key={fb.id} className="p-3 bg-blue-500/5 border-blue-500/10 rounded-xl">
                                    <p className="text-sm text-foreground italic">"{fb.text}"</p>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                            {fb.events?.title || 'Séance'} • {new Date(fb.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
