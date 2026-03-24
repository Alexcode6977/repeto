"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";
import { DeletePlayButton } from "./delete-play-button";
import { PlayPosterCard } from "./play-poster-card";
import { PlaysCarousel } from "./plays-carousel";
import { TroupeImportWizard } from "./components/troupe-import-wizard";
import { useRouter } from "next/navigation";

export function TroupePlaysClient({
    plays,
    troupeId,
    canManage,
    isAdmin,
    userTier,
    userEmail
}: {
    plays: any[];
    troupeId: string;
    canManage: boolean;
    isAdmin: boolean;
    userTier: any;
    userEmail: string | null;
}) {
    const [showImportWizard, setShowImportWizard] = useState(false);
    const router = useRouter();

    const handleImportComplete = async () => {
        router.refresh();
    };

    return (
        <div className="space-y-12">
            <div className="flex flex-col gap-2 relative z-10">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
                    Bibliothèque
                </h1>
                <p className="text-lg text-muted-foreground font-medium max-w-2xl">
                    Accédez aux scripts, distribuez les rôles et lancez les répétitions.
                </p>
            </div>

            {/* Mobile View: Horizontal Carousel */}
            <div className="md:hidden space-y-4">
                {canManage && (
                    <div className="flex justify-end">
                        <Button onClick={() => setShowImportWizard(true)} size="sm" className="rounded-full font-semibold cursor-pointer z-20 relative">
                            <Plus className="w-4 h-4 mr-2 pointer-events-none" />
                            Ajouter une pièce
                        </Button>
                    </div>
                )}
                <PlaysCarousel plays={plays} troupeId={troupeId} isAdmin={canManage} onAddPlay={() => setShowImportWizard(true)} />
            </div>

            {/* Desktop View: Grid */}
            <div className="hidden md:grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {plays.map((play, index: number) => (
                    <div key={play.id} className="relative group/wrapper">
                        {canManage && (
                            <div className="absolute -top-2 -right-2 z-50 opacity-0 group-hover/wrapper:opacity-100 transition-opacity">
                                <DeletePlayButton playId={play.id} playTitle={play.title} />
                            </div>
                        )}
                        <PlayPosterCard play={play} troupeId={troupeId} index={index} />
                    </div>
                ))}

                {/* Add New Play Card (Admin Only) */}
                {canManage && (
                    <button onClick={() => setShowImportWizard(true)} className="block group relative w-full aspect-[2/3] cursor-pointer text-left z-20">
                        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-4 transition-all duration-300 text-muted-foreground hover:text-primary">
                            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8 pointer-events-none" />
                            </div>
                            <span className="font-bold uppercase tracking-widest text-xs pointer-events-none">Ajouter une pièce</span>
                        </div>
                    </button>
                )}
            </div>

            {/* Empty State */}
            {plays.length === 0 && !isAdmin && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-60">
                    <BookOpen className="h-16 w-16 mb-4" />
                    <p>Aucune pièce disponible</p>
                </div>
            )}

            <TroupeImportWizard 
                troupeId={troupeId}
                showImportGuide={showImportWizard}
                setShowImportGuide={setShowImportWizard}
                userTier={userTier}
                userEmail={userEmail}
                onImportComplete={handleImportComplete}
                onError={(msg) => alert(msg)}
            />
        </div>
    );
}
