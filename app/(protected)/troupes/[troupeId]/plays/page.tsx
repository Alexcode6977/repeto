import { getTroupePlays } from "@/lib/actions/play";
import { getTroupeDetails } from "@/lib/actions/troupe";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, User, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

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
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href={`/troupes/${troupeId}`}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pièces</h1>
                        <p className="text-muted-foreground">Gérez les scripts et la distribution.</p>
                    </div>
                </div>
                {isAdmin && (
                    <Link href={`/troupes/${troupeId}/plays/new`}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter une pièce
                        </Button>
                    </Link>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plays.map((play: any) => (
                    <Link href={`/troupes/${troupeId}/plays/${play.id}`} key={play.id}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                    {play.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {play.play_characters?.[0]?.count || 0} Personnages
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        {play.play_scenes?.[0]?.count || 0} Scènes
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {plays.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
                        <p className="text-muted-foreground mb-4">Aucune pièce ajoutée pour le moment.</p>
                        {isAdmin && (
                            <Link href={`/troupes/${troupeId}/plays/new`}>
                                <Button variant="outline">Ajouter votre première pièce</Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
