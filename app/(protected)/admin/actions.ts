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
