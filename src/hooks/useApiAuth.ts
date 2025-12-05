'use client'

import { useCallback } from 'react'
import { auth } from '@/lib/firebase.config'

/**
 * Custom hook for making authenticated API requests
 */
export function useApiAuth() {
    /**
     * Gets authentication headers with Firebase ID token
     */
    const getAuthHeaders = useCallback(async () => {
        const user = auth.currentUser

        if (!user) {
            throw new Error('Not authenticated. Please sign in.')
        }

        const token = await user.getIdToken()

        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    }, [])

    /**
     * Makes an authenticated fetch request
     * Automatically includes Firebase ID token in Authorization header
     */
    const authenticatedFetch = useCallback(async (url: string, options?: RequestInit) => {
        const headers = await getAuthHeaders()

        return fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options?.headers,
            },
        })
    }, [getAuthHeaders])

    return { getAuthHeaders, authenticatedFetch }
}
