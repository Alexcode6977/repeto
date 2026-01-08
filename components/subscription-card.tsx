"use client";

import { useState } from "react";
import { CreditCard, Crown, Loader2, ExternalLink, Calendar, AlertTriangle, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/stripe";
import { SubscriptionTier } from "@/lib/subscription";
import Link from "next/link";

interface SubscriptionCardProps {
    tier: SubscriptionTier;
    status: string;
    endDate?: string | null;
    cancelAtPeriodEnd?: boolean;
    isInTroupe?: boolean;
    troupeName?: string;
    hasStripeCustomer?: boolean;
}

export function SubscriptionCard({
    tier,
    status,
    endDate,
    cancelAtPeriodEnd = false,
    isInTroupe,
    troupeName,
    hasStripeCustomer = false,
}: SubscriptionCardProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTroupeInfo, setShowTroupeInfo] = useState(false);
    const plan = PLANS[tier];

    const isActive = status === 'active' || status === 'trialing';
    const isPastDue = status === 'past_due';
    const isCanceledButActive = isActive && cancelAtPeriodEnd;

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
        <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
            <div className="flex items-start justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center
                        ${tier === 'free' ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary'}
                    `}>
                        <Crown className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base md:text-lg">{plan.name}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">{plan.priceLabel}</p>
                    </div>
                </div>

                {/* Status Badges */}
                {isActive && tier !== 'free' && !cancelAtPeriodEnd && (
                    <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                        Actif
                    </span>
                )}
                {isCanceledButActive && (
                    <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Annulé
                    </span>
                )}
                {isPastDue && (
                    <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500 flex items-center gap-1">
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
                        {status === 'canceled' || cancelAtPeriodEnd
                            ? `Vous aurez accès jusqu'au ${new Date(endDate).toLocaleDateString('fr-FR')}`
                            : `Prochain renouvellement le ${new Date(endDate).toLocaleDateString('fr-FR')}`
                        }
                    </span>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 mb-4">
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
                    <div className="space-y-3">
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

                        {/* Troupe Info Section */}
                        <div className="border-t border-border pt-3">
                            <button
                                onClick={() => setShowTroupeInfo(!showTroupeInfo)}
                                className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Vous jouez dans une troupe ?
                                </span>
                                {showTroupeInfo ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </button>

                            {showTroupeInfo && (
                                <div className="mt-3 p-3 md:p-4 rounded-xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                                            <Users className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-semibold text-foreground text-sm">Mode Troupe</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Créez ou rejoignez une troupe pour répéter ensemble. Le créateur paie un abonnement unique de 20€/mois et tous les membres bénéficient des fonctionnalités Pro.
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-muted-foreground space-y-1 ml-9">
                                        <li>• Calendrier de répétitions partagé</li>
                                        <li>• Gestion des distributions et rôles</li>
                                        <li>• Accès Pro pour tous les membres</li>
                                    </ul>
                                    <Link href="/troupes" className="block">
                                        <Button variant="outline" size="sm" className="w-full gap-2 mt-1">
                                            <Users className="w-4 h-4" />
                                            Voir les troupes
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tier === 'solo_pro' && isActive && (
                    <p className="text-xs text-center text-muted-foreground">
                        Pour créer ou rejoindre une troupe, rendez-vous dans la section Troupes.
                    </p>
                )}
            </div>
        </div>
    );
}
