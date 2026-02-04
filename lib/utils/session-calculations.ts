
import { SessionSegment } from "@/lib/types";

// Map: CharacterId -> Actor (User/Guest Object)
export const createActorMap = (plays: any[], members: any[], guests: any[]) => {
    const map: Record<string, any> = {};
    plays?.forEach((play: any) => {
        play.play_characters?.forEach((char: any) => {
            const actorId = char.actor_id || char.guest_id;
            if (actorId) {
                const member = members.find((m: any) => (m.user_id || m.id) === actorId);
                const guest = guests.find((g: any) => g.id === actorId);
                if (member || guest) {
                    map[char.id] = member || guest;
                }
            }
        });
    });
    return map;
};

// Workload Calculation (Presence Ratio)
export const calculateSessionWorkload = (segments: SessionSegment[], plays: any[], actorMap: Record<string, any>) => {
    // 1. Calculate duration (lines) for each scene in the available plays
    const sceneDurations: Record<string, number> = {};
    const scenePresence: Record<string, Set<string>> = {}; // SceneId -> Set of ActorIds present

    plays?.forEach((play: any) => {
        if (!play.lineStats) console.warn(`Play ${play.title} has no lineStats`);

        play.lineStats?.forEach((stat: any) => {
            // Add to scene total duration
            sceneDurations[stat.scene_id] = (sceneDurations[stat.scene_id] || 0) + stat.line_count;

            // Record actor presence if they have lines
            const actor = actorMap[stat.character_id];
            if (actor && stat.line_count > 0) {
                const actorId = actor.user_id || actor.id;
                if (!scenePresence[stat.scene_id]) scenePresence[stat.scene_id] = new Set();
                scenePresence[stat.scene_id].add(actorId);
            }
        });
    });

    // 2. Calculate Total Session Duration & Actor Presence Duration
    let totalSessionDuration = 0;
    const actorPresenceDuration: Record<string, number> = {};

    segments?.forEach(segment => {
        segment.scenes.forEach((scene: any) => {
            const duration = sceneDurations[scene.id] || 0;

            if (duration === 0) return;

            totalSessionDuration += duration;

            // Add duration to all actors present in this scene
            const actorsInScene = scenePresence[scene.id];
            if (actorsInScene) {
                actorsInScene.forEach(actorId => {
                    actorPresenceDuration[actorId] = (actorPresenceDuration[actorId] || 0) + duration;
                });
            }
        });
    });

    // 3. Calculate Percentages
    const percentages: Record<string, number> = {};
    if (totalSessionDuration === 0) return percentages;

    Object.keys(actorPresenceDuration).forEach(actorId => {
        percentages[actorId] = (actorPresenceDuration[actorId] / totalSessionDuration) * 100;
    });

    return percentages;
};
