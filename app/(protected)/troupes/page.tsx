import { getUserTroupes } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button"; // Assuming available
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TroupesPage() {
    const troupes = await getUserTroupes();

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mes Troupes</h1>
                    <p className="text-muted-foreground">Gérez vos groupes de théâtre, pièces et répétitions.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/troupes/join">
                        <Button variant="outline">Rejoindre une troupe</Button>
                    </Link>
                    <Link href="/troupes/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Créer une troupe
                        </Button>
                    </Link>
                </div>
            </div>

            {troupes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/50">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Aucune troupe pour le moment</h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        Rejoignez une troupe existante ou créez la vôtre pour commencer à gérer vos pièces.
                    </p>
                    <Link href="/troupes/create">
                        <Button>Créer ma première troupe</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {troupes.map((troupe: any) => (
                        <Card key={troupe.id} className="hover:shadow-lg transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{troupe.name}</CardTitle>
                                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                        {troupe.join_code}
                                    </span>
                                </div>
                                <CardDescription>
                                    {troupe.my_role === 'admin' ? 'Administrateur' : 'Membre'}
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Link href={`/troupes/${troupe.id}`} className="w-full">
                                    <Button className="w-full" variant="secondary">
                                        Accéder à l'espace
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
