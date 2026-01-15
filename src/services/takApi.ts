import { useState, useEffect } from 'react';

export interface TakItem {
    name: string;
    type: string; // e.g., "raw-numeric", "state", "event", "context"
    id: string;
    description?: string;
}

export interface TakMenuResponse {
    TakEntity: {
        Event: TakItem[];
        Context: TakItem[];
        Concept: {
            RawConcept: TakItem[];      // Contains all raw types (numeric, nominal, etc.)
            AbstractConcept: TakItem[]; // Contains all abstract types (state, pattern, etc.)
        };
    };
}

export const useTakMenu = () => {
    const [data, setData] = useState<TakMenuResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/v1/visitors-queries/tak_structure');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const json = await response.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};
