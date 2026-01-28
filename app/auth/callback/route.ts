import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/dashboard";

    const paramsObj = Object.fromEntries(searchParams.entries());
    console.log("[OAuth Callback] Params:", paramsObj);

    // Handle errors returned from the provider/supabase directly
    if (searchParams.has("error")) {
        const errorCode = searchParams.get("error");
        const errorDescription = searchParams.get("error_description") || "No description provided";
        console.error(`[OAuth Callback] Error from provider: ${errorCode} - ${errorDescription}`);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`);
    }

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error("[OAuth Callback] exchangeCodeForSession error:", error);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
        }

        // Check if user has a profile with first_name, if not try to get it from metadata
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Check if this is a new user (no first_name means new profile)
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('first_name, subscription_status')
                .eq('id', user.id)
                .single();

            const isNewUser = !existingProfile?.first_name;

            if (user.user_metadata?.full_name || user.user_metadata?.name) {
                const fullName = user.user_metadata.full_name || user.user_metadata.name;
                const firstName = fullName.split(' ')[0]; // Simple extraction

                const updateData: any = { first_name: firstName };

                // If new user, activate 14-day Solo Pro trial
                if (isNewUser) {
                    const now = new Date();
                    const trialEndDate = new Date(now);
                    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days trial

                    updateData.subscription_tier = 'solo_pro';
                    updateData.subscription_status = 'trialing';
                    updateData.trial_started_at = now.toISOString();
                    updateData.trial_end_date = trialEndDate.toISOString();
                }

                await supabase
                    .from('profiles')
                    .update(updateData)
                    .eq('id', user.id);
            }
        }

        return NextResponse.redirect(`${origin}${next}`);
    }

    // return the user to an error page with instructions
    console.error("[OAuth Callback] No code received in callback");
    return NextResponse.redirect(`${origin}/login?error=Authentication failed: No code received`);
}
