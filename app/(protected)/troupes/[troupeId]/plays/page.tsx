import { getTroupePlays } from "@/lib/actions/play";
import { getTroupeDetails } from "@/lib/actions/troupe";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, User, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { DeletePlayButton } from "./delete-play-button";

export default async function TroupePlaysPage({
    params
}: {
    params: Promise<{ troupeId: string }>;
}) {
    const { troupeId } = await params;
    const troupe = await getTroupeDetails(troupeId); // Pass troupeId string
    const plays = await getTroupePlays(troupeId);

    if (!troupe) return <div>Troupe not found</div>;

    const isAdmin = troupe.my_role === 'admin';

    return (
        <div className="space-y-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <Link href={`/troupes/${troupeId}`} className="text-gray-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 group">
                            <span className="group-hover:-translate-x-1 transition-transform">←</span> Retour au dashboard
                        </Link>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-2 leading-none">
                        Pièces & <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Scripts</span>
                    </h1>
                    <p className="text-gray-400 font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Gestion de la bibliothèque de la troupe {troupe.name}
                    </p>
                </div>

                {isAdmin && (
                    <div className="relative shrink-0">
                        <Link href={`/troupes/${troupeId}/plays/new`}>
                            <Button className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all uppercase text-xs font-bold tracking-widest h-12">
                                <Plus className="mr-2 h-5 w-5" />
                                Ajouter une pièce
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {plays.map((play: any) => (
                    <div key={play.id} className="group relative">
                        {isAdmin && (
                            <div className="absolute top-4 right-4 z-50 animate-in fade-in zoom-in duration-300">
                                <DeletePlayButton playId={play.id} playTitle={play.title} />
                            </div>
                        )}
                        <Link href={`/troupes/${troupeId}/plays/${play.id}`} className="block h-full">
                            <Card className="h-full bg-white/5 border-white/10 backdrop-blur-md overflow-hidden transition-all duration-300 group-hover:bg-white/10 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] rounded-3xl border">
                                <CardHeader className="p-8 pb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                                        <BookOpen className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-bold text-white group-hover:text-primary transition-colors pr-10">
                                        {play.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-8 pb-8 pt-2">
                                    <div className="flex items-center gap-6 text-sm font-medium">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <User className="h-4 w-4 text-primary/60" />
                                            <span className="text-gray-300 font-bold">{play.play_characters?.[0]?.count || 0}</span>
                                            <span className="text-[10px] uppercase tracking-wider opacity-60">Rôles</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <BookOpen className="h-4 w-4 text-primary/60" />
                                            <span className="text-gray-300 font-bold">{play.play_scenes?.[0]?.count || 0}</span>
                                            <span className="text-[10px] uppercase tracking-wider opacity-60">Scènes</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-xs text-gray-500 uppercase tracking-widest font-black">Voir les détails</span>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-primary transition-all">
                                            <span className="text-sm">→</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                ))}

                {plays.length === 0 && (
                    <div className="col-span-full py-24 rounded-3xl border border-dashed border-white/10 bg-white/5 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                        <BookOpen className="h-20 w-20 text-white/10 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-2">Aucune pièce ajoutée</h3>
                        <p className="text-gray-500 mb-8 max-w-sm font-medium">
                            Importez votre premier texte pour commencer la distribution et les répétitions.
                        </p>
                        {isAdmin && (
                            <Link href={`/troupes/${troupeId}/plays/new`}>
                                <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-gray-200 transition-all font-bold">
                                    Ajouter ma première pièce
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
