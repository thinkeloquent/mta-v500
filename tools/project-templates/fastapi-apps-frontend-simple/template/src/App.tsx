import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchHealthCheck, type HealthCheckResponse } from './api';

function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealthCheck();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">{{APP_NAME_TITLE}}</h1>
          <p className="text-sm text-gray-600 mt-1">
            FastAPI + React Frontend
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* API Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">API Status</h2>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading && !health && (
            <div className="text-gray-500">Connecting to API...</div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <strong>Error:</strong> {error}
              <p className="text-sm mt-2">
                Make sure your FastAPI backend is running at{' '}
                <code className="bg-red-100 px-1 rounded">
                  {import.meta.env.VITE_API_URL || 'http://localhost:8080'}
                </code>
              </p>
            </div>
          )}

          {health && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="font-medium">
                  Status: {health.status === 'ok' ? 'Connected' : 'Error'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p>Timestamp: {health.timestamp}</p>
                {health.version && <p>Version: {health.version}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Getting Started Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900">1. Configure your API</h3>
              <p>
                Edit <code className="bg-gray-100 px-1 rounded">.env</code> to set your
                backend URL:
              </p>
              <pre className="mt-2 p-3 bg-gray-50 rounded-lg overflow-x-auto">
                VITE_API_URL=http://localhost:8080
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">2. Add your components</h3>
              <p>
                Create components in{' '}
                <code className="bg-gray-100 px-1 rounded">src/components/</code>
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">3. Add API calls</h3>
              <p>
                Add your API functions to{' '}
                <code className="bg-gray-100 px-1 rounded">src/api.ts</code>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          Built with FastAPI + React + Tailwind CSS
        </div>
      </footer>
    </div>
  );
}

export default App;
