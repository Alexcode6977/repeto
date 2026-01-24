"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SessionStatsData {
    scriptId?: string;
    scriptTitle: string;
    characterName: string;
    startTime: Date;
    endTime: Date;
    durationSeconds: number;
    linesTotal: number;
    linesRehearsed: number;
    completionPercentage: number;
    mode: string;
}

export async function saveSessionStats(data: SessionStatsData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non authentifié" };

    try {
        const { error } = await supabase.from("rehearsal_sessions").insert({
            user_id: user.id,
            script_id: data.scriptId || null,
            script_title: data.scriptTitle,
            character_name: data.characterName,
            start_time: data.startTime.toISOString(),
            end_time: data.endTime.toISOString(),
            duration_seconds: data.durationSeconds,
            lines_total: data.linesTotal,
            lines_rehearsed: data.linesRehearsed,
            completion_percentage: data.completionPercentage,
            mode: data.mode
        });

        if (error) {
            console.error("Error saving session stats:", error);
            return { error: "Erreur lors de la sauvegarde" };
        }

        revalidatePath("/stats");
        return { success: true };
    } catch (e) {
        console.error("Exception saving stats:", e);
        return { error: "Exception interne" };
    }
}

export async function getUserStats(period: '7days' | '30days' | 'all' = 'all') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Return empty stats for unauthenticated (should not happen in protected)
        return {
            totalTimeSeconds: 0,
            totalSessions: 0,
            streakDays: 0,
            activityData: [],
            recentPlays: []
        };
    }

    // 1. Fetch raw sessions
    let query = supabase
        .from("rehearsal_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false });

    if (period === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        query = query.gte("start_time", d.toISOString());
    } else if (period === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        query = query.gte("start_time", d.toISOString());
    }

    const { data: sessions, error } = await query;

    if (error || !sessions) {
        console.error("Error fetching stats:", error);
        return {
            totalTimeSeconds: 0,
            totalSessions: 0,
            streakDays: 0,
            activityData: [],
            recentPlays: []
        };
    }

    // 2. Aggregate Data

    // Total KPIs
    const totalSessions = sessions.length;
    const totalTimeSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

    // Activity Chart Data (Group by date)
    // We want a consistent chart, e.g. every day of the period
    const activityMap = new Map<string, number>();
    sessions.forEach(s => {
        const date = new Date(s.start_time).toLocaleDateString('fr-FR'); // simplified date key
        const dur = s.duration_seconds || 0;
        activityMap.set(date, (activityMap.get(date) || 0) + dur);
    });

    // Convert map to array for Recharts
    // Note: For 'all', we might want to just show days with activity or last X days.
    // For simplicity, we just return the days present in data for now, sorted.
    // Ideally we fill empty days if it's '7days'.
    const activityData = Array.from(activityMap.entries())
        .map(([date, duration]) => ({ date, minutes: Math.round(duration / 60) }))
        .reverse(); // old to new (approx) - actually map entries order is insertion order usually but better to sort.

    // Recent Plays (Grouped by script_title/id)
    const playsMap = new Map<string, {
        scriptId: string | null,
        title: string,
        lastPlayed: string,
        totalSeconds: number,
        sessionsCount: number,
        avgCompletion: number
    }>();

    sessions.forEach(s => {
        // Key by ID if available, else Title
        const key = s.script_id || s.script_title;
        if (!playsMap.has(key)) {
            playsMap.set(key, {
                scriptId: s.script_id,
                title: s.script_title,
                lastPlayed: s.start_time,
                totalSeconds: 0,
                sessionsCount: 0,
                avgCompletion: 0 // temp sum
            });
        }
        const entry = playsMap.get(key)!;
        entry.totalSeconds += (s.duration_seconds || 0);
        entry.sessionsCount += 1;
        entry.avgCompletion += (s.completion_percentage || 0);
    });

    const recentPlays = Array.from(playsMap.values()).map(p => ({
        ...p,
        avgCompletion: Math.round(p.avgCompletion / p.sessionsCount)
    }));


    // Streak Calculation (simplified)
    // Check consecutive days backwards from today
    let streak = 0;
    // TODO: Implement robust streak if needed.

    return {
        totalTimeSeconds,
        totalSessions,
        streakDays: streak,
        activityData: activityData, // We need to sort this properly by date
        recentPlays
    };
}
