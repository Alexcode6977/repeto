export type ScriptLineType = 'dialogue' | 'stage_direction' | 'scene_heading';

export interface ScriptLine {
    id: string;
    character: string;
    text: string;
    type: ScriptLineType;
}

export interface ScriptScene {
    index: number; // Index in the lines array
    title: string;
}

export interface ScriptCollectiveMapping {
    label: string;
    members: string[];
}

export interface ScriptSceneCollectiveMapping extends ScriptCollectiveMapping {
    scene_index: number;
}

export interface ScriptMappings {
    canonical_characters: string[];
    aliases: Record<string, string>;
    collectives: {
        global: ScriptCollectiveMapping[];
        by_scene: ScriptSceneCollectiveMapping[];
    };
}

export interface ParsedScript {
    title?: string;
    lines: ScriptLine[];
    characters: string[];
    scenes: ScriptScene[];
    schema_version?: number;
    mappings?: ScriptMappings;
}

export interface ScriptMetadata {
    id: string;
    title: string;
    created_at: string;
    characterCount: number;
    lineCount: number;
    is_public: boolean;
    is_owner: boolean;
    hasVoiceConfig?: boolean;
}

export type SessionStatus = 'preparation' | 'upcoming' | 'processing' | 'validated';

export interface SessionRawNote {
    id: string;
    event_id: string;
    play_id: string;
    scene_index: number;
    line_index?: number;
    text: string;
    created_at: string;
    created_by?: string;
}

export interface SessionSegment {
    playId: string;
    playTitle: string;
    segmentNote: string;
    characterNotes: Record<string, string>; // characterId -> note
    scenes: any[]; // The selected scenes
}

export interface SessionPlanStructure {
    objective: string;
    segments: SessionSegment[];
}

export type AnnotationContext =
    | { type: 'none' }
    | { type: 'act', title: string, index: number }
    | { type: 'scene', title: string, index: number }
    | { type: 'line', lineIndex: number, lineContent: string, character: string, sceneIndex: number };
