"use server";

import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "alex69.sartre@gmail.com";

interface AdminFeedbackEntry {
    id: string;
    user_id: string;
    script_title: string;
    character_name: string;
    rating: number;
    what_worked: string;
    what_didnt_work: string;
    improvement_ideas: string;
    duration_seconds: number;
    settings: Record<string, unknown>;
    status: string;
    resolved_at: string | null;
    admin_notes: string | null;
    created_at: string;
    device_type: string;
}

export async function isAdmin(): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email === ADMIN_EMAIL;
}

export async function getAllFeedback(): Promise<AdminFeedbackEntry[]> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== ADMIN_EMAIL) {
        console.error("Unauthorized admin access attempt");
        return [];
    }

    const { data, error } = await supabase
        .from("rehearsal_feedback")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching all feedback:", error);
        return [];
    }

    return data || [];
}

export async function updateFeedbackStatus(
    feedbackId: string,
    status: "pending" | "resolved" | "in_progress",
    adminNotes?: string
) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== ADMIN_EMAIL) {
        throw new Error("Unauthorized");
    }

    const updateData: Record<string, unknown> = {
        status,
    };

    if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
    }

    if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
    }

    const { error } = await supabase
        .from("rehearsal_feedback")
        .update(updateData)
        .eq("id", feedbackId);

    if (error) {
        console.error("Error updating feedback:", error);
        throw new Error("Failed to update feedback");
    }

    return { success: true };
}

export async function getFeedbackStats() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== ADMIN_EMAIL) {
        return null;
    }

    const { data, error } = await supabase
        .from("rehearsal_feedback")
        .select("rating, status, duration_seconds");

    if (error || !data) {
        return null;
    }

    const total = data.length;
    const pending = data.filter(f => f.status === "pending" || !f.status).length;
    const resolved = data.filter(f => f.status === "resolved").length;
    const avgRating = total > 0 ? data.reduce((sum, f) => sum + f.rating, 0) / total : 0;
    const totalMinutes = Math.round(data.reduce((sum, f) => sum + (f.duration_seconds || 0), 0) / 60);

    return {
        total,
        pending,
        resolved,
        avgRating: Math.round(avgRating * 10) / 10,
        totalMinutes,
    };
}

// User Management
interface UserProfile {
    id: string;
    subscription_tier: string | null;
    subscription_status: string | null;
    created_at: string;
    email?: string;
}

export async function getAllUsers(): Promise<UserProfile[]> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== ADMIN_EMAIL) {
        return [];
    }

    // Get profiles with subscription info
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, subscription_tier, subscription_status, created_at, email")
        .order("created_at", { ascending: false });

    if (error || !profiles) {
        console.error("Error fetching profiles:", error);
        return [];
    }

    return profiles;
}

export async function toggleUserPremium(userId: string, currentTier: string | null) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== ADMIN_EMAIL) {
        throw new Error("Unauthorized");
    }

    // Toggle between free and solo_pro
    const newTier = currentTier === 'solo_pro' ? 'free' : 'solo_pro';
    const newStatus = newTier === 'free' ? 'inactive' : 'active';

    const { error } = await supabase
        .from("profiles")
        .update({
            subscription_tier: newTier,
            subscription_status: newStatus
        })
        .eq("id", userId);

    if (error) {
        console.error("Error updating user subscription:", error);
        throw new Error("Failed to update user");
    }

    return { success: true, newTier };
}


// Library Management
export interface LibraryScriptEntry {
    id: string;
    title: string;
    characters: string[];
    voiceConfigs: any[];
}

export async function getLibraryScripts(): Promise<LibraryScriptEntry[]> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== ADMIN_EMAIL) {
        return [];
    }

    // 1. Get all public scripts
    const { data: scripts, error } = await supabase
        .from('scripts')
        .select('id, title, content')
        .eq('is_public', true)
        .order('title');

    if (error || !scripts) {
        console.error("Error fetching library scripts:", error);
        return [];
    }

    // 2. Get all voice configs for library scripts
    const { data: voiceConfigs } = await supabase
        .from('play_voice_config')
        .select('*')
        .eq('source_type', 'library_script');

    // 3. Merge
    const entries: LibraryScriptEntry[] = scripts.map(script => {
        const configs = voiceConfigs?.filter(vc => vc.source_id === script.id) || [];
        // Extract characters from JSON content
        const characters = (script.content as any)?.characters || [];

        return {
            id: script.id,
            title: script.title,
            characters: characters,
            voiceConfigs: configs
        };
    });

    return entries;
}
