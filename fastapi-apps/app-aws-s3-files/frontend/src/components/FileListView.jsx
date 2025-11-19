import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckSquare, Square, Minus } from 'lucide-react';
import { FileCard } from './FileCard.jsx';
import { FileGalleryCard } from './FileGalleryCard.jsx';
import { FileUpload, UploadProgress } from './FileUpload.jsx';
import { BulkDeleteProgress } from './BulkDeleteProgress.jsx';
import { ConfirmModal } from './Modal.jsx';
import { useApi, useApiState } from '../hooks/useApi.js';
import { useFileUpload } from '../hooks/useFileUpload.js';
import { fileApi } from '../services/api.js';
import { filterFiles } from '../utils/fileUtils.js';
import { imageRequestQueue } from '../utils/requestQueue.js';
import { cn } from '../utils/cn.js';

export const FileListView = ({ viewMode, searchQuery, filters = {} }) => {
  const { bucketName } = useParams();
  const navigate = useNavigate();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [deletingFileKey, setDeletingFileKey] = useState(null);
  const [queueStatus, setQueueStatus] = useState({ active: 0, queued: 0 });

  // Gallery pagination state
  const [galleryPage, setGalleryPage] = useState(1);
  const GALLERY_ITEMS_PER_PAGE = 5;
  
  // Monitor image queue status for gallery view
  useEffect(() => {
    if (viewMode === 'gallery') {
      const updateQueueStatus = () => {
        setQueueStatus({
          active: imageRequestQueue.getActiveCount(),
          queued: imageRequestQueue.getQueueSize()
        });
      };
      
      const interval = setInterval(updateQueueStatus, 500);
      return () => clearInterval(interval);
    }
  }, [viewMode]);
  
  // Bulk delete state
  const [bulkDeleteState, setBulkDeleteState] = useState({
    isActive: false,
    files: [],
    completedFiles: [],
    failedFiles: [],
    currentFile: null
  });
  const bulkDeleteCancelledRef = useRef(false);
  
  // API hooks
  const { data: files, loading: filesLoading, execute: fetchFiles } = useApiState([]);
  const { execute: deleteFile } = useApi();
  
  // File upload hook
  const { uploads, isUploading, uploadFile, uploadMultiple, clearAllUploads } = useFileUpload(bucketName);

  // Load files when component mounts or bucket changes
  useEffect(() => {
    if (bucketName) {
      fetchFiles(async () => {
        const response = await fileApi.list(bucketName);
        return response.files || [];
      });
    }
  }, [bucketName, fetchFiles]);

  // Listen for events from header
  useEffect(() => {
    const handleRefresh = () => {
      if (bucketName) {
        fetchFiles(async () => {
          const response = await fileApi.list(bucketName);
          return response.files || [];
        });
      }
    };

    const handleUpload = () => {
      // Trigger file input click
      const fileInput = document.querySelector('input[type="file"][multiple]');
      if (fileInput) {
        fileInput.click();
      }
    };

    window.addEventListener('refresh-data', handleRefresh);
    window.addEventListener('trigger-file-upload', handleUpload);

    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
      window.removeEventListener('trigger-file-upload', handleUpload);
    };
  }, [bucketName, fetchFiles]);

  // Filter data based on search query and other filters
  const filteredFiles = filterFiles(files || [], searchQuery, filters);

  // Reset gallery page when filters change
  useEffect(() => {
    setGalleryPage(1);
  }, [searchQuery, filters, bucketName]);

  // Calculate pagination for gallery view
  const totalPages = Math.ceil(filteredFiles.length / GALLERY_ITEMS_PER_PAGE);
  const startIndex = (galleryPage - 1) * GALLERY_ITEMS_PER_PAGE;
  const endIndex = startIndex + GALLERY_ITEMS_PER_PAGE;
  const paginatedFiles = viewMode === 'gallery'
    ? filteredFiles.slice(startIndex, endIndex)
    : filteredFiles;

  // Pagination handlers
  const handlePreviousPage = () => {
    setGalleryPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setGalleryPage(prev => Math.min(totalPages, prev + 1));
  };

  const handleFileSelect = useCallback((file) => {
    // Navigate to file detail view
    const encodedFileKey = encodeURIComponent(file.key);
    navigate(`/buckets/${encodeURIComponent(bucketName)}/files/${encodedFileKey}`);
  }, [navigate, bucketName]);

  const handleViewFile = useCallback(async (file) => {
    if (!bucketName) return;
    
    try {
      const response = await fileApi.getDownloadUrl(bucketName, file.key);
      // Open file in new tab for viewing
      window.open(response.downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to view file:', error);
    }
  }, [bucketName]);

  const handleFileCheck = useCallback((file) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.key === file.key);
      if (isSelected) {
        return prev.filter(f => f.key !== file.key);
      } else {
        return [...prev, file];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allSelected = selectedFiles.length === filteredFiles.length && filteredFiles.length > 0;
    if (allSelected) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles);
    }
  }, [selectedFiles, filteredFiles]);

  const getSelectionStatus = useCallback(() => {
    if (filteredFiles.length === 0) return 'none';
    if (selectedFiles.length === 0) return 'none';
    if (selectedFiles.length === filteredFiles.length) return 'all';
    return 'partial';
  }, [selectedFiles, filteredFiles]);

  const handleDeleteFile = useCallback(async (file) => {
    if (!bucketName) return;
    
    // Confirm deletion first
    if (!confirm(`Are you sure you want to delete "${file.key}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setDeletingFileKey(file.key);
      console.log(`Deleting file: ${file.key} from bucket: ${bucketName}`);
      
      await deleteFile(() => fileApi.delete(bucketName, file.key));
      console.log(`File deleted successfully, refreshing file list...`);
      
      // Refresh the file list
      await fetchFiles(async () => {
        const response = await fileApi.list(bucketName);
        return response.files || [];
      });
      console.log(`File list refreshed`);
      
      setDeletingFileKey(null);
    } catch (error) {
      console.error('Failed to delete file:', error);
      
      // Show user-friendly error message
      let userMessage = 'Failed to delete file. Please try again.';
      
      if (error.message) {
        if (error.message.includes('Access Denied')) {
          userMessage = `Access denied. You don't have permission to delete "${file.key}".`;
        } else if (error.message.includes('does not exist')) {
          userMessage = `File "${file.key}" does not exist or has already been deleted.`;
        } else {
          userMessage = `Failed to delete "${file.key}": ${error.message}`;
        }
      }
      
      setErrorMessage(userMessage);
      setShowErrorModal(true);
      setDeletingFileKey(null);
    }
  }, [deleteFile, bucketName, fetchFiles]);

  const handleBulkDelete = useCallback(async () => {
    if (!bucketName || selectedFiles.length === 0) return;
    
    // Confirm bulk deletion
    if (!confirm(`Delete ${selectedFiles.length} selected file${selectedFiles.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }
    
    // Initialize bulk delete state
    setBulkDeleteState({
      isActive: true,
      files: [...selectedFiles],
      completedFiles: [],
      failedFiles: [],
      currentFile: selectedFiles[0]
    });
    
    bulkDeleteCancelledRef.current = false;
    
    // Delete files one by one
    for (let i = 0; i < selectedFiles.length; i++) {
      if (bulkDeleteCancelledRef.current) {
        break;
      }
      
      const file = selectedFiles[i];
      
      // Update current file being deleted
      setBulkDeleteState(prev => ({
        ...prev,
        currentFile: file
      }));
      
      try {
        console.log(`Bulk delete: Deleting file ${i + 1}/${selectedFiles.length}: ${file.key}`);
        await deleteFile(() => fileApi.delete(bucketName, file.key));
        
        // Mark as completed
        setBulkDeleteState(prev => ({
          ...prev,
          completedFiles: [...prev.completedFiles, file]
        }));
        
        console.log(`Bulk delete: File ${file.key} deleted successfully`);
      } catch (error) {
        console.error(`Bulk delete: Failed to delete ${file.key}:`, error);
        
        // Handle rate limiting with retry
        if (error.status === 429) {
          console.log('Rate limited, waiting 2 seconds before continuing...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Retry the deletion once
          try {
            console.log(`Bulk delete: Retrying ${file.key} after rate limit`);
            await deleteFile(() => fileApi.delete(bucketName, file.key));
            
            setBulkDeleteState(prev => ({
              ...prev,
              completedFiles: [...prev.completedFiles, file]
            }));
            console.log(`Bulk delete: File ${file.key} deleted successfully on retry`);
          } catch (retryError) {
            console.error(`Bulk delete: Retry failed for ${file.key}:`, retryError);
            setBulkDeleteState(prev => ({
              ...prev,
              failedFiles: [...prev.failedFiles, { ...file, error: `Retry failed: ${retryError.message}` }]
            }));
          }
        } else {
          // Mark as failed for non-rate-limit errors
          setBulkDeleteState(prev => ({
            ...prev,
            failedFiles: [...prev.failedFiles, { ...file, error: error.message }]
          }));
        }
      }
      
      // Longer delay between files to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    
    // Refresh file list after all deletions
    if (!bulkDeleteCancelledRef.current) {
      console.log('Bulk delete: Refreshing file list...');
      await fetchFiles(async () => {
        const response = await fileApi.list(bucketName);
        return response.files || [];
      });
    }
    
    // Clear selected files and show completion
    setSelectedFiles([]);
    
    // Auto-hide progress after delay if no failures
    const hasFailures = bulkDeleteState.failedFiles.length > 0;
    if (!hasFailures) {
      setTimeout(() => {
        setBulkDeleteState(prev => ({ ...prev, isActive: false }));
      }, 2000);
    }
  }, [bucketName, selectedFiles, deleteFile, fetchFiles]);

  const handleCancelBulkDelete = useCallback(() => {
    bulkDeleteCancelledRef.current = true;
    setBulkDeleteState(prev => ({ ...prev, isActive: false }));
  }, []);

  const handleFileUpload = useCallback(async (files) => {
    if (!bucketName) return;
    
    try {
      await uploadMultiple(files);
      await fetchFiles(async () => {
        const response = await fileApi.list(bucketName);
        return response.files || [];
      });
    } catch (error) {
      console.error('Failed to upload files:', error);
    }
  }, [bucketName, uploadMultiple, fetchFiles]);

  const handleDownloadFile = useCallback(async (file) => {
    if (!bucketName) return;
    
    try {
      const response = await fileApi.getDownloadUrl(bucketName, file.key);
      const fileName = file.key.split('/').pop();
      
      // Use fetch to get the file as blob and force download
      const fileResponse = await fetch(response.downloadUrl);
      const blob = await fileResponse.blob();
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  }, [bucketName]);

  const handleRefresh = useCallback(() => {
    if (bucketName) {
      fetchFiles(async () => {
        const response = await fileApi.list(bucketName);
        return response.files || [];
      });
    }
  }, [bucketName, fetchFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // If bucket name is not available, show error
  if (!bucketName) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Invalid bucket name</p>
      </div>
    );
  }

  return (
    <>
      {/* File Upload Area */}
      <FileUpload
        onFilesSelected={handleFileUpload}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        isDragging={isDragging}
        className="mb-6"
      />

      {/* Gallery Queue Status */}
      {viewMode === 'gallery' && (queueStatus.active > 0 || queueStatus.queued > 0) && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 text-sm text-blue-700">
            <div className="loading-spinner w-4 h-4 border-blue-600"></div>
            <span>
              Loading images... {queueStatus.active} active, {queueStatus.queued} queued
              {queueStatus.queued > 10 && " (loading slowly to avoid rate limits)"}
            </span>
          </div>
        </div>
      )}
      
      {/* Selection Controls */}
      {!filesLoading && filteredFiles.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="btn-secondary flex items-center space-x-2"
            >
              {getSelectionStatus() === 'all' ? (
                <CheckSquare className="w-4 h-4" />
              ) : getSelectionStatus() === 'partial' ? (
                <Minus className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>
                {getSelectionStatus() === 'all' 
                  ? 'Deselect All' 
                  : `Select All${filteredFiles.length !== files.length ? ' Filtered' : ''} (${filteredFiles.length})`
                }
              </span>
            </button>
            
            {selectedFiles.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteState.isActive}
                className={cn(
                  "btn-danger flex items-center space-x-2",
                  bulkDeleteState.isActive && "opacity-50 cursor-not-allowed"
                )}
              >
                <span>
                  {bulkDeleteState.isActive 
                    ? `Deleting... (${bulkDeleteState.completedFiles.length}/${bulkDeleteState.files.length})`
                    : `Delete Selected (${selectedFiles.length})`
                  }
                </span>
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Files List */}
      {filesLoading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner w-6 h-6"></div>
          <p className="ml-3 text-gray-600">Loading files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchQuery ? 'No files found matching your search.' : 'No files in this bucket.'}
          </p>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'gallery' 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
              : "card overflow-hidden"
        )}>
          {viewMode === 'list' ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(filteredFiles);
                        } else {
                          setSelectedFiles([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file.key}
                    file={file}
                    viewMode="list"
                    isSelected={selectedFiles.some(f => f.key === file.key)}
                    isDeleting={deletingFileKey === file.key}
                    onSelect={handleFileCheck}
                    onView={handleViewFile}
                    onDownload={handleDownloadFile}
                    onDelete={handleDeleteFile}
                  />
                ))}
              </tbody>
            </table>
          ) : viewMode === 'gallery' ? (
            <>
              {paginatedFiles.map((file) => (
                <FileGalleryCard
                  key={file.key}
                  file={file}
                  bucketName={bucketName}
                  isSelected={selectedFiles.some(f => f.key === file.key)}
                  isDeleting={deletingFileKey === file.key}
                  onSelect={handleFileCheck}
                  onView={handleViewFile}
                  onDownload={handleDownloadFile}
                  onDelete={handleDeleteFile}
                />
              ))}
            </>
          ) : (
            filteredFiles.map((file) => (
              <FileCard
                key={file.key}
                file={file}
                viewMode="grid"
                isSelected={selectedFiles.some(f => f.key === file.key)}
                isDeleting={deletingFileKey === file.key}
                onSelect={handleFileCheck}
                onView={handleViewFile}
                onDownload={handleDownloadFile}
                onDelete={handleDeleteFile}
              />
            ))
          )}
        </div>
      )}

      {/* Gallery Pagination Controls */}
      {viewMode === 'gallery' && filteredFiles.length > 0 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredFiles.length)} of {filteredFiles.length} files
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousPage}
              disabled={galleryPage === 1}
              className={cn(
                "px-4 py-2 border border-gray-300 rounded-md text-sm font-medium",
                galleryPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              Previous
            </button>

            <span className="text-sm text-gray-700">
              Page {galleryPage} of {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={galleryPage === totalPages}
              className={cn(
                "px-4 py-2 border border-gray-300 rounded-md text-sm font-medium",
                galleryPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      <UploadProgress
        uploads={uploads}
        onClear={clearAllUploads}
      />

      {/* Bulk Delete Progress */}
      <BulkDeleteProgress
        isVisible={bulkDeleteState.isActive}
        files={bulkDeleteState.files}
        completedFiles={bulkDeleteState.completedFiles}
        failedFiles={bulkDeleteState.failedFiles}
        currentFile={bulkDeleteState.currentFile}
        onCancel={handleCancelBulkDelete}
      />

      {/* Error Modal */}
      <ConfirmModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Action Failed"
        message={errorMessage}
        confirmText="OK"
        variant="primary"
      />
    </>
  );
};

// Export refresh function for parent components
export const useFileListActions = (bucketName) => {
  const { execute: fetchFiles } = useApiState([]);
  
  const handleRefresh = useCallback(() => {
    if (bucketName) {
      fetchFiles(async () => {
        const response = await fileApi.list(bucketName);
        return response.files || [];
      });
    }
  }, [bucketName, fetchFiles]);

  return { handleRefresh };
};