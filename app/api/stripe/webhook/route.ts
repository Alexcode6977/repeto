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

async function markStripeEventProcessed(event: Stripe.Event): Promise<boolean> {
    const { error } = await getSupabaseAdmin()
        .from('stripe_webhook_events')
        .insert({
            event_id: event.id,
            event_type: event.type,
        });

    if (!error) return true;
    if (error.code === '23505') return false;
    throw error;
}

function mapStripeStatus(status: string): string {
    const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'inactive',
        trialing: 'trialing',
    };
    return statusMap[status] || 'inactive';
}

async function findTroupeIdBySubscriptionId(subscriptionId: string): Promise<string | null> {
    const { data: troupe } = await getSupabaseAdmin()
        .from('troupes')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
    return troupe?.id || null;
}

async function findProfileIdBySubscriptionId(subscriptionId: string): Promise<string | null> {
    const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
    return profile?.id || null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    const subscription = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription;
    if (typeof subscription === 'string') return subscription;
    if (subscription && typeof subscription === 'object' && 'id' in subscription) {
        return subscription.id;
    }
    return null;
}

function getSubscriptionPeriodEndIso(
    subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>
): string | null {
    const currentPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
    if (typeof currentPeriodEnd !== 'number') return null;
    return new Date(currentPeriodEnd * 1000).toISOString();
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
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown signature verification error';
        console.error('Webhook signature verification failed:', message);
        return NextResponse.json(
            { error: `Webhook Error: ${message}` },
            { status: 400 }
        );
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    try {
        const isNewEvent = await markStripeEventProcessed(event);
        if (!isNewEvent) {
            console.log(`[Stripe Webhook] Duplicate event ignored: ${event.id}`);
            return NextResponse.json({ received: true, duplicate: true });
        }

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
    } catch (error: unknown) {
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
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const tier = getTierFromPriceId(priceId);

    console.log(`[Webhook] Checkout completed - User: ${userId}, Tier: ${tier}, Troupe: ${troupeId || 'N/A'}`);

    // Update profile or troupe based on subscription type
    const supabase = getSupabaseAdmin();

    if (troupeId && (tier === 'troupe' || tier === 'troupe_xl')) {
        // Troupe subscription - reactivate if inactive
        const { data: troupeData } = await supabase
            .from('troupes')
            .select('subscription_status, inactivated_at')
            .eq('id', troupeId)
            .single();

        const wasInactive = troupeData?.subscription_status === 'inactive';

        // Update troupe ONLY
        await supabase
            .from('troupes')
            .update({
                subscription_status: 'active',
                subscription_tier: tier,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscriptionId,
                inactivated_at: null, // Clear inactivation date on reactivation
                trial_started_at: null,
                trial_end_date: null,
            })
            .eq('id', troupeId);

        console.log(`[Webhook] ${wasInactive ? 'Reactivated' : 'Activated'} troupe subscription for troupe ${troupeId}`);
    } else {
        // Solo Pro subscription - upgrade from trial if trialing
        // THIS BLOCK IS ONLY FOR PERSONAL SUBSCRIPTIONS NOW
        const { data: profileData } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', userId)
            .single();

        const wasTrialing = profileData?.subscription_status === 'trialing';
        const periodEndIso = getSubscriptionPeriodEndIso(subscription);
        const profileUpdate: Record<string, string | null> = {
            subscription_tier: tier,
            subscription_status: 'active',
            stripe_subscription_id: subscriptionId,
        };
        if (periodEndIso) {
            profileUpdate.subscription_end_date = periodEndIso;
        }

        await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', userId);

        console.log(`[Webhook] ${wasTrialing ? 'Upgraded trial to' : 'Activated'} ${tier} subscription for user ${userId}`);
    }

    // Log subscription event
    await supabase.from('subscription_events').insert({
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
    const sub = subscription;
    const userId = sub.metadata?.supabase_user_id;
    const metadataTroupeId = sub.metadata?.troupe_id;
    const troupeId = metadataTroupeId || await findTroupeIdBySubscriptionId(sub.id);
    const priceId = sub.items.data[0]?.price.id || '';
    const tier = getTierFromPriceId(priceId);
    const status = mapStripeStatus(sub.status);

    console.log(`[Webhook] Subscription updated - Status: ${status}, Tier: ${tier}`);

    // If it's a TROUPE subscription, update ONLY the troupe
    if (troupeId) {
        const troupeUpdate: Record<string, string | null> = {
            subscription_status: status,
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
        };
        if (tier === 'troupe' || tier === 'troupe_xl') {
            troupeUpdate.subscription_tier = tier;
        }
        if (status === 'active') {
            troupeUpdate.trial_started_at = null;
            troupeUpdate.trial_end_date = null;
        }

        await getSupabaseAdmin()
            .from('troupes')
            .update(troupeUpdate)
            .eq('id', troupeId);

        // DO NOT update profile
    }
    // If it's a USER subscription (no troupeId), update the profile
    else if (userId) {
        const periodEndIso = getSubscriptionPeriodEndIso(sub);
        const profileUpdate: Record<string, string> = {
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: sub.id,
        };
        if (periodEndIso) {
            profileUpdate.subscription_end_date = periodEndIso;
        }

        await getSupabaseAdmin()
            .from('profiles')
            .update(profileUpdate)
            .eq('id', userId);
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const metadataUserId = subscription.metadata?.supabase_user_id;
    const metadataTroupeId = subscription.metadata?.troupe_id;
    const troupeId = metadataTroupeId || await findTroupeIdBySubscriptionId(subscription.id);
    const userId = metadataUserId || await findProfileIdBySubscriptionId(subscription.id);

    console.log(`[Webhook] Subscription deleted - User: ${userId}, Troupe: ${troupeId || 'N/A'}`);

    // If it's a TROUPE subscription
    if (troupeId) {
        await getSupabaseAdmin()
            .from('troupes')
            .update({
                subscription_status: 'canceled',
                stripe_subscription_id: null,
            })
            .eq('id', troupeId);

        // DO NOT downgrade the user profile here, as they might have a separate personal subscription
    }
    // If it's a PERSONAL subscription
    else if (userId) {
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
            troupe_id: null,
            event_type: 'canceled',
            stripe_event_id: subscription.id,
            previous_tier: profile?.subscription_tier || 'unknown',
            new_tier: 'free',
        });
    }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const troupeId = subscription.metadata?.troupe_id || await findTroupeIdBySubscriptionId(subscription.id);

        if (troupeId) {
            await getSupabaseAdmin()
                .from('troupes')
                .update({
                    subscription_status: 'past_due',
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscription.id,
                })
                .eq('id', troupeId);

            await getSupabaseAdmin().from('subscription_events').insert({
                user_id: subscription.metadata?.supabase_user_id || null,
                troupe_id: troupeId,
                event_type: 'payment_failed',
                stripe_event_id: invoice.id,
                metadata: { amount: invoice.amount_due },
            });

            console.log(`[Webhook] Payment failed for troupe subscription: ${subscription.id}`);
            return;
        }
    }

    // Personal subscription fallback
    const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

    if (profile) {
        await getSupabaseAdmin()
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id);

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
    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (!subscriptionId) return;

    // Get subscription to determine tier
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id || '';
    const tier = getTierFromPriceId(priceId);
    const troupeId = subscription.metadata?.troupe_id || await findTroupeIdBySubscriptionId(subscription.id);

    if (troupeId) {
        await getSupabaseAdmin()
            .from('troupes')
            .update({
                subscription_status: 'active',
                subscription_tier: tier === 'troupe_xl' ? 'troupe_xl' : 'troupe',
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                trial_started_at: null,
                trial_end_date: null,
            })
            .eq('id', troupeId);

        await getSupabaseAdmin().from('subscription_events').insert({
            user_id: subscription.metadata?.supabase_user_id || null,
            troupe_id: troupeId,
            event_type: 'renewed',
            stripe_event_id: invoice.id,
            new_tier: tier,
            metadata: { amount: invoice.amount_paid },
        });

        console.log(`[Webhook] Payment succeeded for troupe subscription: ${subscription.id}`);
        return;
    }

    // Find user by Stripe customer ID
    const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

    if (profile) {
        const periodEndIso = getSubscriptionPeriodEndIso(subscription);
        const profileUpdate: Record<string, string> = {
            subscription_status: 'active',
            subscription_tier: tier,
        };
        if (periodEndIso) {
            profileUpdate.subscription_end_date = periodEndIso;
        }

        await getSupabaseAdmin()
            .from('profiles')
            .update(profileUpdate)
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
