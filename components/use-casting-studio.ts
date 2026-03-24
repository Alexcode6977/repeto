"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    getGoogleTTSVoices,
    synthesizeGoogleTTSPreview,
    type GoogleVoiceProfile,
} from "@/app/actions/google-tts";
import type { CastingStudioProps, CastingStudioViewProps } from "@/components/casting-studio.types";

const NARRATOR_KEY = "didascalies";
const NARRATOR_LABEL = "Didascalies (Narration)";
const VOICE_PREVIEW_TEXT = "Repetto est le compagnon idéal pour répéter mes textes de manière ludique, fluide et efficace, n'est-ce pas ?";

function matchesVoiceAssignment(voice: GoogleVoiceProfile, assignedVoice?: string) {
    return assignedVoice === voice.id
        || assignedVoice === voice.name
        || assignedVoice === `fr-FR-Chirp3-HD-${voice.name}`;
}

export function useCastingStudio(props: CastingStudioProps): CastingStudioViewProps {
    const [voices, setVoices] = useState<GoogleVoiceProfile[]>([]);
    const [search, setSearch] = useState("");
    const [voiceAssignments, setVoiceAssignments] = useState<Record<string, string>>(props.initialAssignments);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"characters" | "voices">("characters");
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setVoiceAssignments(props.initialAssignments);
    }, [props.initialAssignments]);

    useEffect(() => {
        const loadVoices = async () => {
            setIsLoading(true);
            try {
                const data = await getGoogleTTSVoices();
                setVoices(data);
            } finally {
                setIsLoading(false);
            }
        };

        void loadVoices();

        return () => {
            audioRef.current?.pause();
        };
    }, []);

    const slotKeys = useMemo(() => [NARRATOR_KEY, ...props.characters], [props.characters]);
    const totalCount = slotKeys.length;
    const assignedCount = slotKeys.filter((key) => Boolean(voiceAssignments[key])).length;
    const remainingCount = totalCount - assignedCount;

    const getSlotDisplayName = (slot: string) => (slot === NARRATOR_KEY ? NARRATOR_LABEL : slot);

    const activeCharacter = useMemo(() => {
        if (selectedCharacter && slotKeys.includes(selectedCharacter)) {
            return selectedCharacter;
        }
        return slotKeys.find((slot) => !voiceAssignments[slot]) || slotKeys[0] || null;
    }, [selectedCharacter, slotKeys, voiceAssignments]);

    const activeCharacterVoice = activeCharacter
        ? voices.find((voice) => matchesVoiceAssignment(voice, voiceAssignments[activeCharacter]))
        : undefined;

    const filteredVoices = voices.filter((voice) =>
        voice.name.toLowerCase().includes(search.toLowerCase())
        || voice.description.toLowerCase().includes(search.toLowerCase())
    );

    const onTestVoice = async (voiceId: string) => {
        setPreviewError(null);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (playingVoiceId === voiceId) {
            setPlayingVoiceId(null);
            return;
        }

        setPlayingVoiceId(voiceId);

        const playAudioWithRetry = async (audioUrl: string, retries = 2): Promise<boolean> => {
            if (!audioUrl) {
                return false;
            }

            for (let attempt = 0; attempt <= retries; attempt += 1) {
                try {
                    const audio = new Audio(audioUrl);
                    audio.preload = "auto";
                    audioRef.current = audio;
                    audio.onended = () => setPlayingVoiceId(null);
                    await audio.play();
                    return true;
                } catch {
                    if (attempt === retries) {
                        return false;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
                }
            }

            return false;
        };

        try {
            const result = await synthesizeGoogleTTSPreview(voiceId, VOICE_PREVIEW_TEXT);
            if (!result) {
                setPreviewError("Erreur lors de la génération de l'audio.");
                setPlayingVoiceId(null);
                return;
            }

            const played = await playAudioWithRetry(result);
            if (played) {
                return;
            }
        } catch {
            setPreviewError("Pré-écoute indisponible pour le moment.");
            setPlayingVoiceId(null);
            return;
        }

        setPlayingVoiceId(null);
    };

    const onAssignVoice = (voiceId: string) => {
        if (!activeCharacter) {
            return;
        }

        setVoiceAssignments((currentAssignments) => ({
            ...currentAssignments,
            [activeCharacter]: voiceId,
        }));

        const currentIndex = slotKeys.indexOf(activeCharacter);
        const orderedSlots = [...slotKeys.slice(currentIndex + 1), ...slotKeys.slice(0, currentIndex + 1)];
        const nextSlot = orderedSlots.find((slot) => !voiceAssignments[slot] && slot !== activeCharacter);

        if (nextSlot) {
            setSelectedCharacter(nextSlot);
        }
    };

    return {
        ...props,
        voices,
        search,
        voiceAssignments,
        isLoading,
        activeTab,
        selectedCharacter,
        previewError,
        playingVoiceId,
        slotKeys,
        totalCount,
        assignedCount,
        remainingCount,
        activeCharacter,
        filteredVoices,
        activeCharacterVoice,
        getSlotDisplayName,
        onSearchChange: setSearch,
        onSelectCharacter: (slot) => {
            setSelectedCharacter(slot);
            setActiveTab("voices");
        },
        onSetActiveTab: setActiveTab,
        onAssignVoice,
        onTestVoice,
    };
}
