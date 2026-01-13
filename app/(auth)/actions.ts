"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || headersList.get("x-forwarded-host")
        ? `https://${headersList.get("x-forwarded-host")}`
        : headersList.get("host")
            ? `https://${headersList.get("host")}`
            : "http://localhost:3000";

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
    const origin = headersList.get("origin") || headersList.get("x-forwarded-host")
        ? `https://${headersList.get("x-forwarded-host")}`
        : headersList.get("host")
            ? `https://${headersList.get("host")}`
            : "http://localhost:3000";

    const firstName = formData.get("firstName") as string;
    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
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

    // Update profile with first name (profile is auto-created by trigger)
    if (signUpData.user) {
        await supabase
            .from("profiles")
            .update({ first_name: firstName })
            .eq("id", signUpData.user.id);
    }

    revalidatePath("/", "layout");
    redirect("/auth/check-email");
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || headersList.get("x-forwarded-host")
        ? `https://${headersList.get("x-forwarded-host")}`
        : headersList.get("host")
            ? `https://${headersList.get("host")}`
            : "http://localhost:3000";

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
