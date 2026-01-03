import { getTroupeSessions } from "@/lib/actions/session";
import { getTroupeDetails } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Calendar, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PersonalPrepButton } from "./personal-prep-button";

export default async function LiveSessionsPage({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId);
    const allSessions = await getTroupeSessions(troupeId);

    // Only show prepared sessions (with a plan)
    const now = new Date();
    const preparedSessions = allSessions
        .filter((s: any) => s.session_plans && s.session_plans.selected_scenes?.length > 0)
        .filter(s => new Date(s.start_time) >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                        Séance Live
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Play className="w-4 h-4 text-primary" />
                        Lancez une séance préparée
                    </p>
                </div>
            </div>

            {/* Prepared Sessions */}
            {preparedSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-primary/10 to-purple-500/10 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-border/50 shadow-xl backdrop-blur-sm">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">
                        Aucune séance préparée
                    </h3>
                    <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed text-sm">
                        Préparez votre prochaine répétition en amont dans l'onglet "Préparation Séance" pour la retrouver ici le jour J.
                    </p>
                    <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                        <Link href={`/troupes/${troupeId}/sessions`}>
                            Préparer une séance
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {preparedSessions.map((session: any) => {
                        const date = new Date(session.start_time);
                        const sceneCount = session.session_plans?.selected_scenes?.length || 0;

                        return (
                            <Card key={session.id} className="bg-card border-border hover:border-green-500/30 transition-all group overflow-hidden">
                                <div className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-6 flex-1 min-w-0">
                                        {/* Date Block */}
                                        <div className="text-center min-w-[70px] p-4 rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                                            <p className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1">
                                                {date.toLocaleDateString('fr-FR', { month: 'short' })}
                                            </p>
                                            <p className="text-3xl font-black text-foreground leading-none">
                                                {date.getDate()}
                                            </p>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-foreground text-xl group-hover:text-green-500 transition-colors truncate">
                                                    {session.title || "Répétition"}
                                                </h3>
                                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] px-2 py-0.5 shrink-0">
                                                    {sceneCount} scène{sceneCount > 1 ? 's' : ''}
                                                </Badge>
                                            </div>
                                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 truncate">
                                                <Calendar className="w-3 h-3 shrink-0" />
                                                {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {session.plays?.title || "Pièce non définie"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <PersonalPrepButton sessionId={session.id} />

                                        <Button asChild size="lg" className={cn(
                                            "rounded-xl font-black text-xs uppercase tracking-widest px-6 h-12 shadow-lg transition-all active:scale-95",
                                            troupe?.my_role === 'admin'
                                                ? "bg-green-500 hover:bg-green-600 text-foreground shadow-green-500/20"
                                                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-secondary/20"
                                        )}>
                                            <Link href={`/troupes/${troupeId}/sessions/${session.id}/live`}>
                                                <Play className="w-4 h-4 mr-2 fill-current" />
                                                {troupe?.my_role === 'admin' ? "Lancer" : "Voir"}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
