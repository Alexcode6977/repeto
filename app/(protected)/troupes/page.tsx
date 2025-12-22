import { getUserTroupes } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button"; // Assuming available
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TroupesPage() {
    const troupes = await getUserTroupes();

    return (
        <div className="space-y-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative">
                    <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-3">
                        Mes <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Troupes</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl">
                        Votre espace collaboratif pour gérer vos groupes, distribuez les rôles et préparer vos prochaines représentations.
                    </p>
                </div>

                <div className="flex gap-3 relative shrink-0">
                    <Link href="/troupes/join">
                        <Button variant="ghost" className="rounded-full px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all uppercase text-xs font-bold tracking-widest">
                            Rejoindre
                        </Button>
                    </Link>
                    <Link href="/troupes/create">
                        <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all uppercase text-xs font-bold tracking-widest">
                            <Plus className="mr-2 h-4 w-4" />
                            Créer une troupe
                        </Button>
                    </Link>
                </div>
            </div>

            {troupes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-white/10 bg-white/5 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
                    <Users className="h-20 w-20 text-white/20 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2 text-center">Aucune troupe pour le moment</h3>
                    <p className="text-gray-400 mb-8 text-center max-w-sm">
                        Rejoignez une troupe existante ou créez la vôtre pour commencer l'aventure collective.
                    </p>
                    <Link href="/troupes/create">
                        <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-gray-200 transition-all font-bold">
                            Créer ma première troupe
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {troupes.map((troupe: any) => (
                        <Link key={troupe.id} href={`/troupes/${troupe.id}`} className="group">
                            <Card className="h-full bg-white/5 border-white/10 backdrop-blur-md overflow-hidden transition-all duration-300 group-hover:bg-white/10 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] rounded-3xl border">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl">
                                            🎭
                                        </div>
                                        <Badge variant="outline" className="font-mono bg-white/5 border-white/10 text-white/60 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest">
                                            {troupe.join_code}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-2xl font-bold text-white group-hover:text-primary transition-colors">
                                        {troupe.name}
                                    </CardTitle>
                                    <CardDescription className="text-gray-500 font-medium pt-1">
                                        {troupe.my_role === 'admin' ? '👑 Administrateur' : '👥 Membre'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-8 pb-8 pt-0">
                                    <div className="h-px w-full bg-white/5 mb-6" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400 font-medium">Accéder à l'espace</span>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-primary transition-all">
                                            <span className="text-sm">→</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
