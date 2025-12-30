import { TemporalRow } from '../types/temporal';

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
