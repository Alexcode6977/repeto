import { getUserTroupes } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users } from "lucide-react";
import { TroupeActions } from "./components/troupe-actions";

export default async function TroupesPage() {
    const troupes = await getUserTroupes();


    return (
        <div className="max-w-7xl mx-auto px-4 pb-6 pt-24 md:px-12 md:pb-12 md:pt-32 space-y-12">
            {/* Header Section */}
            <div className="relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative mb-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground">
                        Mes <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Troupes</span>
                    </h1>
                </div>

                <TroupeActions />
            </div>

            {troupes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-border bg-muted/50 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
                    <Users className="h-20 w-20 text-muted-foreground/30 mb-6" />
                <h3 className="text-2xl font-bold text-foreground mb-2 text-center">Aucune troupe pour le moment</h3>
                <p className="text-muted-foreground mb-8 text-center max-w-sm">
                    Rejoignez une troupe existante ou créez la vôtre pour commencer l&apos;aventure collective.
                </p>
                    <Link href="/troupes/create">
                        <Button size="lg" className="rounded-full px-8 bg-foreground text-background hover:bg-foreground/90 transition-all font-bold">
                            Créer ma première troupe
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {troupes.map((troupe: any) => (
                        <Link key={troupe.id} href={`/troupes/${troupe.id}`} className="group block">
                            <div className="flex items-center p-4 gap-3 bg-white border border-black/[0.04] rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                                {/* GAUCHE */}
                                <div className="flex-shrink-0 w-9 h-9 rounded-[10px] bg-[#EEEDFE] flex items-center justify-center text-lg">
                                    🎭
                                </div>
                                {/* CENTRE */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xs font-bold text-[#1a1a1a] truncate">
                                        {troupe.name}
                                    </h3>
                                    <p className="text-[10px] text-[#888] truncate mt-0.5">
                                        {troupe.my_roles?.includes('pending') ? '⏳ En attente' :
                                            troupe.my_roles?.includes('admin') ? '👑 Administrateur' :
                                                troupe.my_roles?.includes('metteur_en_scene') ? '🎬 Metteur en scène' :
                                                    troupe.my_roles?.includes('adjoint') ? '🔧 Adjoint' : '👥 Membre'}
                                    </p>
                                </div>
                                {/* DROITE */}
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <span className="font-mono text-[9px] tracking-wider text-[#666] bg-[#f5f4fa] px-1.5 py-0.5 rounded uppercase">
                                        {troupe.join_code}
                                    </span>
                                    <span className="text-gray-400 group-hover:text-gray-600 transition-colors text-xs font-bold leading-none">
                                        &gt;
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
