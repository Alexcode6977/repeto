"use server";

import { createClient } from "@/lib/supabase/server";
import { hasAiVoiceAccess } from "@/lib/subscription";

/**
 * Check if user has premium voice access via subscription tier
 * Considers both personal subscription and troupe membership
 */
export async function getVoiceStatus(troupeId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { isPremium: false, isAnonymous: true };

    // Use the new subscription system
    const hasPremiumVoices = await hasAiVoiceAccess(user.id, troupeId);

    return {
        isPremium: hasPremiumVoices,
        isAnonymous: false
    };
}
