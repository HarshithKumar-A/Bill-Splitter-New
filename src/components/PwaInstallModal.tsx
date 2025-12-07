"use client";

import React, { useEffect, useState } from "react";
import { FaDownload, FaTimes } from "react-icons/fa";

const PwaInstallModal = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowModal(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setShowModal(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
    };

    if (!showModal) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Install App
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Install this app on your device for a better experience and offline access.
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <FaTimes />
                    </button>
                </div>
                <button
                    onClick={handleInstallClick}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                    <FaDownload />
                    Install
                </button>
            </div>
        </div>
    );
};

export default PwaInstallModal;
