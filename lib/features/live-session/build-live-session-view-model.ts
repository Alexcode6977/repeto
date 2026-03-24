import type {
    LiveSessionData,
    LiveSessionPlanRecord,
    LiveSessionPlay,
    LiveSessionPlayScene,
    LiveSessionScene,
    LiveSessionViewModel,
} from "@/lib/features/live-session/types";

interface BuildLiveSessionViewModelInput {
    sessionData: LiveSessionData;
    isReadOnly: boolean;
}

function getPrimaryPlan(sessionData: LiveSessionData): LiveSessionPlanRecord | null {
    if (!sessionData.session_plans) {
        return null;
    }

    if (Array.isArray(sessionData.session_plans)) {
        return sessionData.session_plans[0] || null;
    }

    return sessionData.session_plans;
}

function findPlayScene(play: LiveSessionPlay | undefined, sceneRecord: Record<string, unknown>): LiveSessionPlayScene | undefined {
    if (!play?.play_scenes?.length) {
        return undefined;
    }

    return play.play_scenes.find((playScene) => (
        (sceneRecord.id && playScene.id === sceneRecord.id)
        || (sceneRecord.title && playScene.title === sceneRecord.title)
    ));
}

function resolvePlayForScene(sceneRecord: Record<string, unknown>, plays: LiveSessionPlay[]) {
    const explicitPlayId = typeof sceneRecord.playId === "string"
        ? sceneRecord.playId
        : typeof sceneRecord.play_id === "string"
            ? sceneRecord.play_id
            : undefined;

    if (explicitPlayId) {
        return plays.find((play) => play.id === explicitPlayId);
    }

    const explicitPlayTitle = typeof sceneRecord.playTitle === "string"
        ? sceneRecord.playTitle
        : typeof sceneRecord.play_title === "string"
            ? sceneRecord.play_title
            : undefined;

    if (explicitPlayTitle) {
        return plays.find((play) => play.title === explicitPlayTitle);
    }

    return plays.find((play) => play.play_scenes?.some((playScene) => (
        (sceneRecord.id && playScene.id === sceneRecord.id)
        || (sceneRecord.title && playScene.title === sceneRecord.title)
    )));
}

function normalizeScene(
    rawScene: Record<string, unknown>,
    plays: LiveSessionPlay[],
    fallbackPlayId?: string,
    fallbackPlayTitle?: string
): LiveSessionScene | null {
    const play = resolvePlayForScene(
        {
            ...rawScene,
            playId: rawScene.playId || rawScene.play_id || fallbackPlayId,
            playTitle: rawScene.playTitle || rawScene.play_title || fallbackPlayTitle,
        },
        plays
    );
    const playScene = findPlayScene(play, rawScene);
    const title = typeof rawScene.title === "string" && rawScene.title.trim()
        ? rawScene.title
        : typeof playScene?.title === "string" && playScene.title.trim()
            ? playScene.title
            : "Scène";

    return {
        ...rawScene,
        title,
        playId: play?.id || fallbackPlayId || (typeof rawScene.playId === "string" ? rawScene.playId : "") || "",
        playTitle: play?.title || fallbackPlayTitle || (typeof rawScene.playTitle === "string" ? rawScene.playTitle : undefined),
        scene_characters: Array.isArray(rawScene.scene_characters)
            ? rawScene.scene_characters
            : playScene?.scene_characters || [],
        playCharacters: Array.isArray(rawScene.playCharacters)
            ? rawScene.playCharacters
            : play?.play_characters || [],
    };
}

export function buildLiveSessionScenes(sessionData: LiveSessionData): LiveSessionScene[] {
    const plays = sessionData.plays || [];
    const plan = getPrimaryPlan(sessionData);

    if (!plan) {
        return [];
    }

    if (plan.plan_structure?.segments?.length) {
        return plan.plan_structure.segments.flatMap((segment) => (
            segment.scenes.flatMap((sceneRecord) => {
                const normalizedScene = normalizeScene(sceneRecord, plays, segment.playId, segment.playTitle);
                return normalizedScene ? [normalizedScene] : [];
            })
        ));
    }

    return (plan.selected_scenes || []).flatMap((sceneRecord) => {
        if (!sceneRecord || typeof sceneRecord !== "object") {
            return [];
        }

        const normalizedScene = normalizeScene(sceneRecord, plays);
        return normalizedScene ? [normalizedScene] : [];
    });
}

export function buildLiveSessionViewModel({
    sessionData,
    isReadOnly,
}: BuildLiveSessionViewModelInput): LiveSessionViewModel {
    return {
        sessionId: sessionData.id,
        troupeId: sessionData.troupe_id,
        plays: sessionData.plays || [],
        scenes: buildLiveSessionScenes(sessionData),
        isReadOnly,
    };
}
