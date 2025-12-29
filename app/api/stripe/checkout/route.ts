import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Vous devez être connecté pour souscrire.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { priceId, troupeId, troupeName } = body;

        // Validate price ID
        const validPriceIds = [STRIPE_PRICES.SOLO_PRO_MONTHLY, STRIPE_PRICES.TROUPE_MONTHLY];
        if (!validPriceIds.includes(priceId)) {
            return NextResponse.json(
                { error: 'Prix invalide.' },
                { status: 400 }
            );
        }

        // Get or create Stripe customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, email')
            .eq('id', user.id)
            .single();

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: user.email || profile?.email,
                metadata: {
                    supabase_user_id: user.id,
                },
            });
            customerId = customer.id;

            // Save customer ID to profile
            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id);
        }

        // Determine success/cancel URLs
        const origin = request.headers.get('origin') || 'http://localhost:3000';

        // For troupe creation, redirect to a special handler
        const isTroupeCreation = priceId === STRIPE_PRICES.TROUPE_MONTHLY && troupeName;

        const successUrl = isTroupeCreation
            ? `${origin}/api/stripe/troupe-success?session_id={CHECKOUT_SESSION_ID}`
            : troupeId
                ? `${origin}/troupes/${troupeId}?session_id={CHECKOUT_SESSION_ID}&success=true`
                : `${origin}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`;

        const cancelUrl = troupeName
            ? `${origin}/troupes/create?canceled=true`
            : troupeId
                ? `${origin}/troupes/${troupeId}?canceled=true`
                : `${origin}/pricing?canceled=true`;

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                supabase_user_id: user.id,
                troupe_id: troupeId || '',
                troupe_name: troupeName || '', // Store troupe name for creation
            },
            subscription_data: {
                metadata: {
                    supabase_user_id: user.id,
                    troupe_id: troupeId || '',
                    troupe_name: troupeName || '',
                },
            },
            billing_address_collection: 'auto',
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json(
            { error: error.message || 'Erreur lors de la création du paiement.' },
            { status: 500 }
        );
    }
}

