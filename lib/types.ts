export type ScriptLineType = 'dialogue' | 'stage_direction';

export interface ScriptLine {
    id: string;
    character: string;
    text: string;
    type: ScriptLineType;
}

export interface ParsedScript {
    title?: string;
    lines: ScriptLine[];
    characters: string[];
}
