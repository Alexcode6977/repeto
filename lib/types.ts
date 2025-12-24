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
    act?: string;
}

export interface ParsedScript {
    title?: string;
    lines: ScriptLine[];
    characters: string[];
    scenes: ScriptScene[];
}
