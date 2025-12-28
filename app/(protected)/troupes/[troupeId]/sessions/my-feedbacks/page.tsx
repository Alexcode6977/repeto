import { getMyFeedbacks } from "@/lib/actions/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageSquare, User, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function MyFeedbacksPage({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const feedbacks = await getMyFeedbacks(troupeId);

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col gap-4 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
                <Link
                    href={`/troupes/${troupeId}/sessions`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit relative"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Retour aux séances
                </Link>
                <div className="relative">
                    <h1 className="text-5xl font-extrabold tracking-tighter text-foreground mb-2">
                        Mon Journal de Notes
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Retrouvez tous les retours du metteur en scène sur vos personnages
                    </p>
                </div>
            </div>

            {/* Feedbacks Timeline */}
            <div className="grid gap-6">
                {feedbacks.length === 0 ? (
                    <div className="p-20 text-center rounded-3xl bg-card border-2 border-dashed border-white/5">
                        <MessageSquare className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                        <p className="text-muted-foreground font-bold text-lg">Aucun retour pour le moment.</p>
                        <p className="text-gray-600 text-sm">Ils apparaîtront ici après vos prochaines répétitions.</p>
                    </div>
                ) : (
                    feedbacks.map((fb: any) => (
                        <Card key={fb.id} className="bg-card border-border backdrop-blur-md rounded-3xl overflow-hidden group hover:border-primary/20 transition-all">
                            <CardHeader className="p-6 pb-0 border-b-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {fb.play_characters?.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                                {fb.play_characters?.name}
                                            </CardTitle>
                                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                                                <Calendar className="w-3 h-3" /> {new Date(fb.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="rounded-full px-3 py-1 bg-card border-border text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                                        {fb.events?.title || "Séance"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-6 gap-4 flex flex-col">
                                {fb.events?.session_plans && (
                                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                                        <p className="text-[9px] uppercase font-black text-primary tracking-widest mb-1">Objectif fixé</p>
                                        <p className="text-xs text-foreground/90 font-bold">
                                            {(() => {
                                                const scenes = fb.events.session_plans.selected_scenes as any[];
                                                const charId = fb.character_id;

                                                // Find if there's a specific objective for this character in any planned scene
                                                let specificGoal = "";
                                                scenes.forEach(s => {
                                                    const charGoal = s.characterObjectives?.find((co: any) => co.id === charId)?.objective;
                                                    if (charGoal) specificGoal = charGoal;
                                                });

                                                if (specificGoal) return specificGoal;

                                                // Fallback to scene objectives
                                                return scenes.map(s => s.objective).filter(Boolean).join(" • ") || "Travail général";
                                            })()}
                                        </p>
                                    </div>
                                )}
                                <div className="p-6 rounded-2xl bg-background/20 border border-white/5 relative">
                                    <p className="text-lg text-gray-200 leading-relaxed font-medium italic">
                                        "{fb.text}"
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
