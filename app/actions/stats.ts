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
    // Detailed metrics
    linesValidatedFirstTry?: number;
    linesWrong?: number;
    linesSkipped?: number;
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
            mode: data.mode,
            // Detailed metrics
            lines_validated_first_try: data.linesValidatedFirstTry || 0,
            lines_wrong: data.linesWrong || 0,
            lines_skipped: data.linesSkipped || 0
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

// ============================================
// PHASE 2: Line Error Tracking
// ============================================

export interface LineErrorData {
    sessionId?: string;
    scriptId?: string;
    lineIndex: number;
    lineText: string;
    characterName: string;
    errorType: 'skip' | 'timeout' | 'mismatch';
}

/**
 * Save line errors to the database
 */
export async function saveLineErrors(errors: LineErrorData[]) {
    if (!errors || errors.length === 0) return { success: true };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non authentifié" };

    try {
        const insertData = errors.map(e => ({
            user_id: user.id,
            session_id: e.sessionId || null,
            script_id: e.scriptId || null,
            line_index: e.lineIndex,
            line_text: e.lineText,
            character_name: e.characterName,
            error_type: e.errorType
        }));

        const { error } = await supabase
            .from("rehearsal_line_errors")
            .insert(insertData);

        if (error) {
            console.error("Error saving line errors:", error);
            return { error: "Erreur lors de la sauvegarde des erreurs" };
        }

        return { success: true };
    } catch (e) {
        console.error("Exception saving line errors:", e);
        return { error: "Exception interne" };
    }
}

/**
 * Get line error statistics for a character in a play
 * Returns the most frequently missed lines
 */
export async function getCharacterLineErrors(scriptId: string, characterName?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    try {
        let query = supabase
            .from("rehearsal_line_errors")
            .select("line_index, line_text, character_name, error_type")
            .eq("user_id", user.id)
            .eq("script_id", scriptId);

        if (characterName) {
            query = query.eq("character_name", characterName);
        }

        const { data: errors, error } = await query;

        if (error || !errors) {
            console.error("Error fetching line errors:", error);
            return [];
        }

        // Aggregate by line_index
        const lineMap = new Map<number, {
            lineIndex: number;
            lineText: string;
            characterName: string;
            errorCount: number;
            errorTypes: Record<string, number>;
        }>();

        errors.forEach(e => {
            if (!lineMap.has(e.line_index)) {
                lineMap.set(e.line_index, {
                    lineIndex: e.line_index,
                    lineText: e.line_text || "",
                    characterName: e.character_name || "",
                    errorCount: 0,
                    errorTypes: {}
                });
            }
            const entry = lineMap.get(e.line_index)!;
            entry.errorCount++;
            entry.errorTypes[e.error_type] = (entry.errorTypes[e.error_type] || 0) + 1;
        });

        // Sort by error count (most errors first) and return top 10
        return Array.from(lineMap.values())
            .sort((a, b) => b.errorCount - a.errorCount)
            .slice(0, 10);

    } catch (e) {
        console.error("Exception fetching line errors:", e);
        return [];
    }
}

