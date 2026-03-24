import { canManageSessions } from "@/lib/utils/roles";

import { createClient } from "@/lib/supabase/server";
import type { SessionStatus } from "@/lib/types";

type LiveSessionServiceClient = Awaited<ReturnType<typeof createClient>>;

function normalizeName(name: string): string {
    return (name || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");
}

function calculateLineStats(play: any) {
    if (!play.script_content || !play.play_scenes || !play.play_characters) {
        return [];
    }

    const script = play.script_content;
    const lines = script.lines || [];
    const dbScenes = play.play_scenes;
    const dbCharacters = play.play_characters;

    const charMap = new Map<string, string>();
    dbCharacters.forEach((character: any) => {
        charMap.set(normalizeName(character.name), character.id);
    });

    const sortedDbScenes = [...dbScenes].sort(
        (left: any, right: any) => (left.order_index || 0) - (right.order_index || 0)
    );

    let currentDbSceneIndex = -1;
    let currentSceneId: string | null = null;

    const statsMap = new Map<string, number>();

    lines.forEach((line: any) => {
        if (line.type === "scene_heading") {
            currentDbSceneIndex += 1;
            if (currentDbSceneIndex < sortedDbScenes.length) {
                currentSceneId = sortedDbScenes[currentDbSceneIndex].id;
            } else {
                currentSceneId = null;
            }
            return;
        }

        if (line.type !== "dialogue" || !currentSceneId) {
            return;
        }

        const characterId = charMap.get(normalizeName(line.character));
        if (!characterId) {
            return;
        }

        const key = `${currentSceneId}|${characterId}`;
        statsMap.set(key, (statsMap.get(key) || 0) + 1);
    });

    const result: any[] = [];
    statsMap.forEach((count, key) => {
        const [scene_id, character_id] = key.split("|");
        result.push({
            scene_id,
            character_id,
            line_count: count,
        });
    });

    return result;
}

async function resolveSessionManagerScopeByEventId(
    supabase: LiveSessionServiceClient,
    eventId: string,
    userId?: string | null
) {
    if (!userId) {
        return null;
    }

    const { data: event } = await supabase
        .from("events")
        .select("troupe_id")
        .eq("id", eventId)
        .single();

    if (!event?.troupe_id) {
        return null;
    }

    const { data: membership } = await supabase
        .from("troupe_members")
        .select("roles")
        .eq("troupe_id", event.troupe_id)
        .eq("user_id", userId)
        .maybeSingle();

    if (!canManageSessions(membership?.roles)) {
        return null;
    }

    return {
        userId,
        troupeId: event.troupe_id as string,
        roles: membership?.roles || [],
    };
}

async function requireSessionManagerByEventId(
    supabase: LiveSessionServiceClient,
    eventId: string,
    userId?: string | null
) {
    const scope = await resolveSessionManagerScopeByEventId(supabase, eventId, userId);
    if (!scope) {
        throw new Error("Forbidden");
    }
    return scope;
}

async function requireSessionManagerByRawNoteId(
    supabase: LiveSessionServiceClient,
    noteId: string,
    userId?: string | null
) {
    const { data: note } = await supabase
        .from("session_raw_notes")
        .select("event_id")
        .eq("id", noteId)
        .single();

    if (!note?.event_id) {
        throw new Error("Note introuvable");
    }

    return requireSessionManagerByEventId(supabase, note.event_id, userId);
}

export async function getLiveSessionDetails(
    supabase: LiveSessionServiceClient,
    eventId: string
) {
    const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
        console.error("Error fetching event:", eventError);
        return null;
    }

    const { data: allPlays, error: playsError } = await supabase
        .from("plays")
        .select(`
            id,
            title,
            script_content,
            play_characters(*),
            play_scenes(
                *,
                scene_characters(character_id)
            )
        `)
        .eq("troupe_id", event.troupe_id);

    if (playsError) {
        console.error("Error fetching troupe plays:", playsError);
        return null;
    }

    const { data: complementaryData, error: compError } = await supabase
        .from("events")
        .select(`
            event_attendance(
                *,
                profiles(first_name, email),
                troupe_guests(id, name)
            ),
            session_plans(*)
        `)
        .eq("id", eventId)
        .single();

    if (compError) {
        console.error("Error fetching complementary details:", compError);
        return null;
    }

    const playsWithStats = allPlays.map((play: any) => {
        try {
            return {
                ...play,
                lineStats: calculateLineStats(play),
            };
        } catch (error) {
            console.error(`Error calculating stats for play ${play.title}:`, error);
            return {
                ...play,
                lineStats: [],
            };
        }
    });

    return {
        ...event,
        ...complementaryData,
        plays: playsWithStats,
    };
}

