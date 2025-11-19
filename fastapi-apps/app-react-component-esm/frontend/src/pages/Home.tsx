/**
 * Home page component
 */

import { Code, FileCode, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to React Component ESM Editor
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          A powerful tool for managing React component projects and editing ESM modules with
          real-time syntax highlighting and validation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Projects Card */}
          <Link
            to="/projects"
            className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <FolderOpen className="w-10 h-10 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Projects</h3>
            <p className="text-gray-600">
              Create, organize, and manage your React component projects
            </p>
          </Link>

          {/* Files Card */}
          <div className="border border-gray-200 rounded-lg p-6">
            <FileCode className="w-10 h-10 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Files</h3>
            <p className="text-gray-600">Organize and edit component files within your projects</p>
          </div>

          {/* ESM Editor Card */}
          <div className="border border-gray-200 rounded-lg p-6">
            <Code className="w-10 h-10 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">ESM Editor</h3>
            <p className="text-gray-600">
              Advanced code editor with syntax highlighting powered by Monaco
            </p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Create a new project to organize your components</li>
            <li>Add component files to your project</li>
            <li>Edit and preview your ESM modules with the built-in editor</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
