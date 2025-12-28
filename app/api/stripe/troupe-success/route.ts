import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient as createServerClient } from '@supabase/supabase-js';

// This endpoint is called after successful Stripe checkout for troupe creation
export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.redirect(new URL('/troupes/create?error=missing_session', request.url));
    }

    try {
        // Retrieve the checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        const userId = session.metadata?.supabase_user_id;
        const troupeName = session.metadata?.troupe_name;
        const subscriptionId = session.subscription as string;

        if (!userId || !troupeName) {
            return NextResponse.redirect(new URL('/troupes/create?error=invalid_session', request.url));
        }

        // Use service role to create troupe (bypasses RLS)
        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Create the troupe
        const { data: troupe, error: troupeError } = await supabaseAdmin
            .from('troupes')
            .insert({
                name: troupeName,
                admin_id: userId,
                subscription_status: 'active',
                subscription_tier: 'troupe',
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: session.customer as string,
            })
            .select('id')
            .single();

        if (troupeError || !troupe) {
            console.error('Error creating troupe:', troupeError);
            return NextResponse.redirect(new URL('/troupes/create?error=creation_failed', request.url));
        }

        // Add the user as admin member
        await supabaseAdmin
            .from('troupe_members')
            .insert({
                troupe_id: troupe.id,
                user_id: userId,
                role: 'admin',
            });

        // Update user's subscription tier
        await supabaseAdmin
            .from('profiles')
            .update({
                subscription_tier: 'troupe',
                subscription_status: 'active',
                stripe_subscription_id: subscriptionId,
            })
            .eq('id', userId);

        // Log the event
        await supabaseAdmin.from('subscription_events').insert({
            user_id: userId,
            troupe_id: troupe.id,
            event_type: 'created',
            stripe_event_id: sessionId,
            previous_tier: 'free',
            new_tier: 'troupe',
            metadata: { troupe_name: troupeName },
        });

        // Redirect to the new troupe
        return NextResponse.redirect(new URL(`/troupes/${troupe.id}?success=true`, request.url));

    } catch (error: any) {
        console.error('Troupe creation error:', error);
        return NextResponse.redirect(new URL('/troupes/create?error=unknown', request.url));
    }
}