export async function saveSessionPlanRecord(
    supabase: LiveSessionServiceClient,
    userId: string,
    eventId: string,
    selectedScenes: any[],
    notes = "",
    status: SessionStatus = "preparation",
    planStructure?: any,
    title?: string
) {
    await requireSessionManagerByEventId(supabase, eventId, userId);

    const uniqueScenesMap = new Map();
    selectedScenes.forEach((scene: any) => {
        const sceneId = typeof scene === "string" ? scene : scene.id;
        if (!uniqueScenesMap.has(sceneId)) {
            uniqueScenesMap.set(sceneId, scene);
        }
    });
    const uniqueScenes = Array.from(uniqueScenesMap.values());

    const updateData: any = {
        event_id: eventId,
        selected_scenes: uniqueScenes,
        general_notes: notes,
        status,
        updated_at: new Date().toISOString(),
    };

    if (planStructure) {
        updateData.plan_structure = planStructure;
    }

    if (status === "upcoming") {
        updateData.published_at = new Date().toISOString();
    }

    const { error: planError } = await supabase
        .from("session_plans")
        .upsert(updateData);

    if (planError) {
        console.error("Error saving session plan:", planError);
        throw new Error("Failed to save session plan");
    }

    if (!title) {
        return;
    }

    const { error: eventError } = await supabase
        .from("events")
        .update({ title })
        .eq("id", eventId);

    if (eventError) {
        console.error("Error updating event title:", eventError);
    }
}

export async function updateLiveSessionStatus(
    supabase: LiveSessionServiceClient,
    userId: string,
    eventId: string,
    status: SessionStatus
) {
    await requireSessionManagerByEventId(supabase, eventId, userId);

    const { error } = await supabase
        .from("session_plans")
        .update({
            status,
            updated_at: new Date().toISOString(),
            ...(status === "upcoming" ? { published_at: new Date().toISOString() } : {}),
        })
        .eq("event_id", eventId);

    if (error) {
        console.error("Error updating session status:", error);
        throw new Error("Failed to update session status");
    }
}

export async function saveLiveRawNoteRecord(
    supabase: LiveSessionServiceClient,
    userId: string,
    eventId: string,
    playId: string,
    sceneIndex: number,
    text: string,
    lineIndex?: number,
    context?: any
) {
    await requireSessionManagerByEventId(supabase, eventId, userId);

    const { error } = await supabase
        .from("session_raw_notes")
        .insert({
            event_id: eventId,
            play_id: playId,
            scene_index: sceneIndex,
            line_index: lineIndex,
            text,
            context,
        });

    if (error) {
        console.error("Error saving raw note:", error);
        throw new Error("Failed to save raw note");
    }
}

export async function listLiveRawNotes(
    supabase: LiveSessionServiceClient,
    eventId: string,
    userId?: string | null
) {
    const scope = await resolveSessionManagerScopeByEventId(supabase, eventId, userId);
    if (!scope) {
        return [];
    }

    const { data, error } = await supabase
        .from("session_raw_notes")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching raw notes:", error);
        return [];
    }

    return data;
}

export async function updateLiveRawNoteRecord(
    supabase: LiveSessionServiceClient,
    userId: string,
    noteId: string,
    text: string
) {
    await requireSessionManagerByRawNoteId(supabase, noteId, userId);

    const { error } = await supabase
        .from("session_raw_notes")
        .update({ text })
        .eq("id", noteId);

    if (error) {
        console.error("Error updating raw note:", error);
        throw new Error("Failed to update raw note");
    }
}

export async function deleteLiveRawNoteRecord(
    supabase: LiveSessionServiceClient,
    userId: string,
    noteId: string
) {
    await requireSessionManagerByRawNoteId(supabase, noteId, userId);

    const { error } = await supabase
        .from("session_raw_notes")
        .delete()
        .eq("id", noteId);

    if (error) {
        console.error("Error deleting raw note:", error);
        throw new Error("Failed to delete raw note");
    }
}

export async function createSessionFeedback(
    supabase: LiveSessionServiceClient,
    userId: string,
    eventId: string,
    characterId: string,
    text: string,
    actorId?: string,
    guestId?: string,
    status: "pending" | "published" = "published"
) {
    await requireSessionManagerByEventId(supabase, eventId, userId);

    const { error } = await supabase
        .from("rehearsal_feedbacks")
        .insert({
            event_id: eventId,
            character_id: characterId,
            actor_id: actorId,
            guest_id: guestId,
            text,
            status,
        });

    if (error) {
        console.error("Error submiting feedback:", error);
        throw new Error("Failed to submit feedback");
    }
}

export async function publishPendingSessionFeedbacks(
    supabase: LiveSessionServiceClient,
    userId: string,
    eventId: string
) {
    await requireSessionManagerByEventId(supabase, eventId, userId);

    const { error } = await supabase
        .from("rehearsal_feedbacks")
        .update({ status: "published" })
        .eq("event_id", eventId)
        .eq("status", "pending");

    if (error) {
        console.error("Error publishing feedbacks:", error);
        throw new Error("Failed to publish feedbacks");
    }
}
