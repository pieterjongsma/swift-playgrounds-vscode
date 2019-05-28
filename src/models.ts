export interface SourceRange {
    sl: LineIndex;
    el: LineIndex;
    sc: CharacterIndex;
    ec: CharacterIndex;
}

export interface LogRecord {
    api: string;
    range: SourceRange;
    object?: string;
    name?: string;
    id?: number;
}

export type CharacterIndex = number;
export type LineIndex = number;
