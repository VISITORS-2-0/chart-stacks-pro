import { TemporalRow } from "@/types/temporal";

// Request Payload (Same as abstraction)
export interface RawDataRequest {
    patients_list: string[];
    concept_name: string;
    start_date: string; // ISO Dates
    end_date: string;   // ISO Dates
}

// API Response Item matches TemporalRow largely, but Value is string in example
// "Value": "36.96"
// TemporalRow has Value: number | string

export const fetchRawData = async (payload: RawDataRequest): Promise<TemporalRow[]> => {
    try {
        const response = await fetch("/api/v1/visitors-queries/raw-data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        
        // Handle both old (array) and new (object with result key) formats
        const dataArr = Array.isArray(json) ? json : (json.result || json.data || []);

        // Map to ensure types are correct (parsing numbers if possible)
        return dataArr.map((item: any) => ({
            StartTime: item.StartTime,
            EndTime: item.EndTime,
            // Try to parse number, fallback to string if NaN
            Value: !isNaN(parseFloat(item.Value)) ? parseFloat(item.Value) : item.Value,
            PatientID: item.PatientID,
            ConceptName: item.ConceptName
        }));

    } catch (error) {
        console.error("Failed to fetch raw data:", error);
        throw error;
    }
};
