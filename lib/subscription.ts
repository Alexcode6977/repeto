import { createClient } from "@/lib/supabase/server";

export type SubscriptionTier = 'free' | 'solo_pro' | 'troupe';

export interface SubscriptionLimits {
    maxPersonalScripts: number;
    hasAiVoices: boolean;
    hasAdvancedPlanning: boolean;
    canRecord: boolean;
    canAccessTroupeFeatures: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
    free: {
        maxPersonalScripts: 1,
        hasAiVoices: false,
        hasAdvancedPlanning: false,
        canRecord: false,
        canAccessTroupeFeatures: false,
    },
    solo_pro: {
        maxPersonalScripts: Infinity,
        hasAiVoices: true,
        hasAdvancedPlanning: true,
        canRecord: true,
        canAccessTroupeFeatures: false,
    },
    troupe: {
        maxPersonalScripts: Infinity,
        hasAiVoices: true,
        hasAdvancedPlanning: true,
        canRecord: true,
        canAccessTroupeFeatures: true,
    },
};

/**
 * Get the subscription tier for a user, considering their personal subscription
 * and any troupe memberships.
 */
export async function getEffectiveTier(
    userId: string,
    troupeId?: string
): Promise<SubscriptionTier> {
    const supabase = await createClient();

    // Get user's own subscription
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', userId)
        .single();

    if (!profile) return 'free';

    // If user has active solo_pro or troupe subscription
    if (profile.subscription_tier !== 'free' && profile.subscription_status === 'active') {
        return profile.subscription_tier as SubscriptionTier;
    }

    // Check if user is in a troupe with active subscription
    // If troupeId is provided, check that specific troupe
    if (troupeId) {
        const { data: troupe } = await supabase
            .from('troupes')
            .select('subscription_status')
            .eq('id', troupeId)
            .single();

        if (troupe?.subscription_status === 'active') {
            return 'troupe';
        }
    } else {
        // Check any troupe the user belongs to
        const { data: memberships } = await supabase
            .from('troupe_members')
            .select('troupe_id, troupes(subscription_status)')
            .eq('user_id', userId);

        if (memberships?.some((m: any) => m.troupes?.subscription_status === 'active')) {
            return 'troupe';
        }
    }

    return 'free';
}

/**
 * Get the limits for a subscription tier
 */
export function getLimits(tier: SubscriptionTier): SubscriptionLimits {
    return TIER_LIMITS[tier];
}

/**
 * Check if a user can use a specific feature
 */
export async function canUseFeature(
    userId: string,
    feature: keyof SubscriptionLimits,
    troupeId?: string
): Promise<boolean> {
    const tier = await getEffectiveTier(userId, troupeId);
    const limits = getLimits(tier);

    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return false;
}

/**
 * Check if user can import more personal scripts
 */
export async function canImportScript(userId: string): Promise<{
    allowed: boolean;
    current: number;
    max: number;
    tier: SubscriptionTier;
}> {
    const supabase = await createClient();

    const tier = await getEffectiveTier(userId);
    const limits = getLimits(tier);

    // Count user's personal scripts
    const { count } = await supabase
        .from('scripts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_public', false);

    const current = count || 0;
    const max = limits.maxPersonalScripts;

    return {
        allowed: current < max,
        current,
        max,
        tier,
    };
}

/**
 * Check if user has AI voice access
 */
export async function hasAiVoiceAccess(userId: string, troupeId?: string): Promise<boolean> {
    const tier = await getEffectiveTier(userId, troupeId);
    return TIER_LIMITS[tier].hasAiVoices;
}
