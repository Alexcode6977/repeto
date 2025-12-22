import { getPlayDetails } from "@/lib/actions/play";
import { getTroupeDetails, getTroupeGuests } from "@/lib/actions/troupe";
import { createClient } from "@/lib/supabase/server";
import { CastingManager } from "@/components/casting-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";

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
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/troupes/${troupeId}/plays`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{play.title}</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Créé le {new Date(play.created_at).toLocaleDateString()}
                        {play.pdf_url && <Badge variant="secondary">PDF Lié</Badge>}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="casting" className="w-full">
                <TabsList>
                    <TabsTrigger value="casting">Distribution</TabsTrigger>
                    <TabsTrigger value="scenes">Scènes & Structure</TabsTrigger>
                    <TabsTrigger value="script">Script</TabsTrigger>
                </TabsList>

                <TabsContent value="casting" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribution des rôles</CardTitle>
                            <CardDescription>
                                Associez les personnages de la pièce aux membres de votre troupe.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CastingManager
                                characters={play.play_characters}
                                troupeMembers={troupeMembers}
                                guests={guests}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="scenes" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Liste des Scènes ({play.play_scenes.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {play.play_scenes.map((scene: any) => (
                                    <div key={scene.id} className="p-3 border rounded flex justify-between items-center text-sm">
                                        <span className="font-medium">{scene.title}</span>
                                        <span className="text-muted-foreground text-xs">
                                            {scene.scene_characters?.length || 0} persos
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="script" className="pt-4">
                    <div className="p-8 border rounded-lg bg-card font-serif leading-relaxed max-h-[600px] overflow-y-auto whitespace-pre-wrap text-sm">
                        {/* Simplistic render of script content, ideally use ScriptViewer logic */}
                        {play.script_content?.lines?.slice(0, 100).map((l: any, i: number) => (
                            <div key={i} className={`mb-2 ${l.type === 'character' ? 'font-bold uppercase mt-4' : ''}`}>
                                {l.character && <span className="font-bold text-primary mr-2">{l.character}:</span>}
                                {l.text}
                            </div>
                        ))}
                        <p className="text-center text-muted-foreground mt-8 italic">... (Aperçu limité) ...</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
