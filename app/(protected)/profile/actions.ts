"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { getStripe, getTierFromPriceId } from "@/lib/stripe";
import type { SubscriptionTier } from "@/lib/subscription";

export interface Invoice {
    id: string;
    date: number;
    amount: number;
    currency: string;
    status: string | null;
    pdf: string | null;
    number: string | null;
}

interface ProfileSubscriptionSnapshot {
    firstName: string | null;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: string;
    subscriptionEndDate: string | null;
    stripeCustomerId: string | null;
    cancelAtPeriodEnd: boolean;
}

function mapStripeStatus(status: string): string {
    const statusMap: Record<string, string> = {
        active: "active",
        trialing: "trialing",
        past_due: "past_due",
        unpaid: "inactive",
        canceled: "canceled",
        incomplete: "inactive",
        incomplete_expired: "inactive",
        paused: "inactive",
    };
    return statusMap[status] || "inactive";
}

function getSubscriptionPeriodEndIso(subscription: Stripe.Subscription): string | null {
    const currentPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
    if (typeof currentPeriodEnd !== "number") return null;
    return new Date(currentPeriodEnd * 1000).toISOString();
}

export async function syncAndGetProfileSubscription(): Promise<ProfileSubscriptionSnapshot | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, subscription_tier, subscription_status, subscription_end_date, stripe_customer_id, cancel_at_period_end, stripe_subscription_id")
        .eq("id", user.id)
        .single();

    if (!profile) return null;

    const snapshot: ProfileSubscriptionSnapshot = {
        firstName: profile.first_name || null,
        subscriptionTier: (profile.subscription_tier as SubscriptionTier) || "free",
        subscriptionStatus: profile.subscription_status || "inactive",
        subscriptionEndDate: profile.subscription_end_date || null,
        stripeCustomerId: profile.stripe_customer_id || null,
        cancelAtPeriodEnd: profile.cancel_at_period_end || false,
    };

    if (!profile.stripe_customer_id) {
        return snapshot;
    }

    const shouldReconcile =
        snapshot.subscriptionTier === "free" ||
        ["inactive", "canceled"].includes(snapshot.subscriptionStatus) ||
        !profile.stripe_subscription_id;

    if (!shouldReconcile) {
        return snapshot;
    }

    try {
        const stripe = getStripe();
        const subscriptions = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: "all",
            limit: 20,
        });

        // Personal subscription only: ignore troupe-linked subscriptions.
        const personalSubs = subscriptions.data.filter((sub) => !sub.metadata?.troupe_id);
        if (personalSubs.length === 0) {
            return snapshot;
        }

        const statusPriority: Record<string, number> = {
            active: 5,
            trialing: 4,
            past_due: 3,
            unpaid: 2,
            canceled: 1,
            incomplete: 0,
            incomplete_expired: 0,
            paused: 0,
        };

        const bestSub = personalSubs
            .slice()
            .sort((a, b) => {
                const byStatus = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
                if (byStatus !== 0) return byStatus;
                return b.created - a.created;
            })[0];

        if (!bestSub) {
            return snapshot;
        }

        const stripeTier = getTierFromPriceId(bestSub.items.data[0]?.price.id || "");
        const stripeStatus = mapStripeStatus(bestSub.status);
        const periodEndIso = getSubscriptionPeriodEndIso(bestSub);
        const stripeCancelAtPeriodEnd = !!bestSub.cancel_at_period_end;

        const shouldUpdate =
            profile.subscription_tier !== stripeTier ||
            profile.subscription_status !== stripeStatus ||
            profile.stripe_subscription_id !== bestSub.id ||
            (periodEndIso && profile.subscription_end_date !== periodEndIso) ||
            profile.cancel_at_period_end !== stripeCancelAtPeriodEnd;

        if (shouldUpdate) {
            const updatePayload: Record<string, string | boolean | null> = {
                subscription_tier: stripeTier,
                subscription_status: stripeStatus,
                stripe_subscription_id: bestSub.id,
                cancel_at_period_end: stripeCancelAtPeriodEnd,
            };
            if (periodEndIso) {
                updatePayload.subscription_end_date = periodEndIso;
            }

            await supabase
                .from("profiles")
                .update(updatePayload)
                .eq("id", user.id);
        }

        return {
            ...snapshot,
            subscriptionTier: stripeTier,
            subscriptionStatus: stripeStatus,
            subscriptionEndDate: periodEndIso || snapshot.subscriptionEndDate,
            cancelAtPeriodEnd: stripeCancelAtPeriodEnd,
            stripeCustomerId: profile.stripe_customer_id,
        };
    } catch (e) {
        console.error("[ProfileSubscription] Stripe reconciliation failed:", e);
        return snapshot;
    }
}

