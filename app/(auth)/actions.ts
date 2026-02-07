"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrlFromHost } from "@/lib/server/url";

export async function signInWithGoogle() {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = getBaseUrlFromHost(
        headersList.get("x-forwarded-host") || headersList.get("host")
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${origin}/auth/callback`,
            queryParams: {
                access_type: "offline",
                prompt: "consent",
            },
        },
    });

    if (error) {
        console.error("[Google OAuth] signInWithOAuth error:", error);
        redirect("/login?error=" + encodeURIComponent(error.message));
    }

    if (data.url) {
        redirect(data.url);
    }
}


export async function login(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        redirect("/login?error=" + encodeURIComponent(error.message));
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function signup(formData: FormData) {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = getBaseUrlFromHost(
        headersList.get("x-forwarded-host") || headersList.get("host")
    );

    const firstName = formData.get("firstName") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
        redirect("/signup?error=" + encodeURIComponent("Les mots de passe ne correspondent pas."));
    }

    const data = {
        email: formData.get("email") as string,
        password: password,
    };

    const { data: signUpData, error } = await supabase.auth.signUp({
        ...data,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
                first_name: firstName, // Store in user metadata as well
            },
        },
    });

    if (error) {
        redirect("/signup?error=" + encodeURIComponent(error.message));
    }

    // Update profile with first name AND activate 14-day Solo Pro trial
    if (signUpData.user) {
        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days trial

        await supabase
            .from("profiles")
            .update({
                first_name: firstName,
                subscription_tier: 'solo_pro',
                subscription_status: 'trialing',
                trial_started_at: now.toISOString(),
                trial_end_date: trialEndDate.toISOString()
            })
            .eq("id", signUpData.user.id);
    }

    revalidatePath("/", "layout");
    redirect("/auth/check-email");
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = getBaseUrlFromHost(
        headersList.get("x-forwarded-host") || headersList.get("host")
    );

    const email = formData.get("email") as string;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
        redirect("/forgot-password?error=" + encodeURIComponent(error.message));
    }

    redirect("/forgot-password?message=" + encodeURIComponent("L'email de réinitialisation a été envoyé."));
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient();
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.updateUser({
        password: password,
    });

    if (error) {
        redirect("/reset-password?error=" + encodeURIComponent(error.message));
    }

    redirect("/login?message=" + encodeURIComponent("Votre mot de passe a été mis à jour avec succès."));
}
