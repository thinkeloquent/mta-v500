/**
 * Main layout component with navigation
 */

import { FileCode, FolderOpen, Home } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinkClass = (path: string) => {
    const baseClass = 'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors';
    return isActive(path)
      ? `${baseClass} bg-blue-500 text-white`
      : `${baseClass} text-gray-700 hover:bg-gray-100`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">React Component ESM Editor</h1>
                <p className="text-sm text-gray-500">Manage projects and edit ESM components</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-4 space-y-2">
              <Link to="/" className={navLinkClass('/')}>
                <Home className="w-5 h-5" />
                <span>Home</span>
              </Link>
              <Link to="/projects" className={navLinkClass('/projects')}>
                <FolderOpen className="w-5 h-5" />
                <span>Projects</span>
              </Link>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
