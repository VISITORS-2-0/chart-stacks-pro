import { useState, useEffect } from 'react';
import { TemporalRow, PatientStatusProcessedRow } from '../types/temporal';
import { getAllOnePatientRaw, getAllMultiPatientRaw, getAllMultiPatientAbstract } from '../api/temporal';

interface UseTemporalDataResult<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
}

export const useOnePatientRaw = (): UseTemporalDataResult<TemporalRow> => {
    const [data, setData] = useState<TemporalRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                const result = await getAllOnePatientRaw();
                if (mounted) {
                    setData(result);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Unknown error'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, []);

    return { data, loading, error };
};

export const useMultiPatientRaw = (): UseTemporalDataResult<TemporalRow> => {
    const [data, setData] = useState<TemporalRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                const result = await getAllMultiPatientRaw();
                if (mounted) {
                    setData(result);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Unknown error'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, []);

    return { data, loading, error };
};

export const useMultiPatientAbstract = (): UseTemporalDataResult<PatientStatusProcessedRow> => {
    const [data, setData] = useState<PatientStatusProcessedRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                const result = await getAllMultiPatientAbstract();
                if (mounted) {
                    setData(result);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Unknown error'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, []);

    return { data, loading, error };
};
