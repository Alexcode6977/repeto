"use client";

import type { GoogleVoiceProfile } from "@/app/actions/google-tts";

export interface CastingStudioProps {
    scriptId: string;
    characters: string[];
    initialAssignments: Record<string, string>;
    onSave?: () => void;
    onClose: () => void;
}

export interface CastingStudioViewProps extends CastingStudioProps {
    voices: GoogleVoiceProfile[];
    search: string;
    voiceAssignments: Record<string, string>;
    isLoading: boolean;
    activeTab: "characters" | "voices";
    selectedCharacter: string | null;
    previewError: string | null;
    playingVoiceId: string | null;
    slotKeys: string[];
    totalCount: number;
    assignedCount: number;
    remainingCount: number;
    activeCharacter: string | null;
    filteredVoices: GoogleVoiceProfile[];
    activeCharacterVoice?: GoogleVoiceProfile;
    getSlotDisplayName: (slot: string) => string;
    onSearchChange: (value: string) => void;
    onSelectCharacter: (slot: string) => void;
    onSetActiveTab: (tab: "characters" | "voices") => void;
    onAssignVoice: (voiceId: string) => void;
    onTestVoice: (voiceId: string) => Promise<void>;
}
