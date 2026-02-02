'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MessageCircle, FileText } from "lucide-react";
import { SessionPlanStructure } from "@/lib/types";

interface SessionValidatedClientProps {
    sessionData: any;
    feedbacks: any[]; // Feedbacks visible to this user
}

export function SessionValidatedClient({ sessionData, feedbacks }: SessionValidatedClientProps) {
    const plan = sessionData.session_plans?.[0] || sessionData.session_plans;
    const structure = plan?.plan_structure as SessionPlanStructure | undefined;
    const segments = structure?.segments || [];
    const generalNotes = structure?.objective || plan?.general_notes;

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            <div className="text-center space-y-4 py-8">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                    Séance Validée
                </Badge>
                <h1 className="text-4xl font-black text-foreground">{sessionData.title}</h1>
                <p className="text-muted-foreground">{new Date(sessionData.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="grid gap-8">
                {/* User's customized Feedbacks */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Vos Retours
                    </h2>
                    {feedbacks.length === 0 ? (
                        <Card className="bg-muted/10 border-dashed">
                            <CardContent className="py-8 text-center text-muted-foreground italic">
                                Aucun feedback spécifique pour vous sur cette séance.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {feedbacks.map((fb, idx) => (
                                <Card key={idx} className="bg-primary/5 border-primary/20">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black uppercase text-primary tracking-widest">{fb.play_characters?.name || "Général"}</span>
                                            <span className="text-[10px] text-muted-foreground">{new Date(fb.created_at).toLocaleTimeString()}</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-medium text-foreground">{fb.text}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Session Recap */}
                <div className="space-y-4 pt-8 border-t border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2 opacity-80">
                        <FileText className="w-5 h-5" />
                        Rappel du Programme
                    </h2>

                    {generalNotes && (
                        <div className="bg-muted/30 p-4 rounded-xl text-sm italic text-muted-foreground border border-border/50">
                            "{generalNotes}"
                        </div>
                    )}

                    <div className="space-y-2">
                        {segments.map((seg, idx) => (
                            <div key={idx} className="flex items-baseline gap-2 text-sm">
                                <span className="font-bold text-foreground">{seg.playTitle} :</span>
                                <span className="text-muted-foreground">{seg.scenes.map(s => s.title).join(", ")}</span>
                            </div>
                        ))}
                        {!structure && plan?.selected_scenes && (
                            <div className="text-sm text-muted-foreground">
                                {plan.selected_scenes.map((s: any) => s.title).join(", ")}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
