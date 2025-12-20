"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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
