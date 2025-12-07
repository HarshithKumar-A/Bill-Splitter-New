import { useState, useEffect, useCallback } from 'react';
import { useOffline } from './OfflineContext';
import { OfflineStorage } from './offline-storage';

interface UseOfflineDataOptions<T> {
    key: string;
    fetchFn: () => Promise<T>;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
}

export function useOfflineData<T>({ key, fetchFn, onSuccess, onError }: UseOfflineDataOptions<T>) {
    const { isOnline } = useOffline();
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        // Try to load from cache first to show something immediately
        const cachedData = OfflineStorage.load<T>(key);
        if (cachedData) {
            setData(cachedData);
        }

        // If offline, we are done (using cached data)
        if (!isOnline) {
            setIsLoading(false);
            return;
        }

        // If online, fetch fresh data
        try {
            const freshData = await fetchFn();
            setData(freshData);
            OfflineStorage.save(key, freshData);
            if (onSuccess) onSuccess(freshData);
        } catch (err) {
            console.error(`Error fetching data for ${key}:`, err);
            setError(err);

            // If fetch fails but we have cached data, keep using it but maybe show a warning?
            // For now, we just rely on the cached data if available.
            if (!cachedData && onError) {
                onError(err);
            }
        } finally {
            setIsLoading(false);
        }
    }, [key, isOnline, fetchFn, onSuccess, onError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, isLoading, error, isOnline };
}
