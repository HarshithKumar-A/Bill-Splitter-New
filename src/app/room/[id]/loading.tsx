import Loading from '@/components/Loading';

export default function RoomLoading() {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="h-16 bg-white dark:bg-gray-800 rounded-lg shadow mb-6 animate-pulse"></div>
                <div className="flex items-center justify-center h-64">
                    <Loading />
                </div>
            </div>
        </div>
    );
}
