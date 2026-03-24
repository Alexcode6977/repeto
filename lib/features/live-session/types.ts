import type { ParsedScript, SessionStatus } from "@/lib/types";

export interface LiveSessionNoteContext {
    lineText?: string;
    characterName?: string;
    [key: string]: unknown;
}

export interface LiveSessionRawNote {
    id: string;
    event_id: string;
    play_id: string;
    scene_index: number;
    line_index?: number | null;
    text: string;
    created_at: string;
    context?: LiveSessionNoteContext | null;
}

export interface LiveSessionPlayCharacter {
    id: string;
    name: string;
    actor_id?: string | null;
    guest_id?: string | null;
    [key: string]: unknown;
}

export interface LiveSessionSceneCharacter {
    character_id: string;
}

export interface LiveSessionPlayScene {
    id?: string;
    title?: string;
    scene_characters?: LiveSessionSceneCharacter[];
    [key: string]: unknown;
}

export interface LiveSessionPlay {
    id: string;
    title: string;
    script_content?: ParsedScript | null;
    play_characters?: LiveSessionPlayCharacter[];
    play_scenes?: LiveSessionPlayScene[];
    lineStats?: unknown[];
    [key: string]: unknown;
}

export interface LiveSessionScene {
    id?: string;
    title: string;
    playId: string;
    playTitle?: string;
    order_index?: number | null;
    index?: number | null;
    scene_characters: LiveSessionSceneCharacter[];
    playCharacters: LiveSessionPlayCharacter[];
    [key: string]: unknown;
}

export interface LiveSessionPlanSegment {
    playId: string;
    playTitle?: string;
    scenes: Array<Record<string, unknown>>;
}

export interface LiveSessionPlanStructure {
    segments?: LiveSessionPlanSegment[] | null;
}

export interface LiveSessionPlanRecord {
    selected_scenes?: Array<string | Record<string, unknown>> | null;
    plan_structure?: LiveSessionPlanStructure | null;
    status?: SessionStatus;
}

export interface LiveSessionData {
    id: string;
    troupe_id: string;
    plays: LiveSessionPlay[];
    session_plans?: LiveSessionPlanRecord[] | LiveSessionPlanRecord | null;
    [key: string]: unknown;
}

export interface LiveSessionViewModel {
    sessionId: string;
    troupeId: string;
    plays: LiveSessionPlay[];
    scenes: LiveSessionScene[];
    isReadOnly: boolean;
}

export interface SaveLiveRawNoteInput {
    eventId: string;
    playId: string;
    sceneIndex: number;
    text: string;
    lineIndex?: number;
    context?: LiveSessionNoteContext;
}

export interface SubmitLiveSessionFeedbackInput {
    eventId: string;
    characterId: string;
    text: string;
    actorId?: string;
    guestId?: string;
    status?: "pending" | "published";
}