export async function getInvoices(): Promise<Invoice[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

    if (!profile?.stripe_customer_id) return [];

    try {
        const stripe = getStripe();
        const invoices = await stripe.invoices.list({
            customer: profile.stripe_customer_id,
            limit: 10,
            status: 'paid'
        });

        return invoices.data.map(invoice => ({
            id: invoice.id,
            date: invoice.created * 1000,
            amount: invoice.total,
            currency: invoice.currency,
            status: invoice.status,
            pdf: invoice.invoice_pdf || null,
            number: invoice.number
        }));
    } catch (e) {
        console.error("Error fetching invoices:", e);
        return [];
    }
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Utilisateur non authentifié" };
    }

    const userId = user.id;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        console.error("SUPABASE_SERVICE_ROLE_KEY not configured");
        return { success: false, error: "Configuration serveur manquante" };
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    try {
        console.log(`[DELETE_ACCOUNT] Starting deletion for user ${userId}`);

        // 0. Delete Troupes created by user
        console.log(`[DELETE_ACCOUNT] Deleting owned troupes...`);
        const { error: troupesError, count: troupesCount } = await adminClient
            .from("troupes")
            .delete()
            .eq("created_by", userId);

        if (troupesError) {
            console.error("[DELETE_ACCOUNT] Error deleting troupes:", troupesError);
            throw new Error(`Failed to delete troupes: ${troupesError.message}`);
        }
        console.log(`[DELETE_ACCOUNT] Deleted ${troupesCount} owned troupes.`);


        // 1. Delete feedbacks
        console.log(`[DELETE_ACCOUNT] Deleting feedbacks...`);
        const { error: feedbackError } = await adminClient.from("feedbacks").delete().eq("user_id", userId);
        if (feedbackError) console.error("[DELETE_ACCOUNT] Error deleting feedbacks:", feedbackError);

        // 1.5 Delete Storage Files (Recordings)
        console.log(`[DELETE_ACCOUNT] Cleaning up storage files...`);
        try {
            // "play-recordings" bucket uses userId as root folder: userId/filename
            const { data: fileList, error: listError } = await adminClient
                .storage
                .from('play-recordings')
                .list(userId);

            if (fileList && fileList.length > 0) {
                const filesToDelete = fileList.map(f => `${userId}/${f.name}`);
                console.log(`[DELETE_ACCOUNT] Found ${filesToDelete.length} files in 'play-recordings' for user.`);

                const { error: removeError } = await adminClient
                    .storage
                    .from('play-recordings')
                    .remove(filesToDelete);

                if (removeError) console.error("[DELETE_ACCOUNT] Error removing storage files:", removeError);
            } else if (listError) {
                console.error("[DELETE_ACCOUNT] Error listing storage files:", listError);
            }
        } catch (storageCatch) {
            console.error("[DELETE_ACCOUNT] Storage cleanup failed:", storageCatch);
        }

        // 2. Delete recordings
        console.log(`[DELETE_ACCOUNT] Deleting recordings...`);

        const { error: recordingsError } = await adminClient.from("recordings").delete().eq("user_id", userId);
        if (recordingsError) console.error("[DELETE_ACCOUNT] Error deleting recordings:", recordingsError);

        // 3. Delete bookmarks
        console.log(`[DELETE_ACCOUNT] Deleting bookmarks...`);
        await adminClient.from("bookmarks").delete().eq("user_id", userId);

        // 4. Delete troupe members entries
        console.log(`[DELETE_ACCOUNT] Deleting troupe memberships...`);
        await adminClient.from("troupe_members").delete().eq("user_id", userId);

        // 5. Delete calendar attendance
        console.log(`[DELETE_ACCOUNT] Deleting calendar attendance...`);
        await adminClient.from("calendar_attendance").delete().eq("user_id", userId);

        // 6. Delete user plays
        console.log(`[DELETE_ACCOUNT] Deleting user plays...`);
        await adminClient.from("user_plays").delete().eq("user_id", userId);

        // 7. Delete profile
        console.log(`[DELETE_ACCOUNT] Deleting profile...`);
        const { error: profileError } = await adminClient.from("profiles").delete().eq("id", userId);
        if (profileError) {
            console.error("[DELETE_ACCOUNT] Error deleting profile:", profileError);
            // If profile isn't deleted, auth deletion will definitely fail if profile > auth FK exists (usually cascade tho)
        }

        // 8. Delete auth user
        console.log(`[DELETE_ACCOUNT] Deleting auth user...`);
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
            console.error("[DELETE_ACCOUNT] Error deleting auth user:", deleteAuthError);
            return { success: false, error: "Erreur lors de la suppression du compte d'authentification: " + deleteAuthError.message };
        }

        console.log(`[DELETE_ACCOUNT] Successfully deleted user ${userId}`);


        // Sign out the user (session will be invalidated anyway after user deletion)
        await supabase.auth.signOut();

        return { success: true };
    } catch (error) {
        console.error("Error deleting account:", error);
        return { success: false, error: "Une erreur est survenue lors de la suppression du compte" };
    }
}
