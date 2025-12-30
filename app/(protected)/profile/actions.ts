"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Utilisateur non authentifié" };
    }

    const userId = user.id;

    try {
        // Delete user data from all related tables in correct order (respecting foreign keys)
        // 1. Delete feedbacks
        await supabase.from("feedbacks").delete().eq("user_id", userId);

        // 2. Delete recordings
        await supabase.from("recordings").delete().eq("user_id", userId);

        // 3. Delete bookmarks
        await supabase.from("bookmarks").delete().eq("user_id", userId);

        // 4. Delete troupe members entries
        await supabase.from("troupe_members").delete().eq("user_id", userId);

        // 5. Delete calendar attendance entries
        await supabase.from("calendar_attendance").delete().eq("user_id", userId);

        // 6. Delete user plays (personal copies)
        await supabase.from("user_plays").delete().eq("user_id", userId);

        // 7. Delete profile (should cascade, but explicit for safety)
        await supabase.from("profiles").delete().eq("id", userId);

        // 8. Delete auth user using admin client (requires service role key)
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

        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
            console.error("Error deleting auth user:", deleteAuthError);
            return { success: false, error: "Erreur lors de la suppression du compte d'authentification" };
        }

        // Sign out the user (session will be invalidated anyway after user deletion)
        await supabase.auth.signOut();

        return { success: true };
    } catch (error) {
        console.error("Error deleting account:", error);
        return { success: false, error: "Une erreur est survenue lors de la suppression du compte" };
    }
}
