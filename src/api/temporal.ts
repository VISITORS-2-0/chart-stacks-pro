import { TemporalRow, PatientStatusProcessedRow } from '../types/temporal';


const DATA_SERVICE_URL = import.meta.env.VITE_DATA_SERVICE_URL || '';

export interface ConceptData {
    name: string;
    type: string;
    allowed_values?: {
        values: string[];
        ordering: string;
    };
}

export interface AbstractionResponse {
    concept_data: ConceptData;
    result: any[]; // The result array containing temporal data
}

export interface RawDataResponse {
    concept_data: ConceptData;
    result: TemporalRow[];
}

export interface QueryParams {
    patients_list: string[];
    concept_name: string;
    start_date: string;
    end_date: string;
}

export const fetchAbstractionData = async (params: QueryParams): Promise<AbstractionResponse> => {
    const response = await fetch(`http://localhost:8000/api/v1/visitors-queries/abstraction`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch Abstraction Failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch abstraction data: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
};

export const fetchRawData = async (params: QueryParams): Promise<RawDataResponse> => {
    console.log("fetchRawData");
    console.log(params);
    const response = await fetch(`http://localhost:8000/api/v1/visitors-queries/raw-data`, {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch Raw Data Failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch raw data: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log("fetchRawData response");
    console.log(data);

    return data;
};

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
