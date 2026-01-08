"use server";

import { stripe, getTierFromPriceId } from "@/lib/stripe";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Supabase admin client for bypassing RLS
function getSupabaseAdmin() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

/**
 * Sync subscription status from Stripe to Supabase.
 * Call this after checkout success or periodically to keep status in sync.
 */
export async function syncSubscriptionFromStripe(userId: string): Promise<{
    success: boolean;
    tier: string;
    status: string;
    error?: string;
}> {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        // Get user's Stripe customer ID
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id, stripe_subscription_id")
            .eq("id", userId)
            .single();

        if (!profile?.stripe_customer_id) {
            return { success: true, tier: "free", status: "inactive" };
        }

        // If we have a subscription ID, check it directly
        if (profile.stripe_subscription_id) {
            try {
                const subscription = await stripe.subscriptions.retrieve(
                    profile.stripe_subscription_id
                ) as any;

                const priceId = subscription.items.data[0]?.price.id;
                const tier = getTierFromPriceId(priceId);

                // Map Stripe status to our status
                const statusMap: Record<string, string> = {
                    active: "active",
                    past_due: "past_due",
                    canceled: "canceled",
                    unpaid: "inactive",
                    trialing: "trialing",
                    incomplete: "inactive",
                    incomplete_expired: "inactive",
                };
                const status = statusMap[subscription.status] || "inactive";

                // Update profile
                await supabaseAdmin
                    .from("profiles")
                    .update({
                        subscription_tier: tier,
                        subscription_status: status,
                        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
                        subscription_end_date: subscription.current_period_end
                            ? new Date(subscription.current_period_end * 1000).toISOString()
                            : null,
                    })
                    .eq("id", userId);

                return { success: true, tier, status };
            } catch (stripeError: any) {
                // Subscription not found = likely canceled/deleted
                if (stripeError.code === "resource_missing") {
                    await supabaseAdmin
                        .from("profiles")
                        .update({
                            subscription_tier: "free",
                            subscription_status: "canceled",
                            cancel_at_period_end: false,
                            stripe_subscription_id: null,
                        })
                        .eq("id", userId);

                    return { success: true, tier: "free", status: "canceled" };
                }
                throw stripeError;
            }
        }

        // No subscription ID, check if customer has any active subscriptions
        const subscriptions = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: "active",
            limit: 1,
        });

        if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0] as any;
            const priceId = subscription.items.data[0]?.price.id;
            const tier = getTierFromPriceId(priceId);

            await supabaseAdmin
                .from("profiles")
                .update({
                    subscription_tier: tier,
                    subscription_status: "active",
                    stripe_subscription_id: subscription.id,
                    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
                    subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
                })
                .eq("id", userId);

            return { success: true, tier, status: "active" };
        }

        // No active subscription
        return { success: true, tier: "free", status: "inactive" };

    } catch (error: any) {
        console.error("[syncSubscriptionFromStripe] Error:", error);
        return {
            success: false,
            tier: "free",
            status: "unknown",
            error: error.message,
        };
    }
}

/**
 * Get subscription status, syncing from Stripe if stale.
 * Uses a simple time-based cache (checks Stripe max once every 5 minutes).
 */
export async function getSubscriptionStatus(userId: string): Promise<{
    tier: string;
    status: string;
    endDate?: string | null;
    cancelAtPeriodEnd?: boolean;
}> {
    const supabase = await createClient();

    const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, subscription_end_date, stripe_customer_id, cancel_at_period_end")
        .eq("id", userId)
        .single();

    if (!profile) {
        return { tier: "free", status: "inactive" };
    }

    // If user has a Stripe customer, we might want to sync
    // For now, just return cached values (sync will be called on page load)
    return {
        tier: profile.subscription_tier || "free",
        status: profile.subscription_status || "inactive",
        endDate: profile.subscription_end_date,
        cancelAtPeriodEnd: profile.cancel_at_period_end,
    };
}

/**
 * Handle successful checkout by syncing the session data.
 * Called from /api/stripe/success after payment.
 */
export async function handleCheckoutSuccess(sessionId: string): Promise<{
    success: boolean;
    userId?: string;
    tier?: string;
    error?: string;
}> {
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription as string;

        if (!userId || !subscriptionId) {
            return { success: false, error: "Missing userId or subscriptionId" };
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        const supabaseAdmin = getSupabaseAdmin();

        // Update profile
        await supabaseAdmin
            .from("profiles")
            .update({
                subscription_tier: tier,
                subscription_status: "active",
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscriptionId,
                cancel_at_period_end: subscription.cancel_at_period_end ?? false,
                subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("id", userId);

        // Log subscription event
        await supabaseAdmin.from("subscription_events").insert({
            user_id: userId,
            event_type: "created",
            stripe_event_id: sessionId,
            previous_tier: "free",
            new_tier: tier,
            metadata: { session_id: sessionId },
        });

        return { success: true, userId, tier };

    } catch (error: any) {
        console.error("[handleCheckoutSuccess] Error:", error);
        return { success: false, error: error.message };
    }
}
