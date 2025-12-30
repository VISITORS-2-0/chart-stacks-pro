export interface TemporalRow {
    StartTime: string; // ISO-8601 with timezone, e.g. "1991-11-16T11:00:00+02:00"
    EndTime: string; // ISO-8601 (often same as StartTime)
    Value: number; // numeric measurement
    PatientID: number; // patient identifier
    ConceptName: string; // e.g. "WBC"
}

export type TemporalMode = 'absolute' | 'relative';

export type ZoomLevel = 'years' | 'months' | 'days' | 'hours';
