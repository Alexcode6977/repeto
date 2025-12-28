import Stripe from 'stripe';

// Lazy initialization to avoid build errors
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            // @ts-expect-error - API version may not match exact type
            apiVersion: '2024-12-18.acacia',
            typescript: true,
        });
    }
    return _stripe;
}

// Backward compatibility alias
export const stripe = {
    get customers() { return getStripe().customers; },
    get subscriptions() { return getStripe().subscriptions; },
    get checkout() { return getStripe().checkout; },
    get billingPortal() { return getStripe().billingPortal; },
    get webhooks() { return getStripe().webhooks; },
};

// Price IDs from Stripe Dashboard - MUST be functions to evaluate at runtime
export function getStripePrices() {
    return {
        SOLO_PRO_MONTHLY: process.env.STRIPE_SOLO_PRO_PRICE_ID!,
        TROUPE_MONTHLY: process.env.STRIPE_TROUPE_PRICE_ID!,
    };
}

// Keep for backward compatibility but now as function alias
export const STRIPE_PRICES = {
    get SOLO_PRO_MONTHLY() { return process.env.STRIPE_SOLO_PRO_PRICE_ID!; },
    get TROUPE_MONTHLY() { return process.env.STRIPE_TROUPE_PRICE_ID!; },
};

// Subscription tier mapping
export type SubscriptionTier = 'free' | 'solo_pro' | 'troupe';

// Helper to get tier from price ID
export function getTierFromPriceId(priceId: string): SubscriptionTier {
    const prices = getStripePrices();
    if (priceId === prices.SOLO_PRO_MONTHLY) return 'solo_pro';
    if (priceId === prices.TROUPE_MONTHLY) return 'troupe';
    return 'free';
}

// Plan details for UI - use getters for stripePriceId to ensure runtime evaluation
export const PLANS = {
    free: {
        name: 'Gratuit',
        price: 0,
        priceLabel: 'Gratuit',
        description: 'Pour découvrir Souffleur',
        features: [
            'Accès à la bibliothèque publique',
            '1 import de script personnel',
            'Voix système (robotique)',
            'Consultation planning troupe',
        ],
        limitations: [
            'Voix IA non disponibles',
            'Enregistrement non disponible',
        ],
        stripePriceId: undefined as string | undefined,
    },
    solo_pro: {
        name: 'Solo Pro',
        price: 4.99,
        priceLabel: '4,99€/mois',
        get stripePriceId() { return process.env.STRIPE_SOLO_PRO_PRICE_ID; },
        description: 'Pour le comédien individuel',
        features: [
            'Imports de scripts illimités',
            'Voix IA interactives',
            'Planification personnelle',
            'Enregistrement pour soi',
            'Support prioritaire',
        ],
        limitations: [],
    },
    troupe: {
        name: 'Troupe',
        price: 20,
        priceLabel: '20€/mois',
        get stripePriceId() { return process.env.STRIPE_TROUPE_PRICE_ID; },
        description: 'Pour le chef de troupe / Association',
        features: [
            'Scripts de troupe illimités',
            '"Master Audio" partagé',
            'Gestion complète (matching présences/scènes)',
            'Centralisation des enregistrements',
            'Membres illimités',
            'Tous les membres ont accès aux fonctionnalités',
        ],
        limitations: [],
    },
};
