/**
 * File editor page with Monaco code editor
 */

import Editor from '@monaco-editor/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Copy,
  ExternalLink,
  FileCode,
  Save,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { filesAPI } from '../services/api';
import type { File } from '../types';

export default function FileEditor() {
  const { projectId, fileId } = useParams<{ projectId: string; fileId: string }>();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const editorRef = useRef<any>(null);

  // Get ESM module URL
  const getEsmUrl = () => {
    if (!projectId || !fileId) return '';
    const baseUrl = import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin;
    return `${baseUrl}/api/apps/react-component-esm/api/esm/${projectId}/${fileId}`;
  };

  // Map language to Monaco editor language
  const getMonacoLanguage = (lang: string) => {
    const langMap: Record<string, string> = {
      typescriptreact: 'typescript',
      javascriptreact: 'javascript',
      tsx: 'typescript',
      jsx: 'javascript',
    };
    return langMap[lang] || lang;
  };

  // Copy ESM URL to clipboard
  const handleCopyEsmUrl = async () => {
    try {
      await navigator.clipboard.writeText(getEsmUrl());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (_err) {
      alert('Failed to copy URL to clipboard');
    }
  };

  // Open ESM URL in new tab
  const handleOpenEsmUrl = () => {
    window.open(getEsmUrl(), '_blank');
  };

  // Load file on mount
  useEffect(() => {
    if (fileId) {
      loadFile();
    }
  }, [fileId]);

  // Prompt before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const loadFile = async () => {
    if (!fileId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await filesAPI.get(fileId);
      setFile(data);
      setContent(data.content);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fileId || !file) return;

    try {
      setSaving(true);
      setSaveSuccess(false);
      await filesAPI.update(fileId, { content });
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsDirty(true);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    // Add keyboard shortcut for save (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  const handleBack = () => {
    if (isDirty && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return;
    }
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading file...</p>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-red-600 mb-4">Error: {error || 'File not found'}</div>
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Back to Files
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-3">
              <FileCode className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{file.name}</h2>
                <p className="text-sm text-gray-600 font-mono">
                  {file.path ? `${file.path}/${file.name}` : file.name}
                </p>
              </div>
            </div>

            {isDirty && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Unsaved changes
              </span>
            )}

            {saveSuccess && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Saved successfully
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyEsmUrl}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Copy ESM URL"
            >
              <Copy className="w-4 h-4" />
              <span>{copySuccess ? 'Copied!' : 'Copy ESM'}</span>
            </button>

            <button
              onClick={handleOpenEsmUrl}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Open ESM in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open ESM</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <Editor
          height="calc(100vh - 280px)"
          language={getMonacoLanguage(file.language)}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Help text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p>
          <strong>Tip:</strong> Press <kbd className="px-2 py-1 bg-blue-100 rounded">Ctrl+S</kbd>{' '}
          (or <kbd className="px-2 py-1 bg-blue-100 rounded">⌘+S</kbd> on Mac) to save your changes.
        </p>
      </div>
    </div>
  );
}
