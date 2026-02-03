"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { getStripe } from "@/lib/stripe";

export interface Invoice {
    id: string;
    date: number;
    amount: number;
    currency: string;
    status: string | null;
    pdf: string | null;
    number: string | null;
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
