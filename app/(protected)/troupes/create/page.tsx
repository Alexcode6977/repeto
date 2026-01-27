'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowLeft, Loader2, Users, CreditCard, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/stripe";
import { cn } from "@/lib/utils";

type TroupePlan = 'troupe' | 'troupe_xl';
type BillingCycle = 'monthly' | 'yearly';

export default function CreateTroupePage() {
    const [selectedPlan, setSelectedPlan] = useState<TroupePlan>('troupe');
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Calculate prices
    const troupeMonthly = 20;
    const troupeYearly = 200;
    const troupeXlMonthly = 30;
    const troupeXlYearly = 300;

    const getPrice = () => {
        if (selectedPlan === 'troupe') {
            return billingCycle === 'monthly' ? troupeMonthly : troupeYearly;
        }
        return billingCycle === 'monthly' ? troupeXlMonthly : troupeXlYearly;
    };

    const getPriceLabel = () => {
        const price = getPrice();
        return billingCycle === 'monthly' ? `${price}€/mois` : `${price}€/an`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            // Fetch price IDs from server
            const pricesRes = await fetch('/api/stripe/prices');
            const prices = await pricesRes.json();

            // Get the correct price ID based on selection
            let priceId: string | null = null;
            if (selectedPlan === 'troupe') {
                priceId = billingCycle === 'monthly' ? prices.troupe_monthly : prices.troupe_yearly;
            } else {
                priceId = billingCycle === 'monthly' ? prices.troupe_xl_monthly : prices.troupe_xl_yearly;
            }

            // Fallback to legacy if yearly not configured
            if (!priceId && billingCycle === 'monthly') {
                priceId = selectedPlan === 'troupe' ? prices.troupe : prices.troupe_xl_monthly;
            }

            if (!priceId) {
                setError("Configuration prix manquante. Contactez le support.");
                setIsLoading(false);
                return;
            }

            // Redirect to Stripe checkout with troupe name in metadata
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    troupeName: name.trim(),
                    troupeTier: selectedPlan,
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

    const troupePlan = PLANS.troupe;
    const troupeXlPlan = PLANS.troupe_xl;

    return (
        <div className="container max-w-3xl mx-auto py-12 px-4">
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

                {/* Step 1: Choose Plan */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                        Choisissez votre formule
                    </h2>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Troupe Card */}
                        <div
                            onClick={() => setSelectedPlan('troupe')}
                            className={cn(
                                "p-5 rounded-2xl border-2 cursor-pointer transition-all",
                                selectedPlan === 'troupe'
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{troupePlan.name}</h3>
                                        <p className="text-xs text-muted-foreground">Jusqu'à 12 membres</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                    selectedPlan === 'troupe' ? "border-primary bg-primary" : "border-muted-foreground"
                                )}>
                                    {selectedPlan === 'troupe' && <Check className="w-3 h-3 text-primary-foreground" />}
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-primary">
                                {billingCycle === 'monthly' ? '20€' : '200€'}
                                <span className="text-sm font-normal text-muted-foreground">/{billingCycle === 'monthly' ? 'mois' : 'an'}</span>
                            </p>
                        </div>

                        {/* Troupe XL Card */}
                        <div
                            onClick={() => setSelectedPlan('troupe_xl')}
                            className={cn(
                                "p-5 rounded-2xl border-2 cursor-pointer transition-all relative",
                                selectedPlan === 'troupe_xl'
                                    ? "border-violet-500 bg-violet-500/5"
                                    : "border-border hover:border-violet-500/50"
                            )}
                        >
                            <div className="absolute -top-3 right-4">
                                <span className="bg-violet-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                                    Grandes Troupes
                                </span>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-violet-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{troupeXlPlan.name}</h3>
                                        <p className="text-xs text-muted-foreground">Membres illimités</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                    selectedPlan === 'troupe_xl' ? "border-violet-500 bg-violet-500" : "border-muted-foreground"
                                )}>
                                    {selectedPlan === 'troupe_xl' && <Check className="w-3 h-3 text-white" />}
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-violet-500">
                                {billingCycle === 'monthly' ? '30€' : '300€'}
                                <span className="text-sm font-normal text-muted-foreground">/{billingCycle === 'monthly' ? 'mois' : 'an'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step 2: Billing Cycle */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                        Fréquence de paiement
                    </h2>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={cn(
                                "flex-1 p-4 rounded-xl border-2 transition-all text-center",
                                billingCycle === 'monthly'
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <p className="font-bold">Mensuel</p>
                            <p className="text-sm text-muted-foreground">
                                {selectedPlan === 'troupe' ? '20€/mois' : '30€/mois'}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setBillingCycle('yearly')}
                            className={cn(
                                "flex-1 p-4 rounded-xl border-2 transition-all text-center relative",
                                billingCycle === 'yearly'
                                    ? "border-emerald-500 bg-emerald-500/5"
                                    : "border-border hover:border-emerald-500/50"
                            )}
                        >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                                <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    2 mois offerts
                                </span>
                            </div>
                            <p className="font-bold">Annuel</p>
                            <p className="text-sm text-muted-foreground">
                                {selectedPlan === 'troupe' ? '200€/an' : '300€/an'}
                            </p>
                        </button>
                    </div>
                </div>

                {/* Step 3: Name and Submit */}
                <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                        Nommez votre troupe
                    </h2>

                    {/* Features recap */}
                    <ul className="space-y-2 mb-4">
                        {(selectedPlan === 'troupe' ? troupePlan : troupeXlPlan).features.map((feature, idx) => (
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

                        <Button
                            type="submit"
                            className={cn(
                                "w-full gap-2",
                                selectedPlan === 'troupe_xl' && "bg-violet-500 hover:bg-violet-600"
                            )}
                            disabled={isLoading || !name.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Redirection...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-4 w-4" />
                                    Payer {getPriceLabel()} et créer la troupe
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
