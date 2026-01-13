import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Check if user has a profile with first_name, if not try to get it from metadata
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.full_name || user?.user_metadata?.name) {
                const fullName = user.user_metadata.full_name || user.user_metadata.name;
                const firstName = fullName.split(' ')[0]; // Simple extraction

                await supabase
                    .from('profiles')
                    .update({ first_name: firstName })
                    .eq('id', user.id)
                    .is('first_name', null); // Only update if empty
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
