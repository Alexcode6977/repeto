import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient as createServerClient } from '@supabase/supabase-js';

// This endpoint is called after successful Stripe checkout for troupe creation
export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const origin = request.nextUrl.origin;

    console.log('=== TROUPE SUCCESS HANDLER ===');
    console.log('Session ID:', sessionId);

    if (!sessionId) {
        console.error('ERROR: Missing session_id');
        return NextResponse.redirect(new URL('/troupes/create?error=missing_session', origin));
    }

    try {
        // Retrieve the checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log('Session metadata:', JSON.stringify(session.metadata));

        const userId = session.metadata?.supabase_user_id;
        const troupeName = session.metadata?.troupe_name;
        const subscriptionId = session.subscription as string;

        if (!userId || !troupeName) {
            console.error('ERROR: Missing userId or troupeName');
            return NextResponse.redirect(new URL('/troupes/create?error=invalid_session', origin));
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            console.error('ERROR: Missing Supabase env vars');
            return NextResponse.redirect(new URL('/troupes/create?error=config_error', origin));
        }

        const supabaseAdmin = createServerClient(supabaseUrl, serviceKey);

        // IMPORTANT: Ensure profile exists before creating troupe
        console.log('Checking if profile exists...');
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (!existingProfile) {
            console.log('Profile not found, creating one...');
            // Get user email from Stripe customer
            const customer = await stripe.customers.retrieve(session.customer as string);
            const email = 'email' in customer ? customer.email : null;

            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: userId,
                    email: email,
                    subscription_tier: 'troupe',
                    subscription_status: 'active',
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: subscriptionId,
                });

            if (profileError) {
                console.error('ERROR creating profile:', profileError.message);
                return NextResponse.redirect(new URL('/troupes/create?error=profile_failed', origin));
            }
            console.log('Profile created successfully');
        } else {
            console.log('Profile exists, updating subscription...');
            await supabaseAdmin
                .from('profiles')
                .update({
                    subscription_tier: 'troupe',
                    subscription_status: 'active',
                    stripe_subscription_id: subscriptionId,
                })
                .eq('id', userId);
        }

        // Generate a join code
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create the troupe
        console.log('Creating troupe...');
        const { data: troupe, error: troupeError } = await supabaseAdmin
            .from('troupes')
            .insert({
                name: troupeName,
                created_by: userId,
                join_code: joinCode,
            })
            .select('id')
            .single();

        if (troupeError || !troupe) {
            console.error('ERROR creating troupe:', troupeError?.message);
            return NextResponse.redirect(new URL('/troupes/create?error=creation_failed', origin));
        }

        console.log('Troupe created:', troupe.id);

        // Add the user as admin member
        console.log('Adding user as admin member...');
        const { error: memberError } = await supabaseAdmin
            .from('troupe_members')
            .insert({
                troupe_id: troupe.id,
                user_id: userId,
                role: 'admin',
            });

        if (memberError) {
            console.error('ERROR adding member:', memberError.message);
            // Don't fail the whole flow, the troupe is created
        } else {
            console.log('User added as admin');
        }

        // Redirect to the new troupe
        console.log('Redirecting to troupe:', troupe.id);
        return NextResponse.redirect(new URL(`/troupes/${troupe.id}?success=true`, origin));

    } catch (error: any) {
        console.error('CATCH ERROR:', error.message);
        return NextResponse.redirect(new URL('/troupes/create?error=unknown', origin));
    }
}
