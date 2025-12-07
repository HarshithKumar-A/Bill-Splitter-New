"use client";

import React from 'react';
import { useOffline } from './OfflineContext';
import { FaWifi } from 'react-icons/fa';

const OfflineIndicator = () => {
    const { isOnline } = useOffline();

    if (isOnline) return null;

    return (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-md relative z-50">
            <FaWifi className="opacity-75" />
            <span>You are currently offline. Viewing cached data.</span>
        </div>
    );
};

export default OfflineIndicator;
