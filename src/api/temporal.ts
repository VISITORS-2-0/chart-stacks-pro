import { TemporalRow, PatientStatusProcessedRow } from '../types/temporal';

export const getAllOnePatientRaw = async (): Promise<TemporalRow[]> => {
    const response = await fetch('/getAllOnePatientRaw');
    if (!response.ok) {
        throw new Error(`Failed to fetch one patient data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
};

export const getAllMultiPatientRaw = async (): Promise<TemporalRow[]> => {
    const response = await fetch('/getAllMultiPatientRaw');
    if (!response.ok) {
        throw new Error(`Failed to fetch multi patient data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
};

export const getAllMultiPatientAbstract = async (): Promise<PatientStatusProcessedRow[]> => {
    // Return dummy data for now as requested
    return [
        {
            "month": "1991-01",
            "Normal": 15,
            "Moderately_low": 5,
            "High": 2,
            "NormalPct": 68.2,
            "Moderately_lowPct": 22.7,
            "HighPct": 9.1
        },
        {
            "month": "1991-02",
            "Normal": 18,
            "Moderately_low": 3,
            "High": 5,
            "NormalPct": 69.2,
            "Moderately_lowPct": 11.5,
            "HighPct": 19.3
        },
        {
            "month": "1991-03",
            "Normal": 12,
            "Moderately_low": 8,
            "High": 1,
            "NormalPct": 57.1,
            "Moderately_lowPct": 38.1,
            "HighPct": 4.8
        },
        {
            "month": "1991-04",
            "Normal": 20,
            "Moderately_low": 2,
            "High": 8,
            "NormalPct": 66.7,
            "Moderately_lowPct": 6.7,
            "HighPct": 26.6
        },
        {
            "month": "1991-05",
            "Normal": 22,
            "Moderately_low": 4,
            "High": 4,
            "NormalPct": 73.3,
            "Moderately_lowPct": 13.3,
            "HighPct": 13.4
        }
    ];
};
