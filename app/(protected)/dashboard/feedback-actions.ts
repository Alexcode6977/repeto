"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface SubmitFeedbackParams {
    scriptId?: string;
    scriptTitle: string;
    characterName: string | string[];
    durationSeconds: number;
    linesRehearsed: number;
    completionPercentage: number;
    settings: Record<string, unknown>;
    rating: number;
    whatWorked: string;
    whatDidntWork: string;
    improvementIdeas: string;
}

export async function submitFeedback(params: SubmitFeedbackParams) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Not authenticated");
    }

    // Detect device type from user agent (simplified)
    const deviceType = "desktop"; // In a real scenario, pass from client

    const { error } = await supabase.from("rehearsal_feedback").insert({
        user_id: user.id,
        script_id: params.scriptId || null,
        script_title: params.scriptTitle,
        character_name: Array.isArray(params.characterName) ? params.characterName.join(", ") : params.characterName,
        duration_seconds: params.durationSeconds,
        lines_rehearsed: params.linesRehearsed,
        completion_percentage: params.completionPercentage,
        settings: params.settings,
        rating: params.rating,
        what_worked: params.whatWorked,
        what_didnt_work: params.whatDidntWork,
        improvement_ideas: params.improvementIdeas,
        device_type: deviceType,
        app_version: "1.0.0-beta",
    });

    if (error) {
        console.error("Error submitting feedback:", error);
        throw new Error("Failed to submit feedback");
    }

    revalidatePath("/profile");
    return { success: true };
}

export interface FeedbackEntry {
    id: string;
    script_title: string;
    character_name: string;
    rating: number;
    what_worked: string;
    what_didnt_work: string;
    improvement_ideas: string;
    duration_seconds: number;
    created_at: string;
}

export async function getFeedbackHistory(): Promise<FeedbackEntry[]> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from("rehearsal_feedback")
        .select("id, script_title, character_name, rating, what_worked, what_didnt_work, improvement_ideas, duration_seconds, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching feedback history:", error);
        return [];
    }

    return data || [];
}

export async function getFeedbackStats() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { totalSessions: 0, averageRating: 0, totalDuration: 0 };
    }

    const { data, error } = await supabase
        .from("rehearsal_feedback")
        .select("rating, duration_seconds")
        .eq("user_id", user.id);

    if (error || !data || data.length === 0) {
        return { totalSessions: 0, averageRating: 0, totalDuration: 0 };
    }

    const totalSessions = data.length;
    const averageRating = data.reduce((sum, f) => sum + f.rating, 0) / totalSessions;
    const totalDuration = data.reduce((sum, f) => sum + (f.duration_seconds || 0), 0);

    return {
        totalSessions,
        averageRating: Math.round(averageRating * 10) / 10,
        totalDuration,
    };
}
