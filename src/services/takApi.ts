import { useState, useEffect } from 'react';

export interface TakItem {
    id?: string;
    name: string;
    concept_type: string;
    output_type: string;
    duration_type: string;
    description?: string;
}

export type TakMenuResponse = TakItem[];

export const useTakMenu = () => {
    const [data, setData] = useState<TakMenuResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/v1/concept/menu');
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
