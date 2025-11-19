import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service here
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-600 text-sm mb-4">
                We encountered an unexpected error. This might be due to a network issue or a problem with the application.
              </p>
              <div className="text-xs text-gray-500 bg-gray-100 p-3 rounded font-mono">
                {this.state.error?.message || 'Unknown error'}
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary flex items-center space-x-2 w-full justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              
              <a
                href="/"
                className="btn-secondary flex items-center space-x-2 w-full justify-center"
              >
                <span>Return Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;