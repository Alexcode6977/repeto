import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { getBaseUrlFromRequest } from '@/lib/server/url';

// This endpoint is called after successful Stripe checkout for troupe creation
export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const origin = getBaseUrlFromRequest(request);

    if (!sessionId) {
        return NextResponse.redirect(new URL('/troupes/create?error=missing_session', origin));
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const userId = session.metadata?.supabase_user_id;
        const troupeName = session.metadata?.troupe_name;
        const troupeTier = session.metadata?.troupe_tier || 'troupe'; // troupe or troupe_xl
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!userId || !troupeName || !subscriptionId || !customerId) {
            return NextResponse.redirect(new URL('/troupes/create?error=invalid_session', origin));
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            return NextResponse.redirect(new URL('/troupes/create?error=config_error', origin));
        }

        const supabaseAdmin = createServerClient(supabaseUrl, serviceKey);

        // Idempotency: if the troupe was already created for this subscription, reuse it.
        const { data: existingTroupe } = await supabaseAdmin
            .from('troupes')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

        if (existingTroupe?.id) {
            return NextResponse.redirect(new URL(`/troupes/${existingTroupe.id}?success=true`, origin));
        }

        // Ensure profile exists before creating troupe
        const customer = await stripe.customers.retrieve(customerId);
        const email = 'email' in customer ? customer.email : null;

        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (!existingProfile) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: userId,
                    email: email,
                    stripe_customer_id: customerId,
                });

            if (profileError) {
                return NextResponse.redirect(new URL('/troupes/create?error=profile_failed', origin));
            }
        } else {
            await supabaseAdmin
                .from('profiles')
                .update({
                    stripe_customer_id: customerId,
                })
                .eq('id', userId);
        }

        // Generate a join code with better entropy than Math.random().
        const joinCode = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();

        // Create the troupe
        const { data: troupe, error: troupeError } = await supabaseAdmin
            .from('troupes')
            .insert({
                name: troupeName,
                created_by: userId,
                join_code: joinCode,
                subscription_tier: troupeTier, // Store the tier on the troupe
                subscription_status: 'active',
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
            })
            .select('id')
            .single();

        if (troupeError || !troupe) {
            return NextResponse.redirect(new URL('/troupes/create?error=creation_failed', origin));
        }

        // Add the user as admin member
        const { error: memberError } = await supabaseAdmin
            .from('troupe_members')
            .upsert({
                troupe_id: troupe.id,
                user_id: userId,
                roles: ['admin'],
            });

        if (memberError) {
            return NextResponse.redirect(new URL('/troupes/create?error=membership_failed', origin));
        }

        return NextResponse.redirect(new URL(`/troupes/${troupe.id}?success=true`, origin));

    } catch (error: unknown) {
        console.error('CATCH ERROR:', error);
        return NextResponse.redirect(new URL('/troupes/create?error=unknown', origin));
    }
}
