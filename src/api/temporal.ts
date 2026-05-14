import { TemporalRow, PatientStatusProcessedRow } from '../types/temporal';
import { getApiUrl } from '@/config/api';

export interface ConceptData {
    id?: string;
    name: string;
    type?: string;
    concept_type?: string;
    values?: string[];
    "min-value"?: number;
    "max-value"?: number;
}

export interface AbstractionResponse {
    concept_data: ConceptData;
    result: any[]; // The result array containing temporal data
}

export interface RawDataResponse {
    concept_data: ConceptData;
    result: TemporalRow[];
}

export interface ConceptKnowledgeResponse {
    "@id": string;
    "@name": string;
    "@concept-type": string;
    "derived_from": string[];
    "derived_into": string[];
    "siblings": string[];
    "values"?: string[];
    "context"?: any;
    "good_before"?: string;
    "good_after"?: string;
    "persistence"?: {
        "local"?: string;
        "global"?: string;
    };
    "mapping_function"?: string;
    "time_steady"?: string;
    "min"?: number | string;
    "max"?: number | string;
    "min-value"?: number | string;
    "max-value"?: number | string;
    "xml"?: any;
    "mapping_abstractions"?: MappingAbstractions;
}

export interface ConditionMapping {
    abstracted_from_concept: string;
    values_accepted: string;
}

export interface CategoryMapping {
    order: number;
    category: string;
    logical_operation: string | null;
    conditions: ConditionMapping[];
}

export interface MappingAbstractions {
    category_mappings: CategoryMapping[];
}

export interface RelativeTimeDelta {
    value: number;
    unit: 'h' | 'd' | 'w' | 'm' | 'y';
}

// TODO: Add reference_value support for non-event concept-value pairs (e.g. Hgb-State = Moderate)
export interface RelativeTimeConfig {
    reference_concept: string;
    reference_value: string | null;
    occurrence_index: number; // 0=first, 1=second, -1=last
    start_delta: RelativeTimeDelta;
    end_delta: RelativeTimeDelta;
}

export interface QueryParams {
    patients_list: string[];
    concept_name: string;
    start_date: string | null;
    end_date: string | null;
    use_generated_data?: boolean;
    relative_time?: RelativeTimeConfig;
}

export const fetchAbstractionData = async (params: QueryParams): Promise<AbstractionResponse> => {
    const response = await fetch(getApiUrl('/api/v1/visitors-queries/abstraction'), {
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
    const response = await fetch(getApiUrl('/api/v1/visitors-queries/raw-data'), {
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

    return data;
};

export interface PatternResponse {
    concept_data: ConceptData;
    result: {
        StartTime: string;
        EndTime: string;
        ConceptName: string;
        Value_Dict: Record<string, number>;
        TotalPatientsWithData: number;
    }[];
}

export interface PatternQueryParams extends QueryParams {
    interval_str: string;
    method: string;
}

export const fetchMultiplePatientsAbstraction = async (params: PatternQueryParams): Promise<PatternResponse> => {
    const response = await fetch(getApiUrl('/api/v1/visitors-queries/multiple-patients-abstraction'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch Multiple Patients Abstraction Failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch pattern data: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
};

export interface NumericPatternQueryParams extends PatternQueryParams {
    ranges?: { min: number; max: number }[];
}

export const fetchMultiplePatientsNumericAbstraction = async (params: NumericPatternQueryParams): Promise<PatternResponse> => {
    const response = await fetch(getApiUrl('/api/v1/visitors-queries/multiple-patients-numeric-abstraction'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch Multiple Patients Numeric Abstraction Failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch numeric pattern data: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

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

export const fetchConceptKnowledge = async (conceptName: string): Promise<ConceptKnowledgeResponse> => {
    const response = await fetch(getApiUrl(`/api/v1/concept/${encodeURIComponent(conceptName)}/knowledge-exploration`), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch Concept Knowledge Failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch concept knowledge: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
};
