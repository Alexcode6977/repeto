import {
    getRawNotes,
    getSessionDetails,
    saveRawNote,
    submitSessionFeedback,
    updateSessionStatus,
} from "@/lib/actions/session";
import type {
    LiveSessionData,
    LiveSessionRawNote,
    SaveLiveRawNoteInput,
    SubmitLiveSessionFeedbackInput,
} from "@/lib/features/live-session/types";
import type { SessionStatus } from "@/lib/types";

export async function getLiveSessionDetails(eventId: string): Promise<LiveSessionData | null> {
    return await getSessionDetails(eventId);
}

export async function updateLiveSessionStatus(eventId: string, status: SessionStatus) {
    await updateSessionStatus(eventId, status);
}

export async function saveLiveRawNote(input: SaveLiveRawNoteInput) {
    await saveRawNote(
        input.eventId,
        input.playId,
        input.sceneIndex,
        input.text,
        input.lineIndex,
        input.context
    );
}

export async function getLiveSessionRawNotes(eventId: string): Promise<LiveSessionRawNote[]> {
    return await getRawNotes(eventId);
}

export async function submitLiveSessionFeedback(input: SubmitLiveSessionFeedbackInput) {
    await submitSessionFeedback(
        input.eventId,
        input.characterId,
        input.text,
        input.actorId,
        input.guestId,
        input.status || "published"
    );
}
