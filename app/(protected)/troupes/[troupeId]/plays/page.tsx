import { getTroupePlays } from "@/lib/actions/play";
import { getTroupeDetails } from "@/lib/actions/troupe";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, User, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { DeletePlayButton } from "./delete-play-button";
import { PlayPosterCard } from "./play-poster-card";
import { PlaysCarousel } from "./plays-carousel";

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
            {/* Header Section */}
            <div className="flex flex-col gap-2 relative z-10">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
                    Bibliothèque
                </h1>
                <p className="text-lg text-muted-foreground font-medium max-w-2xl">
                    Accédez aux scripts, distribuez les rôles et lancez les répétitions.
                </p>
            </div>

            {/* Plays Grid / Carousel */}

            {/* Mobile View: Horizontal Carousel */}
            <div className="md:hidden">
                <PlaysCarousel plays={plays} troupeId={troupeId} isAdmin={isAdmin} />
            </div>

            {/* Desktop View: Grid */}
            <div className="hidden md:grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {plays.map((play: any, index: number) => (
                    <div key={play.id} className="relative group/wrapper">
                        {isAdmin && (
                            <div className="absolute -top-2 -right-2 z-50 opacity-0 group-hover/wrapper:opacity-100 transition-opacity">
                                <DeletePlayButton playId={play.id} playTitle={play.title} />
                            </div>
                        )}
                        <PlayPosterCard play={play} troupeId={troupeId} index={index} />
                    </div>
                ))}

                {/* Add New Play Card (Admin Only) */}
                {isAdmin && (
                    <Link href={`/troupes/${troupeId}/plays/new`} className="block group relative w-full aspect-[2/3]">
                        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-4 transition-all duration-300 text-muted-foreground hover:text-primary">
                            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="font-bold uppercase tracking-widest text-xs">Ajouter une pièce</span>
                        </div>
                    </Link>
                )}
            </div>

            {/* Empty State (Only if no plays and not admin - admin sees the add card) */}
            {plays.length === 0 && !isAdmin && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-60">
                    <BookOpen className="h-16 w-16 mb-4" />
                    <p>Aucune pièce disponible</p>
                </div>
            )}
        </div>
    );
}
