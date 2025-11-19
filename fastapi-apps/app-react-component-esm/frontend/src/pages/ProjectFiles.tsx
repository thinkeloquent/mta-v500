/**
 * Project files management page
 */

import {
  ArrowLeft,
  Calendar,
  Code2,
  Edit,
  ExternalLink,
  FileCode,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { filesAPI, projectsAPI } from '../services/api';
import type { File, FileCreate, FileUpdate, ProjectWithFiles } from '../types';

export default function ProjectFiles() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectWithFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);

  // Get API URL for this project
  const getApiUrl = () => {
    if (!projectId) return '';
    const baseUrl = import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin;
    return `${baseUrl}/api/apps/react-component-esm/projects/${projectId}`;
  };

  // Open API URL in new tab
  const handleOpenApiUrl = () => {
    window.open(getApiUrl(), '_blank');
  };

  // Load project and files on mount
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await projectsAPI.get(projectId);
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async (data: FileCreate) => {
    try {
      await filesAPI.create(data);
      await loadProject();
      setShowCreateModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create file');
    }
  };

  const handleUpdateFile = async (id: string, data: FileUpdate) => {
    try {
      await filesAPI.update(id, data);
      await loadProject();
      setEditingFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update file');
    }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete file "${name}"?`)) {
      return;
    }

    try {
      await filesAPI.delete(id);
      await loadProject();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-red-600 mb-4">Error: {error || 'Project not found'}</div>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-blue-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
              {project.description && <p className="text-gray-600 mt-1">{project.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenApiUrl}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="View API Response"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View API</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Files List */}
      {project.files.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No files yet</h3>
          <p className="text-gray-600 mb-6">Add your first file to this project</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create File</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            {project.files.map((file) => (
              <div key={file.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <FileCode className="w-6 h-6 text-blue-500 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{file.name}</h3>
                      <p className="text-sm text-gray-600 mb-2 font-mono">
                        {file.path ? `${file.path}/${file.name}` : file.name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                          <Code2 className="w-3 h-3" />
                          {file.language}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(file.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={`/projects/${projectId}/files/${file.id}/edit`}
                      className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      Edit Code
                    </Link>
                    <button
                      onClick={() => setEditingFile(file)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit metadata"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create File Modal */}
      {showCreateModal && projectId && (
        <FileModal
          title="Create New File"
          projectId={projectId}
          onSubmit={handleCreateFile}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit File Modal */}
      {editingFile && (
        <FileModal
          title="Edit File Metadata"
          projectId={editingFile.project_id}
          file={editingFile}
          onSubmit={(data) => handleUpdateFile(editingFile.id, data)}
          onClose={() => setEditingFile(null)}
        />
      )}
    </div>
  );
}

/**
 * File modal component for create/edit metadata
 */
interface FileModalProps {
  title: string;
  projectId: string;
  file?: File;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

function FileModal({ title, projectId, file, onSubmit, onClose }: FileModalProps) {
  const [name, setName] = useState(file?.name || '');
  const [path, setPath] = useState(file?.path || '');
  const [language, setLanguage] = useState(file?.language || 'javascript');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Filename is required');
      return;
    }

    if (file) {
      // Edit mode - only send changed fields
      onSubmit({
        name: name.trim(),
        path: path.trim() || null,
        language: language,
      });
    } else {
      // Create mode
      onSubmit({
        project_id: projectId,
        name: name.trim(),
        path: path.trim() || null,
        language: language,
        content: '// Start coding here...\n',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filename *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Button.tsx"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Folder Path</label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="src/components"
            />
            <p className="text-xs text-gray-500 mt-1">Optional folder path within project</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="typescriptreact">TypeScript React</option>
              <option value="javascriptreact">JavaScript React</option>
              <option value="json">JSON</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {file ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
