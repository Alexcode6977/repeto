import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const EMAIL_OTP_TYPES: EmailOtpType[] = [
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
    if (!value) {
        return false;
    }

    return EMAIL_OTP_TYPES.includes(value as EmailOtpType);
}

function safeNextPath(next: string | null, fallback: string): string {
    if (!next || !next.startsWith("/")) {
        return fallback;
    }

    return next;
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const requestedNext = searchParams.get("next");
    const isRecoveryFlow = type === "recovery" || requestedNext === "/reset-password";

    // Password recovery must be completed in the browser client that initiated it,
    // because the PKCE verifier lives in browser storage.
    if (isRecoveryFlow) {
        const resetUrl = new URL("/reset-password", origin);
        const passthroughKeys = [
            "code",
            "token_hash",
            "type",
            "error",
            "error_code",
            "error_description",
        ] as const;

        passthroughKeys.forEach((key) => {
            const value = searchParams.get(key);
            if (value) {
                resetUrl.searchParams.set(key, value);
            }
        });

        return NextResponse.redirect(resetUrl.toString());
    }

    const next = safeNextPath(requestedNext, "/dashboard");
    const errorRedirectPath = "/login";

    // Handle errors returned from the provider/supabase directly
    const providerErrorCode = searchParams.get("error") ?? searchParams.get("error_code");
    if (providerErrorCode) {
        const errorDescription = searchParams.get("error_description") || "No description provided";
        console.error(`[OAuth Callback] Error from provider: ${providerErrorCode} - ${errorDescription}`);
        return NextResponse.redirect(
            `${origin}${errorRedirectPath}?error=${encodeURIComponent(errorDescription)}`
        );
    }

    const supabase = await createClient();

    if (tokenHash) {
        if (!isEmailOtpType(type)) {
            return NextResponse.redirect(
                `${origin}${errorRedirectPath}?error=${encodeURIComponent("Lien de réinitialisation invalide.")}`
            );
        }

        const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
        });

        if (error) {
            console.error("[OAuth Callback] verifyOtp error:", error);
            return NextResponse.redirect(
                `${origin}${errorRedirectPath}?error=${encodeURIComponent(error.message)}`
            );
        }
    } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error("[OAuth Callback] exchangeCodeForSession error:", error);
            return NextResponse.redirect(
                `${origin}${errorRedirectPath}?error=${encodeURIComponent(error.message)}`
            );
        }
    } else {
        return NextResponse.redirect(
            `${origin}${errorRedirectPath}?error=${encodeURIComponent("Lien d'authentification invalide ou expiré.")}`
        );
    }

    // Ensure the auth session exists before redirecting to protected actions like password update.
    const {
        data: { user },
        error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError || !user) {
        if (getUserError) {
            console.error("[OAuth Callback] getUser error:", getUserError);
        }
        return NextResponse.redirect(
            `${origin}${errorRedirectPath}?error=${encodeURIComponent("Session invalide. Demande un nouveau lien.")}`
        );
    }

    // Keep profile bootstrap logic for signup/oauth.
    try {
        const { data: existingProfile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .maybeSingle();

        const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (typeof fullName === "string" && fullName.trim()) {
            const firstName = fullName.trim().split(/\s+/)[0];
            const isNewUser = !existingProfile?.first_name;
            const updateData: {
                first_name: string;
                subscription_tier?: string;
                subscription_status?: string;
                trial_started_at?: string;
                trial_end_date?: string;
            } = { first_name: firstName };

            if (isNewUser) {
                const now = new Date();
                const trialEndDate = new Date(now);
                trialEndDate.setDate(trialEndDate.getDate() + 14);

                updateData.subscription_tier = "solo_pro";
                updateData.subscription_status = "trialing";
                updateData.trial_started_at = now.toISOString();
                updateData.trial_end_date = trialEndDate.toISOString();
            }

            await supabase
                .from("profiles")
                .update(updateData)
                .eq("id", user.id);
        }
    } catch (profileError) {
        console.error("[OAuth Callback] Error updating profile:", profileError);
        // Do not block auth redirect on profile update failure.
    }

    return NextResponse.redirect(`${origin}${next}`);
}
