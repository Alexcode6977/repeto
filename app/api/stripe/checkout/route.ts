import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrlFromRequest } from '@/lib/server/url';
import { canManageTroupe } from '@/lib/utils/roles';

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
        const { priceId, troupeId, troupeName, troupeTier } = body;

        if (!priceId) {
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

        // Existing troupe checkout: enforce permissions and prevent duplicate subscriptions.
        if (troupeId) {
            const [{ data: membership }, { data: troupe }] = await Promise.all([
                supabase
                    .from('troupe_members')
                    .select('roles')
                    .eq('troupe_id', troupeId)
                    .eq('user_id', user.id)
                    .maybeSingle(),
                supabase
                    .from('troupes')
                    .select('stripe_subscription_id, stripe_customer_id, subscription_status')
                    .eq('id', troupeId)
                    .maybeSingle(),
            ]);

            if (!canManageTroupe(membership?.roles)) {
                return NextResponse.json(
                    { error: 'Vous n’avez pas les droits pour gérer l’abonnement de cette troupe.' },
                    { status: 403 }
                );
            }

            const hasActiveStripeSubscription =
                !!troupe?.stripe_subscription_id &&
                ['active', 'past_due', 'trialing'].includes(troupe.subscription_status || '');

            if (hasActiveStripeSubscription) {
                return NextResponse.json(
                    {
                        error: 'Un abonnement Stripe est déjà actif pour cette troupe. Utilisez le portail de facturation.',
                        alreadySubscribed: true,
                    },
                    { status: 409 }
                );
            }
        }

        // Determine success/cancel URLs
        const origin = getBaseUrlFromRequest(request);

        // For troupe creation, redirect to a special handler
        const isTroupeCreation = troupeName && (troupeTier === 'troupe' || troupeTier === 'troupe_xl');

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
                troupe_name: troupeName || '',
                troupe_tier: troupeTier || 'troupe', // Store tier for creation
            },
            subscription_data: {
                metadata: {
                    supabase_user_id: user.id,
                    troupe_id: troupeId || '',
                    troupe_name: troupeName || '',
                    troupe_tier: troupeTier || 'troupe',
                },
            },
            billing_address_collection: 'auto',
        });

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de la création du paiement.';
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
