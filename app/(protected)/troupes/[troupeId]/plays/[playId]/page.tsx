import { getPlayDetails } from "@/lib/actions/play";
import { getTroupeDetails, getTroupeGuests } from "@/lib/actions/troupe";
import { createClient } from "@/lib/supabase/server";
import { CastingManager } from "@/components/casting-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Calendar } from "lucide-react";

export default async function PlayDashboardPage({
    params
}: {
    params: Promise<{ troupeId: string; playId: string }>;
}) {
    const { troupeId, playId } = await params;
    const play = await getPlayDetails(playId);
    if (!play) return <div>Pièce introuvable</div>;

    // Get troupe members for casting dropdown
    const supabase = await createClient();
    const { data: members } = await supabase
        .from('troupe_members')
        .select('user_id, role, profiles(first_name, email)')
        .eq('troupe_id', troupeId);

    const troupeMembers = members || [];
    const guests = await getTroupeGuests(troupeId);


    return (
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <Link href={`/troupes/${troupeId}/plays`} className="text-gray-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 group">
                            <span className="group-hover:-translate-x-1 transition-transform">←</span> Retour aux pièces
                        </Link>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-2 leading-none">
                        {play.title}
                    </h1>
                    <div className="flex items-center gap-4 text-gray-400 font-medium">
                        <p className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4" />
                            Importé le {new Date(play.created_at).toLocaleDateString()}
                        </p>
                        {play.pdf_url && (
                            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] tracking-widest font-black px-2 py-0.5 rounded-full">
                                PDF Synchronisé
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 relative shrink-0">
                    <Button variant="ghost" className="rounded-full px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all uppercase text-xs font-bold tracking-widest">
                        Paramètres
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="casting" className="w-full space-y-8">
                <div className="relative">
                    <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-md">
                        <TabsTrigger value="casting" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold uppercase text-[10px] tracking-[0.15em]">
                            Distribution
                        </TabsTrigger>
                        <TabsTrigger value="scenes" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold uppercase text-[10px] tracking-[0.15em]">
                            Scènes
                        </TabsTrigger>
                        <TabsTrigger value="script" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold uppercase text-[10px] tracking-[0.15em]">
                            Script
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="casting" className="space-y-4 outline-none">
                    <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-3xl border overflow-hidden">
                        <CardHeader className="p-8 pb-6 border-b border-white/5">
                            <CardTitle className="text-2xl font-bold text-white">Distribution des rôles</CardTitle>
                            <CardDescription className="text-gray-500 font-medium">
                                Associez les personnages de la pièce aux membres de votre troupe pour une gestion automatisée.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <CastingManager
                                characters={play.play_characters}
                                troupeMembers={troupeMembers}
                                guests={guests}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="scenes" className="space-y-4 outline-none">
                    <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-3xl border overflow-hidden">
                        <CardHeader className="p-8 pb-6 border-b border-white/5">
                            <CardTitle className="text-2xl font-bold text-white">
                                Liste des Scènes <span className="text-primary ml-2">{play.play_scenes.length}</span>
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">
                                Structure dramatique et personnages impliqués par scène.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-10">
                                {(() => {
                                    const grouped = play.play_scenes.reduce((acc: any, scene: any) => {
                                        const actName = scene.act || "Sans Acte";
                                        if (!acc[actName]) acc[actName] = [];
                                        acc[actName].push(scene);
                                        return acc;
                                    }, {});

                                    return Object.entries(grouped).map(([actName, scenes]: [string, any]) => (
                                        <div key={actName} className="space-y-4">
                                            <h3 className="text-sm font-black text-primary/50 uppercase tracking-[0.2em] border-l-4 border-primary pl-4 mb-4">
                                                {actName}
                                            </h3>
                                            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                                                {scenes.map((scene: any) => (
                                                    <div key={scene.id} className="p-4 rounded-2xl border border-white/5 bg-white/0 hover:bg-white/5 transition-all flex justify-between items-center group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-primary">
                                                                {scene.order_index + 1}
                                                            </div>
                                                            <span className="font-bold text-white group-hover:text-primary transition-colors text-lg">{scene.title}</span>
                                                        </div>
                                                        <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-500 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest">
                                                            {scene.scene_characters?.length || 0} persos
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="script" className="outline-none">
                    <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-3xl border overflow-hidden">
                        <CardHeader className="p-8 pb-6 border-b border-white/5">
                            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                                <FileText className="h-6 w-6 text-primary" />
                                Aperçu du Script
                            </CardTitle>
                            <CardDescription className="text-gray-500 font-medium">
                                Lecture seule du texte original. Pour l'étude et les répétitions, utilisez le mode Lecteur.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-10 font-serif leading-relaxed h-[600px] overflow-y-auto whitespace-pre-wrap text-lg bg-black/20 text-gray-300">
                                {/* Professional render of script content */}
                                {play.script_content?.lines?.slice(0, 150).map((l: any, i: number) => (
                                    <div key={i} className={`mb-4 ${l.type === 'character' ? 'text-white font-black uppercase text-xl mt-10 tracking-wide border-b border-white/5 pb-2' : ''}`}>
                                        {l.character && (
                                            <div className="text-primary font-black uppercase text-sm tracking-widest mb-1 opacity-80">
                                                {l.character}
                                            </div>
                                        )}
                                        <div className={l.type === 'stage_direction' ? 'italic text-gray-500 text-base' : ''}>
                                            {l.text}
                                        </div>
                                    </div>
                                ))}
                                <div className="py-20 text-center">
                                    <div className="h-px w-20 bg-primary/20 mx-auto mb-6" />
                                    <p className="text-gray-600 italic">Fin de l'aperçu dynamique</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
