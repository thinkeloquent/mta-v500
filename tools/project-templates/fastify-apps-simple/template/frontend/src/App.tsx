import { useState } from 'react';

interface ApiResponse {
  message?: string;
  echo?: unknown;
  timestamp: string;
}

function App() {
  const [name, setName] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHello = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = name ? `?name=${encodeURIComponent(name)}` : '';
      const res = await fetch(`/api/{{APP_NAME}}/hello${params}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEcho = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/{{APP_NAME}}/echo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: name || 'Hello from frontend!' }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">{{APP_NAME_TITLE}}</h1>
          <p className="text-sm text-gray-600 mt-1">
            A Fastify application with React frontend
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Demo</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name (optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchHello}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Loading...' : 'GET /hello'}
              </button>
              <button
                onClick={fetchEcho}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Loading...' : 'POST /echo'}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}

            {response && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Response:</h3>
                <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Endpoints</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/{{APP_NAME}}</code> - Health check</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/{{APP_NAME}}/hello</code> - Hello endpoint (optional: ?name=...)</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">POST /api/{{APP_NAME}}/echo</code> - Echo back request body</li>
          </ul>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          Built with Fastify + React + Tailwind CSS
        </div>
      </footer>
    </div>
  );
}

export default App;
