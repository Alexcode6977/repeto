'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getUserPreparationDetails } from "@/lib/actions/session";
import { ArrowRight, BookOpen, Loader2, MessageSquare, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalPrepButtonProps {
    sessionId: string;
}

export function PersonalPrepButton({ sessionId }: PersonalPrepButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    const handleOpen = async (open: boolean) => {
        setIsOpen(open);
        if (open) {
            setIsLoading(true);
            try {
                const result = await getUserPreparationDetails(sessionId);
                setData(result);
            } catch (error) {
                console.error("Failed to load prep details", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="lg" className="rounded-xl px-6 h-12 font-black text-xs uppercase tracking-widest shadow-secondary/20 hover:bg-muted/80">
                    Préparer ma séance
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black tracking-tight">
                        <Sparkles className="w-6 h-6 text-primary" />
                        Préparation de la séance
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-0">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                            <p className="text-sm font-medium">Chargement de votre programme...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-center">
                            <User className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-bold">Aucune scène pour vous</p>
                            <p className="text-sm opacity-60 max-w-xs mt-2">
                                Vous n'avez pas de personnage assigné dans les pièces prévues pour cette séance.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8 mt-4">
                            {data.map((item: any, idx) => (
                                <div key={idx} className="space-y-4">
                                    {/* Play & Character Header */}
                                    <div className="flex items-start justify-between bg-muted/30 p-4 rounded-xl border border-border">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-1">
                                                Pièce
                                            </p>
                                            <h3 className="text-xl font-bold text-foreground">
                                                {item.playTitle}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-primary" />
                                                </div>
                                                <span className="text-sm font-semibold">{item.characterName}</span>
                                            </div>
                                        </div>

                                        {/* Last Feedback Snippet */}
                                        {item.lastFeedback && (
                                            <div className="max-w-[40%] text-right">
                                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1 flex items-center justify-end gap-1">
                                                    <MessageSquare className="w-3 h-3" /> Dernier Feedback
                                                </p>
                                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs italic text-foreground/80 relative">
                                                    "{item.lastFeedback}"
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Scenes List */}
                                    <div className="grid gap-3 pl-2 border-l-2 border-border ml-2">
                                        {item.scenes.map((scene: any, sIdx: number) => (
                                            <div key={sIdx} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-foreground flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-black">{sIdx + 1}</span>
                                                        {scene.title}
                                                    </h4>
                                                </div>
                                                {scene.summary && (
                                                    <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                                                        {scene.summary}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
