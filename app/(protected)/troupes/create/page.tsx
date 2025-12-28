'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowLeft, Loader2, Users, CreditCard, Check } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/stripe";

export default function CreateTroupePage() {
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            // Fetch price ID from server (env vars not accessible on client)
            const pricesRes = await fetch('/api/stripe/prices');
            const prices = await pricesRes.json();

            if (!prices.troupe) {
                setError("Configuration prix manquante. Vérifiez les variables d'environnement Stripe.");
                setIsLoading(false);
                return;
            }

            // Redirect to Stripe checkout with troupe name in metadata
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: prices.troupe,
                    troupeName: name.trim(),
                }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setError(data.error || "Erreur lors de la création du paiement.");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur lors de la création du paiement.");
        } finally {
            setIsLoading(false);
        }
    };

    const plan = PLANS.troupe;

    return (
        <div className="container max-w-2xl mx-auto py-12">
            <Link href="/troupes" className="flex items-center text-sm text-muted-foreground mb-6 hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux troupes
            </Link>

            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold">Créer une nouvelle troupe</h1>
                    <p className="text-muted-foreground mt-2">
                        Gérez votre troupe de théâtre avec un espace collaboratif complet.
                    </p>
                </div>

                {/* Pricing Card */}
                <div className="p-6 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{plan.name}</h2>
                            <p className="text-2xl font-bold text-primary">{plan.priceLabel}</p>
                        </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4 text-green-500" />
                                {feature}
                            </li>
                        ))}
                    </ul>

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

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full gap-2" disabled={isLoading || !name.trim()}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Redirection...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-4 w-4" />
                                    Payer et créer la troupe
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            Paiement sécurisé par Stripe. Annulable à tout moment.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
