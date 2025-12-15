"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const PREMIUM_CODE = "SCEN3-PRMT-X7K9-2024";

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
        // Fallback if profile doesn't exist yet (should trigger on auth, but just in case)
        return { isPremium: false, credits: 0, isAnonymous: false };
    }

    return {
        isPremium: profile.is_premium,
        credits: profile.ai_credits,
        isAnonymous: false
    };
}

export async function unlockPremium(code: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const cleanCode = code.toUpperCase().replace(/\s/g, "");
    const cleanTarget = PREMIUM_CODE.replace(/-/g, "");

    if (cleanCode !== cleanTarget) {
        return { success: false, error: "Code invalide" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("id", user.id);

    if (error) {
        console.error("Unlock Error:", error);
        return { success: false, error: "Database error" };
    }

    revalidatePath("/dashboard");
    return { success: true };
}
