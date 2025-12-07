import Loading from '@/components/Loading';

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="h-16 bg-white dark:bg-gray-800 rounded-lg shadow mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-white dark:bg-gray-800 rounded-lg shadow animate-pulse"></div>
                    ))}
                </div>
            </div>
        </div>
    );
}
