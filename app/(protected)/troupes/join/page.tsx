'use client';

import { joinTroupe } from "@/lib/actions/troupe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function JoinTroupePage() {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        try {
            const troupeId = await joinTroupe(code);
            router.push(`/troupes/${troupeId}`);
        } catch (error) {
            console.error(error);
            alert("Code invalide ou impossible de rejoindre la troupe.");
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
                    <h1 className="text-2xl font-bold">Rejoindre une troupe</h1>
                    <p className="text-muted-foreground text-sm">
                        Entrez le code d'invitation que vous avez reçu (ex: TROUPE-XXXX).
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Code d'invitation</Label>
                        <Input
                            id="code"
                            placeholder="Entrez le code ici..."
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading || !code.trim()}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connexion...
                            </>
                        ) : (
                            "Rejoindre"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
