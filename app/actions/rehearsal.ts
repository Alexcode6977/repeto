"use server";

import { createClient } from "@/lib/supabase/server";
import {
    validateRehearsalSettings,
    canRecord as checkCanRecord,
    hasAiVoiceAccess,
    SubscriptionTier
} from "@/lib/subscription";

export interface RehearsalSettings {
    mode: "full" | "cue" | "check";
    visibility: "visible" | "hint" | "hidden";
    ttsProvider: "browser" | "openai";
}

export interface ValidatedRehearsalResult {
    success: boolean;
    settings: RehearsalSettings;
    tier: SubscriptionTier;
    isPremium: boolean;
    canRecord: boolean;
    hasAiVoices: boolean;
    warnings: string[];
    error?: string;
}

/**
 * Validate rehearsal settings server-side before starting a session.
 * This ensures users can't bypass client-side restrictions.
 */
export async function validateAndStartRehearsal(
    settings: RehearsalSettings,
    troupeId?: string
): Promise<ValidatedRehearsalResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return {
                success: false,
                settings: { mode: "full", visibility: "visible", ttsProvider: "browser" },
                tier: "free",
                isPremium: false,
                canRecord: false,
                hasAiVoices: false,
                warnings: [],
                error: "Utilisateur non connecté"
            };
        }

        // Validate and sanitize settings
        const validation = await validateRehearsalSettings(user.id, settings, troupeId);

        // Get additional capabilities
        const canRecord = await checkCanRecord(user.id, troupeId);
        const hasAiVoices = await hasAiVoiceAccess(user.id, troupeId);
        const isPremium = validation.tier !== 'free';

        return {
            success: true,
            settings: validation.sanitizedSettings,
            tier: validation.tier,
            isPremium,
            canRecord,
            hasAiVoices,
            warnings: validation.warnings
        };

    } catch (error: any) {
        console.error("[validateAndStartRehearsal] Error:", error);
        return {
            success: false,
            settings: { mode: "full", visibility: "visible", ttsProvider: "browser" },
            tier: "free",
            isPremium: false,
            canRecord: false,
            hasAiVoices: false,
            warnings: [],
            error: "Erreur lors de la validation des paramètres"
        };
    }
}

/**
 * Check if user can access a specific premium feature.
 * Returns detailed info about access and tier.
 */
export async function checkFeatureAccess(
    feature: "ai_voices" | "advanced_modes" | "recording" | "troupe_features",
    troupeId?: string
): Promise<{
    allowed: boolean;
    tier: SubscriptionTier;
    message?: string;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { allowed: false, tier: "free", message: "Connexion requise" };
        }

        const { getEffectiveTier, TIER_LIMITS } = await import("@/lib/subscription");
        const tier = await getEffectiveTier(user.id, troupeId);
        const limits = TIER_LIMITS[tier];

        switch (feature) {
            case "ai_voices":
                return {
                    allowed: limits.hasAiVoices,
                    tier,
                    message: limits.hasAiVoices ? undefined : "Les voix IA nécessitent un abonnement premium"
                };
            case "advanced_modes":
                return {
                    allowed: tier !== 'free',
                    tier,
                    message: tier !== 'free' ? undefined : "Les modes avancés nécessitent un abonnement premium"
                };
            case "recording":
                return {
                    allowed: limits.canRecord,
                    tier,
                    message: limits.canRecord ? undefined : "L'enregistrement nécessite un abonnement premium"
                };
            case "troupe_features":
                return {
                    allowed: limits.canAccessTroupeFeatures,
                    tier,
                    message: limits.canAccessTroupeFeatures ? undefined : "Cette fonctionnalité est réservée aux troupes"
                };
            default:
                return { allowed: false, tier, message: "Fonctionnalité inconnue" };
        }

    } catch (error) {
        console.error("[checkFeatureAccess] Error:", error);
        return { allowed: false, tier: "free", message: "Erreur de vérification" };
    }
}

/**
 * Get user's current subscription status with all feature flags.
 * Useful for initializing UI state.
 */
export async function getUserCapabilities(troupeId?: string): Promise<{
    tier: SubscriptionTier;
    isPremium: boolean;
    features: {
        aiVoices: boolean;
        advancedModes: boolean;
        advancedVisibility: boolean;
        recording: boolean;
        troupeFeatures: boolean;
        unlimitedScripts: boolean;
    };
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return {
                tier: "free",
                isPremium: false,
                features: {
                    aiVoices: false,
                    advancedModes: false,
                    advancedVisibility: false,
                    recording: false,
                    troupeFeatures: false,
                    unlimitedScripts: false,
                }
            };
        }

        const { getEffectiveTier, TIER_LIMITS } = await import("@/lib/subscription");
        const tier = await getEffectiveTier(user.id, troupeId);
        const limits = TIER_LIMITS[tier];

        return {
            tier,
            isPremium: tier !== 'free',
            features: {
                aiVoices: limits.hasAiVoices,
                advancedModes: tier !== 'free', // cue, check modes
                advancedVisibility: tier !== 'free', // hint, hidden
                recording: limits.canRecord,
                troupeFeatures: limits.canAccessTroupeFeatures,
                unlimitedScripts: limits.maxPersonalScripts === Infinity,
            }
        };

    } catch (error) {
        console.error("[getUserCapabilities] Error:", error);
        return {
            tier: "free",
            isPremium: false,
            features: {
                aiVoices: false,
                advancedModes: false,
                advancedVisibility: false,
                recording: false,
                troupeFeatures: false,
                unlimitedScripts: false,
            }
        };
    }
}
