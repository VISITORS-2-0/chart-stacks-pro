export interface TemporalRow {
    StartTime: string; // ISO-8601 with timezone, e.g. "1991-11-16T11:00:00+02:00"
    EndTime: string; // ISO-8601 (often same as StartTime)
    Value: number | string; // numeric measurement or categorical value
    PatientID: number | string; // patient identifier
    ConceptName: string; // e.g. "WBC"
}

export type TemporalMode = 'absolute' | 'relative';

export type ZoomLevel = 'years' | 'months' | 'days' | 'hours';

export interface PatientStatusProcessedRow {
    date: string; // ISO-8601 Date "YYYY-MM-DD"
    Normal: number;
    Moderately_low: number;
    High: number;
    NormalPct: number;
    Moderately_lowPct: number;
    HighPct: number;
}
