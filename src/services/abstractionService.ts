import { AbstractionInterval } from "@/components/SinglePatientAbstractionPanel";

// API Request Payload
export interface AbstractionGeneratorRequest {
    patients_list: string[];
    concept_name: string;
    start_date: string; // ISO Dates
    end_date: string;   // ISO Dates
}

// API Response Item
export interface AbstractionResponseItem {
    StartTime: string; // ISO Date String
    EndTime: string;   // ISO Date String
    Value: string;     // e.g., "High", "Low"
    PatientID: number | string;
    ConceptName: string;
}

// Maps backend response to frontend interval format
export const mapToAbstractionInterval = (item: AbstractionResponseItem): AbstractionInterval => {
    // Map backend "Value" to order index (Defaulting to Normal/2 if unknown to avoid crashes)
    // You might want to import the shared value levels or define a mapping constant here
    const getOrder = (val: string): number => {
        const lower = val.toLowerCase();
        if (lower.includes("very low")) return 0;
        if (lower.includes("very high")) return 4;
        if (lower.includes("low")) return 1;
        if (lower.includes("high")) return 3;
        return 2; // Normal
    };

    return {
        start: item.StartTime,
        end: item.EndTime,
        valueLabel: item.Value,
        valueOrderIndex: getOrder(item.Value),
        contextId: `${item.ConceptName}-${item.StartTime}`,
        meta: {
            patientId: item.PatientID,
            conceptName: item.ConceptName
        }
    };
};

export const fetchAbstractionData = async (payload: AbstractionGeneratorRequest): Promise<AbstractionInterval[]> => {
    try {
        const response = await fetch("/api/v1/visitors-queries/abstraction", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data: AbstractionResponseItem[] = await response.json();
        return data.map(mapToAbstractionInterval);

    } catch (error) {
        console.error("Failed to fetch abstraction data:", error);
        throw error;
    }
};
