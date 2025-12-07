/**
 * Utilities for managing offline data in localStorage
 */

const STORAGE_PREFIX = 'bill_splitter_offline_';

export const OfflineStorage = {
    /**
     * Save data to localStorage
     */
    save: (key: string, data: any) => {
        try {
            if (typeof window === 'undefined') return;
            localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to offline storage:', error);
        }
    },

    /**
     * Load data from localStorage
     */
    load: <T>(key: string): T | null => {
        try {
            if (typeof window === 'undefined') return null;
            const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error loading from offline storage:', error);
            return null;
        }
    },

    /**
     * Remove data from localStorage
     */
    remove: (key: string) => {
        try {
            if (typeof window === 'undefined') return;
            localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
        } catch (error) {
            console.error('Error removing from offline storage:', error);
        }
    },

    /**
     * Keys for specific data types
     */
    KEYS: {
        GROUPS: 'groups',
        GROUP_MEMBERS: (groupId: string) => `group_members_${groupId}`,
        GROUP_DETAILS: (groupId: string) => `group_details_${groupId}`,
    }
};
