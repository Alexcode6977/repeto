"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    saveLiveRawNote,
    submitLiveSessionFeedback,
    updateLiveSessionStatus,
} from "@/lib/features/live-session/live-session-gateway";
import type {
    LiveSessionPlay,
    LiveSessionScene,
    LiveSessionViewModel,
    SaveLiveRawNoteInput,
    SubmitLiveSessionFeedbackInput,
} from "@/lib/features/live-session/types";

function resolveSceneScriptIndex(play: LiveSessionPlay | null, scene: LiveSessionScene | null) {
    if (!play?.script_content || !scene) {
        return -1;
    }

    const explicitIndex = scene.order_index ?? scene.index;

    if (typeof explicitIndex === "number") {
        return explicitIndex;
    }

    return play.script_content.scenes.findIndex((scriptScene) => scriptScene.title === scene.title);
}

export function useLiveSessionScreen(initialViewModel: LiveSessionViewModel) {
    const router = useRouter();
    const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
    const [showFinishDialog, setShowFinishDialog] = useState(false);
    const [finalNotes, setFinalNotes] = useState("");
    const [isFinishing, setIsFinishing] = useState(false);
    const [notesRefreshKey, setNotesRefreshKey] = useState(0);

    const currentScene = initialViewModel.scenes[currentSceneIdx] || null;
    const currentPlay = useMemo(
        () => initialViewModel.plays.find((play) => play.id === currentScene?.playId) || null,
        [currentScene?.playId, initialViewModel.plays]
    );
    const globalSceneIndex = useMemo(
        () => resolveSceneScriptIndex(currentPlay, currentScene),
        [currentPlay, currentScene]
    );

    const handleSelectScene = useCallback((sceneIndex: number) => {
        setCurrentSceneIdx(sceneIndex);
    }, []);

    const handlePreviousScene = useCallback(() => {
        setCurrentSceneIdx((currentIndex) => Math.max(0, currentIndex - 1));
    }, []);

    const handleNextScene = useCallback(() => {
        if (currentSceneIdx < initialViewModel.scenes.length - 1) {
            setCurrentSceneIdx((currentIndex) => currentIndex + 1);
            return;
        }

        if (!initialViewModel.isReadOnly) {
            setShowFinishDialog(true);
        }
    }, [currentSceneIdx, initialViewModel.isReadOnly, initialViewModel.scenes.length]);

    const handleFinishSession = useCallback(async () => {
        setIsFinishing(true);

        try {
            await updateLiveSessionStatus(initialViewModel.sessionId, "processing");
            router.push(`/troupes/${initialViewModel.troupeId}/sessions/${initialViewModel.sessionId}`);
        } catch (error) {
            console.error(error);
        } finally {
            setIsFinishing(false);
        }
    }, [initialViewModel.sessionId, initialViewModel.troupeId, router]);

    const handleSaveRawNote = useCallback(async (input: SaveLiveRawNoteInput) => {
        await saveLiveRawNote(input);
        setNotesRefreshKey((currentKey) => currentKey + 1);
    }, []);

    const handleSubmitFeedback = useCallback(async (input: SubmitLiveSessionFeedbackInput) => {
        await submitLiveSessionFeedback(input);
    }, []);

    return {
        state: {
            sessionId: initialViewModel.sessionId,
            troupeId: initialViewModel.troupeId,
            scenes: initialViewModel.scenes,
            isReadOnly: initialViewModel.isReadOnly,
            currentSceneIdx,
            currentScene,
            currentPlay,
            globalSceneIndex,
            isFirstScene: currentSceneIdx === 0,
            isLastScene: currentSceneIdx === initialViewModel.scenes.length - 1,
            showFinishDialog,
            finalNotes,
            isFinishing,
            notesRefreshKey,
        },
        actions: {
            selectScene: handleSelectScene,
            goToPreviousScene: handlePreviousScene,
            goToNextScene: handleNextScene,
            setShowFinishDialog,
            setFinalNotes,
            finishSession: handleFinishSession,
            saveRawNote: handleSaveRawNote,
            submitFeedback: handleSubmitFeedback,
        },
    };
}
