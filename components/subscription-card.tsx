"use client";

import { useState } from "react";
import { CreditCard, Crown, Loader2, ExternalLink, Calendar, AlertTriangle, ChevronDown, ChevronUp, Users, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
    trialEndDate?: string | null;
    trialStartDate?: string | null; // NEW
}

export function SubscriptionCard({
    tier,
    status,
    endDate,
    cancelAtPeriodEnd = false,
    isInTroupe,
    troupeName,
    hasStripeCustomer = false,
    trialEndDate,
    trialStartDate, // NEW
}: SubscriptionCardProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTroupeInfo, setShowTroupeInfo] = useState(false);
    const plan = PLANS[tier];

    const isActive = status === 'active' || status === 'trialing';
    const isTrialing = status === 'trialing';
    const isPastDue = status === 'past_due';
    const isCanceledButActive = isActive && cancelAtPeriodEnd;

    // Default trial duration in days if not specified by backend
    const TRIAL_DURATION_DAYS = 14;

    // Calculate days remaining in trial
    const getDaysRemaining = () => {
        if (!isTrialing) return null;

        let targetDate: Date | null = null;

        if (trialEndDate) {
            targetDate = new Date(trialEndDate);
        } else if (endDate) {
            targetDate = new Date(endDate);
        } else if (trialStartDate) {
            // Fallback: Calculate from start date + default duration
            const startDate = new Date(trialStartDate);
            targetDate = new Date(startDate.getTime() + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));
        }

        if (!targetDate) return null;

        const now = new Date();
        const diffTime = targetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };

    const daysRemaining = getDaysRemaining();

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

    const handleUpgrade = async (targetTier: 'solo_pro' | 'troupe' | 'solo_pro_yearly') => {
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
                {isTrialing && (
                    <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Essai gratuit
                    </span>
                )}
                {isActive && tier !== 'free' && !cancelAtPeriodEnd && !isTrialing && (
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

            {/* Trial Info Block */}
            {isTrialing && (
                <div className="mb-4 space-y-3">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 shadow-sm">
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-2">
                                <div>
                                    <p className="font-bold text-sm mb-1 text-red-500">Essai gratuit actif</p>
                                    <p className="text-sm font-medium text-red-400">
                                        {daysRemaining !== null
                                            ? (daysRemaining > 0
                                                ? `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
                                                : "Expire aujourd'hui")
                                            : "Durée limitée"
                                        }
                                    </p>
                                </div>
                                {trialStartDate && (
                                    <div className="flex items-center gap-2 text-xs text-red-400/80 pt-2 border-t border-red-500/10">
                                        <Calendar className="w-3 h-3" />
                                        Début : {new Date(trialStartDate).toLocaleDateString('fr-FR')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Activation Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                className="w-full bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-purple-500/20 py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
                            >
                                Activer mon abonnement
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-zinc-950/95 backdrop-blur-xl border-white/10 shadow-2xl p-6 md:p-8 rounded-3xl gap-6">
                            <DialogHeader>
                                <DialogTitle className="text-2xl text-center font-bold bg-clip-text text-transparent bg-linear-to-br from-white to-white/60">
                                    Choisir votre formule
                                </DialogTitle>
                                <DialogDescription className="text-center text-zinc-400 text-base">
                                    Débloquez tout le potentiel de votre voix avec l'offre Premium
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 pt-2">
                                <Button
                                    onClick={() => handleUpgrade('solo_pro')}
                                    disabled={loading}
                                    className="h-auto py-5 px-6 flex flex-col items-start gap-1.5 relative overflow-hidden group bg-zinc-900/50 border border-white/5 hover:bg-zinc-800/80 hover:border-white/20 transition-all rounded-2xl"
                                    variant="ghost"
                                >
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-lg text-zinc-100">Mensuel</span>
                                            <span className="text-xs text-zinc-500 font-medium">Flexible, sans engagement</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-xl text-white">4,99€</span>
                                            <span className="text-sm text-zinc-500"> / mois</span>
                                        </div>
                                    </div>
                                </Button>

                                <Button
                                    onClick={() => handleUpgrade('solo_pro_yearly')}
                                    disabled={loading}
                                    className="h-auto py-5 px-6 flex flex-col items-start gap-1.5 relative overflow-visible bg-linear-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-500/50 hover:border-violet-400 transition-all rounded-2xl group hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                                    variant="ghost"
                                >
                                    <div className="absolute -top-3 right-4 px-3 py-1 bg-linear-to-r from-violet-600 to-purple-600 text-[10px] font-black text-white rounded-full shadow-lg shadow-violet-500/20 tracking-wider">
                                        -20% ÉCONOMIE
                                    </div>
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-lg text-zinc-100 group-hover:text-white transition-colors">Annuel</span>
                                            <span className="text-xs text-violet-300/80 font-medium">Facturé une fois par an</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-zinc-500 line-through decoration-zinc-600">59,88€</span>
                                                <div>
                                                    <span className="font-bold text-xl text-violet-400 group-hover:text-violet-300 transition-colors">49,90€</span>
                                                    <span className="text-sm text-violet-500/80"> / an</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full h-px bg-violet-500/10 mt-3 mb-2" />
                                    <div className="flex w-full items-center justify-between text-xs">
                                        <span className="text-zinc-400">Revient à <span className="text-violet-300 font-bold">4,15€ / mois</span></span>
                                        <span className="flex items-center gap-1.5 text-violet-400 font-medium">
                                            <Sparkles className="w-3 h-3" />
                                            Meilleure offre
                                        </span>
                                    </div>
                                </Button>
                            </div>
                            <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-2">
                                Annulable à tout moment depuis votre profil
                            </p>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* Hidden: manage subscription not shown during trial */}

            {/* Troupe context info */}
            {isInTroupe && tier === 'troupe' && troupeName && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10 text-sm">
                    <p className="text-muted-foreground">
                        Accès via la troupe <span className="font-medium text-foreground">{troupeName}</span>
                    </p>
                </div>
            )}

            {/* Subscription end date */}
            {endDate && tier !== 'free' && !isTrialing && (
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
