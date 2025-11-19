/**
 * FIGMA COMPONENT INSPECTOR
 * ===========================
 *
 * Integrated with backend API for real Figma data
 */

import {
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Component,
  Copy,
  Download,
  ExternalLink,
  File,
  GitBranch,
  Hash,
  Info,
  Layers,
  Palette,
  RefreshCw,
  Search,
  Settings,
  Variable,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/figma.api';

// Utility: Format timestamp as relative time
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;

  // For older dates, show formatted date
  return then.toLocaleDateString();
};

// Types
interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

const FigmaComponentInspector: React.FC = () => {
  // State
  const [fileId, setFileId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileData, setFileData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<FigmaNode | null>(null);
  const [nodeDetails, setNodeDetails] = useState<any>(null);
  const [nodeImage, setNodeImage] = useState<string | null>(null);
  const [variables, setVariables] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'properties' | 'comments'>('properties');
  const [copied, setCopied] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [error, setError] = useState<string>('');

  // Helper: Get file ID from URL path
  const getFileIdFromUrl = useCallback((): string => {
    // URL format: /apps/figma-component-inspector/{FILE_ID}
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    // Get the last segment if it exists and is not 'figma-component-inspector'
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      if (lastSegment !== 'figma-component-inspector' && lastSegment !== 'apps') {
        return lastSegment;
      }
    }
    return '';
  }, []);

  // Helper: Update URL with file ID
  const updateUrlWithFileId = useCallback((fileId: string) => {
    const basePath = '/apps/figma-component-inspector';
    const newPath = fileId ? `${basePath}/${fileId}` : basePath;
    window.history.pushState({}, '', newPath);
  }, []);

  // Load Figma file
  const handleLoadFile = useCallback(
    async (fileIdToLoad?: string) => {
      const targetFileId = fileIdToLoad || fileId;
      if (!targetFileId.trim()) {
        setError('Please enter a Figma File ID');
        return;
      }

      // Update URL when loading a file
      updateUrlWithFileId(targetFileId);

      // Update local state if loading from URL
      if (fileIdToLoad && fileIdToLoad !== fileId) {
        setFileId(fileIdToLoad);
      }

      setIsLoading(true);
      setError('');

      try {
        const data = (await api.getFigmaFile(targetFileId)) as any;
        setFileData(data);

        // Load variables (optional - may not be accessible)
        try {
          const varsResponse = (await api.getFileVariables(targetFileId)) as any;
          // Check if variables were successfully loaded
          if (varsResponse && (varsResponse.local || varsResponse.published)) {
            setVariables(varsResponse.local || []);
          } else {
            // Variables not accessible, but this is not a critical error
            console.warn(
              'Variables not accessible:',
              varsResponse?.errors || varsResponse?.message,
            );
            setVariables([]);
          }
        } catch (varsErr: any) {
          // Variables API failed, but don't break the entire file load
          console.warn('Failed to load variables:', varsErr.message);
          setVariables([]);
        }

        // Auto-expand first level
        if (data.document.children) {
          setExpandedNodes(data.document.children.map((c: FigmaNode) => c.name));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load Figma file');
        console.error('Error loading file:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [fileId, updateUrlWithFileId],
  );

  // Initialize from URL on mount
  useEffect(() => {
    const fileIdFromUrl = getFileIdFromUrl();
    if (fileIdFromUrl) {
      setFileId(fileIdFromUrl);
      handleLoadFile(fileIdFromUrl);
    }
  }, []); // Empty deps = run once on mount

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const fileIdFromUrl = getFileIdFromUrl();
      if (fileIdFromUrl && fileIdFromUrl !== fileId) {
        setFileId(fileIdFromUrl);
        handleLoadFile(fileIdFromUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fileId, getFileIdFromUrl, handleLoadFile]);

  // Select node and load details
  const handleSelectNode = useCallback(
    async (node: FigmaNode) => {
      setSelectedNode(node);
      setNodeDetails(null);
      setNodeImage(null);

      try {
        // Load node details
        const details = await api.getNodeDetails(fileId, node.id);
        setNodeDetails(details);

        // Load node image
        const imageData = (await api.getComponentImages(fileId, [node.id])) as any;
        if (imageData.images?.[node.id]) {
          setNodeImage(imageData.images[node.id]);
        }

        // Load comments from Figma
        const allComments = (await api.getComments(fileId)) as any[];
        setComments(allComments);
      } catch (err) {
        console.error('Error loading node details:', err);
      }
    },
    [fileId],
  );

  // Toggle node expansion
  const toggleNode = useCallback((nodeName: string) => {
    setExpandedNodes((prev) =>
      prev.includes(nodeName) ? prev.filter((id) => id !== nodeName) : [...prev, nodeName],
    );
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    });
  }, []);

  // Handle zoom
  const handleZoomChange = useCallback((delta: number) => {
    setZoomLevel((prev) => Math.max(25, Math.min(200, prev + delta)));
  }, []);

  // Note: Comment creation removed - Figma comments are managed in Figma
  // This view is read-only from the Figma API

  // Render tree recursively
  const renderTree = (node: FigmaNode, level: number = 0): JSX.Element[] | null => {
    if (!node.children || node.children.length === 0) return null;

    return node.children.map((child) => {
      const hasChildren = child.children && child.children.length > 0;
      const isExpanded = expandedNodes.includes(child.name);
      const isSelected = selectedNode?.id === child.id;

      const getIcon = () => {
        switch (child.type) {
          case 'COMPONENT':
            return <Component className="w-4 h-4 text-purple-500" />;
          case 'FRAME':
            return <Box className="w-4 h-4 text-blue-500" />;
          case 'PAGE':
            return <File className="w-4 h-4 text-gray-500" />;
          default:
            return <Layers className="w-4 h-4 text-gray-400" />;
        }
      };

      return (
        <div key={child.id}>
          <div
            data-testid="tree-node"
            data-type={child.type}
            data-node-id={child.id}
            className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded cursor-pointer ${
              isSelected ? 'bg-purple-50 border-l-2 border-purple-500' : ''
            }`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => {
              if (hasChildren) toggleNode(child.name);
              handleSelectNode(child);
            }}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(child.name);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            {getIcon()}
            <span
              className={`text-sm flex-1 ${isSelected ? 'font-medium text-purple-700' : 'text-gray-700'}`}
            >
              {child.name}
            </span>
          </div>
          {hasChildren && isExpanded && renderTree(child, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-semibold text-gray-900">Component Inspector</span>
            {fileData && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span data-testid="file-name" className="font-medium">
                  {fileData.name}
                </span>
                <button className="p-1 hover:bg-gray-100 rounded" onClick={() => handleLoadFile()}>
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {!fileData ? (
            <div className="flex items-center gap-3">
              <input
                data-testid="file-id-input"
                type="text"
                placeholder="Enter Figma File ID..."
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleLoadFile();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                data-testid="load-file-button"
                onClick={() => handleLoadFile()}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isLoading ? 'Loading...' : 'Load File'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <GitBranch className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Settings className="w-4 h-4 text-gray-600" />
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Open in Figma
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </header>

      {/* Main Content */}
      {fileData ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Tree */}
          <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search components..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div data-testid="component-tree" className="flex-1 overflow-y-auto p-3">
              {fileData.document && renderTree(fileData.document)}
            </div>
          </aside>

          {/* Center - Preview */}
          <main className="flex-1 flex flex-col bg-gray-100">
            {selectedNode ? (
              <>
                <div className="bg-white border-b border-gray-200 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Component className="w-5 h-5 text-purple-500" />
                      <h2
                        data-testid="component-name"
                        className="text-lg font-semibold text-gray-900"
                      >
                        {selectedNode.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        data-testid="zoom-out"
                        onClick={() => handleZoomChange(-25)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <ZoomOut className="w-4 h-4 text-gray-600" />
                      </button>
                      <span
                        data-testid="zoom-level"
                        className="text-sm font-medium text-gray-700 w-12 text-center"
                      >
                        {zoomLevel}%
                      </span>
                      <button
                        data-testid="zoom-in"
                        onClick={() => handleZoomChange(25)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <ZoomIn className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-8">
                  <div
                    className="bg-white rounded-lg shadow-xl mx-auto"
                    style={{ width: 'fit-content' }}
                  >
                    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                      <div
                        data-testid="component-preview"
                        className="bg-white rounded-lg shadow-lg p-8 flex items-center justify-center"
                        style={{ transform: `scale(${zoomLevel / 100})` }}
                      >
                        {nodeImage ? (
                          <img
                            data-testid="preview-image"
                            src={nodeImage}
                            alt={selectedNode.name}
                            className="max-w-full"
                          />
                        ) : (
                          <div data-testid="preview-loading" className="p-8 text-gray-400">
                            Loading preview...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-500" />
                          <code className="text-xs font-mono text-gray-600">{selectedNode.id}</code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(selectedNode.id, 'id')}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {copied === 'id' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Component className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a component to preview</p>
                </div>
              </div>
            )}
          </main>

          {/* Right Panel - Details */}
          <aside className="w-96 bg-white border-l border-gray-200 flex flex-col">
            {selectedNode ? (
              <>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTab('properties')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
                        activeTab === 'properties'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      Properties
                    </button>
                    <button
                      onClick={() => setActiveTab('comments')}
                      className={`relative flex-1 px-3 py-2 text-sm font-medium rounded ${
                        activeTab === 'comments'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      Comments
                      {comments.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {comments.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {activeTab === 'properties' && nodeDetails && (
                    <div className="p-4 space-y-6">
                      <section>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          CSS Properties
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(nodeDetails.properties || {}).map(
                            ([key, prop]: [string, any]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between py-2 border-b border-gray-100"
                              >
                                <span className="text-sm text-gray-600">{key}</span>
                                <code className="text-sm font-mono text-gray-900">
                                  {prop.value}
                                </code>
                              </div>
                            ),
                          )}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <Variable className="w-4 h-4" />
                          Design Tokens
                        </h3>
                        <div className="space-y-2">
                          {variables.map((variable: any) => (
                            <div
                              key={variable.name}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                            >
                              <code className="text-xs font-mono text-gray-700">
                                {variable.name}
                              </code>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900">{variable.value}</span>
                                <button
                                  onClick={() => copyToClipboard(variable.value, variable.name)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {copied === variable.name ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}

                  {activeTab === 'comments' && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 p-4 space-y-4">
                        {comments.map((comment: any) => (
                          <div key={comment.id} className={comment.resolved_at ? 'opacity-50' : ''}>
                            <div className="flex gap-3">
                              {comment.user?.img_url ? (
                                <img
                                  src={comment.user.img_url}
                                  alt={comment.user.handle}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                                  {comment.user?.handle?.charAt(0) || '?'}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    {comment.user?.handle || 'Unknown User'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatRelativeTime(comment.created_at)}
                                  </span>
                                  {comment.resolved_at && (
                                    <span className="text-xs text-green-600">✓ Resolved</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700">{comment.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-500 text-center">
                          Comments are read-only. Manage comments in Figma.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a component to view details</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Figma Component Inspector</h2>
            <p className="text-gray-500 mb-6">
              Enter a Figma File ID to start inspecting components
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg">
              <Info className="w-4 h-4" />
              <span className="text-sm">
                Get File ID from Figma URL: figma.com/file/[FILE_ID]/...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FigmaComponentInspector;
