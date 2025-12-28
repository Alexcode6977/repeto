"use client";

import { useState } from "react";
import { CreditCard, Crown, Loader2, ExternalLink, Calendar, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/stripe";
import { SubscriptionTier } from "@/lib/subscription";

interface SubscriptionCardProps {
    tier: SubscriptionTier;
    status: string;
    endDate?: string | null;
    isInTroupe?: boolean;
    troupeName?: string;
    hasStripeCustomer?: boolean;
}

export function SubscriptionCard({
    tier,
    status,
    endDate,
    isInTroupe,
    troupeName,
    hasStripeCustomer = false,
}: SubscriptionCardProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const plan = PLANS[tier];

    const isActive = status === 'active' || status === 'trialing';
    const isPastDue = status === 'past_due';

    const handleManageSubscription = async () => {
        if (!hasStripeCustomer) {
            setError("Votre compte n'est pas lié à Stripe. Contactez le support.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setError(data.error || "Impossible d'ouvrir le portail.");
            }
        } catch (err) {
            console.error('Error opening portal:', err);
            setError("Erreur de connexion.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (targetTier: 'solo_pro' | 'troupe') => {
        setLoading(true);
        setError(null);
        try {
            // Fetch price IDs from server (env vars not accessible on client)
            const pricesRes = await fetch('/api/stripe/prices');
            const prices = await pricesRes.json();

            const priceId = prices[targetTier];
            if (!priceId) {
                setError("Configuration prix manquante. Vérifiez les variables d'environnement Stripe.");
                setLoading(false);
                return;
            }

            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setError(data.error || "Erreur lors du checkout.");
            }
        } catch (err) {
            console.error('Error creating checkout:', err);
            setError("Erreur de connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        ${tier === 'free' ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary'}
                    `}>
                        <Crown className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.priceLabel}</p>
                    </div>
                </div>

                {isActive && tier !== 'free' && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                        Actif
                    </span>
                )}
                {isPastDue && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Paiement en attente
                    </span>
                )}
            </div>

            {/* Troupe context info */}
            {isInTroupe && tier === 'troupe' && troupeName && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10 text-sm">
                    <p className="text-muted-foreground">
                        Accès via la troupe <span className="font-medium text-foreground">{troupeName}</span>
                    </p>
                </div>
            )}

            {/* Subscription end date */}
            {endDate && tier !== 'free' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>
                        {status === 'canceled'
                            ? `Accès jusqu'au ${new Date(endDate).toLocaleDateString('fr-FR')}`
                            : `Prochain renouvellement le ${new Date(endDate).toLocaleDateString('fr-FR')}`
                        }
                    </span>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
                {tier !== 'free' && isActive && (
                    <>
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={handleManageSubscription}
                            disabled={loading || !hasStripeCustomer}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CreditCard className="w-4 h-4" />
                            )}
                            Gérer mon abonnement
                            <ExternalLink className="w-3 h-3 ml-auto" />
                        </Button>
                        {!hasStripeCustomer && (
                            <p className="text-xs text-center text-amber-500">
                                ⚠️ Compte non lié à Stripe. Contactez le support pour gérer votre abonnement.
                            </p>
                        )}
                    </>
                )}

                {tier === 'free' && (
                    <div className="space-y-2">
                        <Button
                            className="w-full"
                            onClick={() => handleUpgrade('solo_pro')}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>Passer à Solo Pro - {PLANS.solo_pro.priceLabel}</>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleUpgrade('troupe')}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>Passer à Troupe - {PLANS.troupe.priceLabel}</>
                            )}
                        </Button>
                    </div>
                )}

                {tier === 'solo_pro' && isActive && (
                    <p className="text-xs text-center text-muted-foreground">
                        Pour passer à Troupe, utilisez le portail de gestion ci-dessus.
                    </p>
                )}
            </div>
        </div>
    );
}
