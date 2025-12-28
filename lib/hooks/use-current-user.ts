"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { SubscriptionTier, SubscriptionLimits, TIER_LIMITS } from "@/lib/subscription";

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
