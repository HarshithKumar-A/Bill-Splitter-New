import React from 'react';

const Loading = () => {
    return (
        <div className="flex items-center justify-center min-h-[200px] h-full w-full">
            <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full opacity-25"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
        </div>
    );
};

export default Loading;
