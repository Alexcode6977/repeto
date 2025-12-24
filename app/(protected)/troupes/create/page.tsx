'use client';

import { createTroupe } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateTroupePage() {
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            const troupeId = await createTroupe(name);
            // toast.success("Troupe créée avec succès!"); // Removed toast
            router.push(`/troupes/${troupeId}`);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la création de la troupe."); // Simple fallback
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container max-w-md mx-auto py-12">
            <Link href="/troupes" className="flex items-center text-sm text-muted-foreground mb-6 hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux troupes
            </Link>

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Créer une nouvelle troupe</h1>
                    <p className="text-muted-foreground text-sm">
                        Donnez un nom à votre troupe pour commencer. Vous pourrez inviter d'autres membres ensuite.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom de la troupe</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Les Masques de Venise"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Création...
                            </>
                        ) : (
                            "Créer la troupe"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
