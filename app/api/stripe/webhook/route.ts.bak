import { NextRequest, NextResponse } from 'next/server';
import { stripe, getTierFromPriceId } from '@/lib/stripe';
import { createClient as createServerClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Lazy initialization to avoid build errors
function getSupabaseAdmin() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json(
            { error: `Webhook Error: ${err.message}` },
            { status: 400 }
        );
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionChange(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
                break;

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[Stripe Webhook] Error processing event:', error);
        return NextResponse.json(
            { error: 'Webhook processing error' },
            { status: 500 }
        );
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.supabase_user_id;
    const troupeId = session.metadata?.troupe_id;
    const subscriptionId = session.subscription as string;

    if (!userId || !subscriptionId) {
        console.error('[Webhook] Missing userId or subscriptionId in checkout session');
        return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
    const priceId = subscription.items.data[0]?.price.id;
    const tier = getTierFromPriceId(priceId);

    console.log(`[Webhook] Checkout completed - User: ${userId}, Tier: ${tier}, Troupe: ${troupeId || 'N/A'}`);

    // Update profile or troupe based on subscription type
    if (troupeId && tier === 'troupe') {
        // Troupe subscription
        await getSupabaseAdmin()
            .from('troupes')
            .update({
                subscription_status: 'active',
                subscription_tier: 'troupe',
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscriptionId,
            })
            .eq('id', troupeId);

        // Also mark the owner as having a troupe subscription
        await getSupabaseAdmin()
            .from('profiles')
            .update({
                subscription_tier: 'troupe',
                subscription_status: 'active',
                stripe_subscription_id: subscriptionId,
            })
            .eq('id', userId);
    } else {
        // Solo Pro subscription
        await getSupabaseAdmin()
            .from('profiles')
            .update({
                subscription_tier: tier,
                subscription_status: 'active',
                stripe_subscription_id: subscriptionId,
                subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', userId);
    }

    // Log subscription event
    await getSupabaseAdmin().from('subscription_events').insert({
        user_id: userId,
        troupe_id: troupeId || null,
        event_type: 'created',
        stripe_event_id: session.id,
        previous_tier: 'free',
        new_tier: tier,
        metadata: { session_id: session.id },
    });
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const sub = subscription as any; // Type assertion for Stripe API compatibility
    const userId = sub.metadata?.supabase_user_id;
    const troupeId = sub.metadata?.troupe_id;
    const priceId = sub.items.data[0]?.price.id;
    const tier = getTierFromPriceId(priceId);

    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'inactive',
        trialing: 'trialing',
    };
    const status = statusMap[sub.status] || 'inactive';

    console.log(`[Webhook] Subscription updated - Status: ${status}, Tier: ${tier}`);

    if (userId) {
        await getSupabaseAdmin()
            .from('profiles')
            .update({
                subscription_tier: tier,
                subscription_status: status,
                subscription_end_date: new Date(sub.current_period_end * 1000).toISOString(),
            })
            .eq('id', userId);
    }

    if (troupeId) {
        await getSupabaseAdmin()
            .from('troupes')
            .update({
                subscription_status: status,
            })
            .eq('id', troupeId);
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.supabase_user_id;
    const troupeId = subscription.metadata?.troupe_id;

    console.log(`[Webhook] Subscription deleted - User: ${userId}, Troupe: ${troupeId || 'N/A'}`);

    if (userId) {
        // Get previous tier for logging
        const { data: profile } = await getSupabaseAdmin()
            .from('profiles')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

        await getSupabaseAdmin()
            .from('profiles')
            .update({
                subscription_tier: 'free',
                subscription_status: 'canceled',
                stripe_subscription_id: null,
            })
            .eq('id', userId);

        // Log event
        await getSupabaseAdmin().from('subscription_events').insert({
            user_id: userId,
            troupe_id: troupeId || null,
            event_type: 'canceled',
            stripe_event_id: subscription.id,
            previous_tier: profile?.subscription_tier || 'unknown',
            new_tier: 'free',
        });
    }

    if (troupeId) {
        await getSupabaseAdmin()
            .from('troupes')
            .update({
                subscription_status: 'canceled',
                stripe_subscription_id: null,
            })
            .eq('id', troupeId);
    }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    // Find user by Stripe customer ID
    const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (profile) {
        await getSupabaseAdmin()
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id);

        // Log event
        await getSupabaseAdmin().from('subscription_events').insert({
            user_id: profile.id,
            event_type: 'payment_failed',
            stripe_event_id: invoice.id,
            metadata: { amount: invoice.amount_due },
        });
    }

    console.log(`[Webhook] Payment failed for customer: ${customerId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const subscriptionId = (invoice as any).subscription as string;

    if (!subscriptionId) return;

    // Get subscription to determine tier
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
    const priceId = subscription.items.data[0]?.price.id;
    const tier = getTierFromPriceId(priceId);

    // Find user by Stripe customer ID
    const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (profile) {
        await getSupabaseAdmin()
            .from('profiles')
            .update({
                subscription_status: 'active',
                subscription_tier: tier,
                subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', profile.id);

        // Log renewal event
        await getSupabaseAdmin().from('subscription_events').insert({
            user_id: profile.id,
            event_type: 'renewed',
            stripe_event_id: invoice.id,
            new_tier: tier,
            metadata: { amount: invoice.amount_paid },
        });
    }

    console.log(`[Webhook] Payment succeeded for customer: ${customerId}`);
}
