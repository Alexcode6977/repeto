"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { SubscriptionTier, SubscriptionLimits, TIER_LIMITS } from "@/lib/subscription";
import { syncSubscriptionFromStripe } from "@/lib/actions/sync-subscription";

// Simple in-memory cache to avoid syncing too often
const SYNC_CACHE_KEY = 'stripe_sync_timestamp';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Trigger a background Stripe sync if enough time has passed since last sync.
 */
function triggerStripeSync(userId: string) {
    const lastSync = parseInt(sessionStorage.getItem(SYNC_CACHE_KEY) || '0', 10);
    const now = Date.now();

    if (now - lastSync > SYNC_INTERVAL_MS) {
        sessionStorage.setItem(SYNC_CACHE_KEY, String(now));
        // Fire and forget - don't await
        syncSubscriptionFromStripe(userId).then((result) => {
            if (!result.success) {
                console.warn('[Stripe Sync] Background sync failed:', result.error);
            }
        }).catch((err) => {
            console.error('[Stripe Sync] Error:', err);
        });
    }
}

interface UserProfile {
    first_name?: string | null;
    is_premium?: boolean; // Legacy field, kept for backwards compatibility
    subscription_tier?: SubscriptionTier;
    subscription_status?: string;
    subscription_end_date?: string;
    stripe_customer_id?: string;
}

interface UseCurrentUserReturn {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    /** @deprecated Use subscriptionTier instead */
    isPremium: boolean;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: string;
    limits: SubscriptionLimits;
    displayName: string;
    /** Check if user has access to AI voices (considering troupe membership) */
    hasAiVoices: boolean;
    /** Check if user can import more scripts */
    canImportScripts: boolean;
}

/**
 * Hook to get the current authenticated user and their profile.
 * Includes subscription tier and feature limits.
 */
export function useCurrentUser(): UseCurrentUserReturn {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [effectiveTier, setEffectiveTier] = useState<SubscriptionTier>('free');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setUser(user);

                    // Fetch profile with new subscription fields
                    const { data: profileData } = await supabase
                        .from("profiles")
                        .select("first_name, is_premium, subscription_tier, subscription_status, subscription_end_date, stripe_customer_id")
                        .eq("id", user.id)
                        .single();

                    if (profileData) {
                        setProfile(profileData);

                        // Check effective tier (including troupe membership)
                        let tier: SubscriptionTier = profileData.subscription_tier || 'free';

                        // If user is free, check if they're in a troupe with active subscription
                        if (tier === 'free' || profileData.subscription_status !== 'active') {
                            const { data: memberships } = await supabase
                                .from('troupe_members')
                                .select('troupe_id, troupes(subscription_status)')
                                .eq('user_id', user.id);

                            if (memberships?.some((m: any) => m.troupes?.subscription_status === 'active')) {
                                tier = 'troupe';
                            }
                        }

                        setEffectiveTier(tier);

                        // Trigger background Stripe sync if user has a customer ID
                        if (profileData.stripe_customer_id) {
                            triggerStripeSync(user.id);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const subscriptionTier = effectiveTier;
    const subscriptionStatus = profile?.subscription_status || 'inactive';
    const limits = TIER_LIMITS[subscriptionTier];

    // Legacy support
    const isPremium = subscriptionTier !== 'free';

    const displayName = profile?.first_name || user?.email?.split('@')[0] || "Utilisateur";

    return {
        user,
        profile,
        loading,
        isPremium, // Legacy
        subscriptionTier,
        subscriptionStatus,
        limits,
        displayName,
        hasAiVoices: limits.hasAiVoices,
        canImportScripts: limits.maxPersonalScripts > 0,
    };
}
