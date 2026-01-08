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
    // Generate daily data for 3 years (2021-2023)
    const startDate = new Date('2021-01-01');
    const endDate = new Date('2023-12-31');
    const data: PatientStatusProcessedRow[] = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        // Generate random counts
        const normal = Math.floor(Math.random() * 50) + 10;
        const low = Math.floor(Math.random() * 20);
        const high = Math.floor(Math.random() * 15);
        const total = normal + low + high;

        data.push({
            date: currentDate.toISOString().split('T')[0],
            Normal: normal,
            Moderately_low: low,
            High: high,
            NormalPct: (normal / total) * 100,
            Moderately_lowPct: (low / total) * 100,
            HighPct: (high / total) * 100
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
};
