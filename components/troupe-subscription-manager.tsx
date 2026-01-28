"use client";

import { useState } from "react";
import { CreditCard, Crown, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface TroupeSubscriptionManagerProps {
    troupeId: string;
    troupeName: string;
    subscription: {
        currentCount: number;
        memberLimit: number;
        plan: string;
        tier?: string;
        hasStripeCustomerId: boolean;
        status?: string;
        trialEndDate?: string | null;
        trialStartedAt?: string | null;
    };
}

export function TroupeSubscriptionManager({
    troupeId,
    troupeName,
    subscription
}: TroupeSubscriptionManagerProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tier = subscription.tier || 'troupe';
    const isSubscribed = subscription.plan !== 'Free';
    const isTroupeXL = tier === 'troupe_xl';
    const isTrialing = subscription.status === 'trialing';

    // Calculate days remaining in trial
    const getDaysRemaining = () => {
        if (!isTrialing || !subscription.trialEndDate) return null;
        const now = new Date();
        const endDate = new Date(subscription.trialEndDate);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };
    const daysRemaining = getDaysRemaining();

    const priceLabels: Record<string, string> = {
        'troupe': '20€/mois',
        'troupe_xl': '30€/mois',
    };
    const currentPriceLabel = isSubscribed ? (priceLabels[tier] || '20€/mois') : 'Gratuit';

    const handleUpgrade = async (targetTier: 'troupe' | 'troupe_xl', billingCycle: 'monthly' | 'yearly' = 'monthly') => {
        setLoading(true);
        setError(null);

        try {
            const pricesRes = await fetch('/api/stripe/prices');
            const prices = await pricesRes.json();

            // Determine the correct price key based on tier and billing cycle
            let priceKey: string;
            if (targetTier === 'troupe_xl') {
                priceKey = billingCycle === 'yearly' ? 'troupe_xl_yearly' : 'troupe_xl_monthly';
            } else {
                priceKey = billingCycle === 'yearly' ? 'troupe_yearly' : 'troupe_monthly';
            }

            const priceId = prices[priceKey];

            if (!priceId) throw new Error("Prix non configuré.");

            // Don't pass troupeName - this is an upgrade, not creation
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    troupeId, // Pass existing troupe ID for upgrade
                    troupeTier: targetTier
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue.");
            setLoading(false);
        }
    };

    const handlePortal = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue.");
            setLoading(false);
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
            <CardContent className="relative z-10 space-y-6">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                        {subscription.plan}
                    </span>
                    {isSubscribed && <span className="text-sm font-medium text-muted-foreground">({currentPriceLabel})</span>}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Membres utilisés</span>
                        <span>{subscription.currentCount} / {subscription.memberLimit === 999 ? '∞' : subscription.memberLimit}</span>
                    </div>
                    <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{ width: `${Math.min(100, (subscription.currentCount / subscription.memberLimit) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* Trial Status */}
                {isTrialing && daysRemaining !== null && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-2">
                                <div>
                                    <p className="font-semibold text-sm mb-1">Essai gratuit actif</p>
                                    <p className="text-xs text-muted-foreground">
                                        Commencé le {subscription.trialStartedAt ? new Date(subscription.trialStartedAt).toLocaleDateString('fr-FR') : 'N/A'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {daysRemaining > 0
                                            ? `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
                                            : "Expire aujourd'hui"
                                        }
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ⚡ Activez votre abonnement pour continuer après l'essai
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-3">
                    {/* Show upgrade to Troupe if on trial or free */}
                    {(isTrialing || !isSubscribed) && (
                        <>
                            <Button
                                onClick={() => handleUpgrade('troupe', 'monthly')}
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                                Mensuel - Troupe (20€/mois)
                            </Button>
                            <Button
                                onClick={() => handleUpgrade('troupe', 'yearly')}
                                disabled={loading}
                                variant="outline"
                                className="flex-1"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                                Annuel - Troupe (200€/an)
                            </Button>
                        </>
                    )}

                    {/* Show upgrade to XL if on Troupe */}
                    {isSubscribed && !isTroupeXL && (
                        <>
                            <Button
                                onClick={() => handleUpgrade('troupe_xl', 'monthly')}
                                disabled={loading}
                                className="bg-violet-600 hover:bg-violet-700 flex-1"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Mensuel - Troupe XL (30€/mois)
                            </Button>
                            <Button
                                onClick={() => handleUpgrade('troupe_xl', 'yearly')}
                                disabled={loading}
                                variant="outline"
                                className="flex-1"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Annuel - Troupe XL (300€/an)
                            </Button>
                        </>
                    )}

                    {/* Show portal if subscribed */}
                    {isSubscribed && (
                        <Button
                            variant="outline"
                            onClick={handlePortal}
                            disabled={loading || !subscription.hasStripeCustomerId}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                            Gérer la facturation
                        </Button>
                    )}
                </div>

                {error && (
                    <p className="text-xs text-red-400">
                        {error}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
