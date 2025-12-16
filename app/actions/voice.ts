"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Check if user has premium access via database
 * Premium is managed manually in the database by admin
 */
export async function getVoiceStatus() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { isPremium: false, credits: 0, isAnonymous: true };

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_premium, ai_credits")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        return { isPremium: false, credits: 0, isAnonymous: false };
    }

    return {
        isPremium: profile.is_premium,
        credits: profile.ai_credits,
        isAnonymous: false
    };
}
