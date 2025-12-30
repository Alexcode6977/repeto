"use client";

import { useState } from "react";
import { CreditCard, Crown, Loader2, ExternalLink, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PLANS } from "@/lib/stripe";
import { STRIPE_PRICES } from '@/lib/stripe'; // Might need to check if this is importable client-side or use API

interface TroupeSubscriptionManagerProps {
    troupeId: string;
    troupeName: string;
    subscription: {
        currentCount: number;
        memberLimit: number;
        plan: string;
        hasStripeCustomerId: boolean;
        status?: string;
    };
}

export function TroupeSubscriptionManager({
    troupeId,
    troupeName,
    subscription
}: TroupeSubscriptionManagerProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSubscribed = subscription.plan !== 'Free';

    // Assuming 'Troupe' plan maps to 'troupe' tier key
    const currentPriceLabel = isSubscribed ? PLANS.troupe.priceLabel : 'Gratuit';

    const handleAction = async (action: 'upgrade' | 'portal') => {
        setLoading(true);
        setError(null);

        try {
            let url: string | undefined;

            if (action === 'upgrade') {
                // Fetch prices first locally or just assume logical flow
                // We need to call the checkout API with Troupe Price ID
                // Since STRIPE_PRICES are env vars on server, we should fetch them or simpler:
                // The checkout endpoint validates. We can hardcode 'troupe' tier request? 
                // No, checkout route expects 'priceId'.
                // We can fetch priceId from /api/stripe/prices or just pass 'troupe' and let backend handle it?
                // Checking /api/stripe/checkout route: it expects 'priceId'.
                // Checking /api/stripe/prices route: returns { troupe: '...' }

                const pricesRes = await fetch('/api/stripe/prices');
                const prices = await pricesRes.json();
                const priceId = prices.troupe;

                if (!priceId) throw new Error("Prix Troupe non configuré.");

                const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        priceId,
                        troupeId,
                        troupeName // Pass name for metadata if needed
                    }),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                url = data.url;

            } else {
                // Portal
                const res = await fetch('/api/stripe/portal', { method: 'POST' });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                url = data.url;
            }

            if (url) {
                window.location.href = url;
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue.");
            setLoading(false); // Only set false if no redirect
        }
    };

    return (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Crown className="w-48 h-48 rotate-12 -translate-y-10 translate-x-10" />
            </div>
            <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Abonnement & Facturation
                </CardTitle>
                <CardDescription>Gérez le plan de votre troupe</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-end">
                <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                            {subscription.plan}
                        </span>
                        {isSubscribed && <span className="text-sm font-medium text-muted-foreground">({currentPriceLabel})</span>}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Membres utilisés</span>
                            <span>{subscription.currentCount} / {subscription.memberLimit}</span>
                        </div>
                        <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-1000"
                                style={{ width: `${Math.min(100, (subscription.currentCount / subscription.memberLimit) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {!isSubscribed ? (
                        <Button
                            className="w-full"
                            variant="default"
                            onClick={() => handleAction('upgrade')}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                            Passer à l'offre Troupe
                        </Button>
                    ) : (
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => handleAction('portal')}
                            disabled={loading || !subscription.hasStripeCustomer}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                            Gérer la facturation
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-2 md:items-end justify-end h-full">
                    {/* Additional info or secondary actions if needed */}
                    {error && (
                        <p className="text-xs text-red-400 max-w-[200px] text-right">
                            {error}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
