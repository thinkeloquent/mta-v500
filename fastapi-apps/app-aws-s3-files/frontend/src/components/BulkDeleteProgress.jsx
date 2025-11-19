import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Trash2, Clock } from 'lucide-react';
import { cn } from '../utils/cn.js';

export const BulkDeleteProgress = ({ 
  isVisible, 
  files, 
  completedFiles, 
  failedFiles, 
  currentFile, 
  onCancel 
}) => {
  // ALL HOOKS MUST BE AT THE TOP LEVEL
  const [activeTab, setActiveTab] = useState('progress');
  
  // Auto-switch to Failed tab when new failures occur
  useEffect(() => {
    if (failedFiles.length > 0 && activeTab === 'progress') {
      setActiveTab('failed');
    }
  }, [failedFiles.length, activeTab]);

  // Auto-switch to In Progress when operation starts
  useEffect(() => {
    if (isVisible && files.length > 0) {
      const inProgressCount = files.filter(file => 
        !completedFiles.some(f => f.key === file.key) && 
        !failedFiles.some(f => f.key === file.key)
      ).length;
      
      if (inProgressCount > 0) {
        setActiveTab('progress');
      }
    }
  }, [isVisible, files, completedFiles, failedFiles]);

  // CONDITIONAL RENDERING AFTER ALL HOOKS
  if (!isVisible || files.length === 0) return null;

  const totalFiles = files.length;
  const completedCount = completedFiles.length;
  const failedCount = failedFiles.length;
  const remainingCount = totalFiles - completedCount - failedCount;
  const progressPercentage = Math.round(((completedCount + failedCount) / totalFiles) * 100);
  
  // Get files for each tab
  const inProgressFiles = files.filter(file => 
    !completedFiles.some(f => f.key === file.key) && 
    !failedFiles.some(f => f.key === file.key)
  );
  
  const deletedFiles = completedFiles;
  const errorFiles = failedFiles;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Deleting Files</h3>
            <p className="text-sm text-gray-600">
              {completedCount} of {totalFiles} completed
              {failedCount > 0 && ` (${failedCount} failed)`}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Cancel remaining deletions"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('progress')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'progress' 
                ? "border-primary-500 text-primary-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            In Progress ({inProgressFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'deleted' 
                ? "border-primary-500 text-primary-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <CheckCircle className="w-4 h-4 inline mr-1" />
            Deleted ({deletedFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('failed')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'failed' 
                ? "border-primary-500 text-primary-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Failed ({errorFiles.length})
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {/* In Progress Tab */}
        {activeTab === 'progress' && (
          <>
            {inProgressFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p>All files processed</p>
              </div>
            ) : (
              inProgressFiles.map((file) => {
                const isCurrent = currentFile?.key === file.key;
                
                return (
                  <div key={file.key} className="flex items-center space-x-3 p-2 rounded-lg">
                    <div className="flex-shrink-0">
                      {isCurrent ? (
                        <div className="loading-spinner w-4 h-4 border-primary-600"></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm truncate",
                        isCurrent ? "text-primary-600 font-medium" : "text-gray-700"
                      )} title={file.key}>
                        {file.key.split('/').pop()}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {isCurrent && (
                        <Trash2 className="w-3 h-3 text-primary-600 animate-pulse" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* Deleted Tab */}
        {activeTab === 'deleted' && (
          <>
            {deletedFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p>No files deleted yet</p>
              </div>
            ) : (
              deletedFiles.map((file) => (
                <div key={file.key} className="flex items-center space-x-3 p-2 rounded-lg">
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 line-through truncate" title={file.key}>
                      {file.key.split('/').pop()}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <span className="text-xs text-green-600">Deleted</span>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Failed Tab */}
        {activeTab === 'failed' && (
          <>
            {errorFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>No failures</p>
              </div>
            ) : (
              errorFiles.map((file) => (
                <div key={file.key} className="flex items-center space-x-3 p-2 rounded-lg">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-600 truncate" title={file.key}>
                      {file.key.split('/').pop()}
                    </p>
                    {file.error && (
                      <p className="text-xs text-red-500 truncate" title={file.error}>
                        {file.error}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    <span className="text-xs text-red-500">Failed</span>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
      
      {failedCount > 0 && (
        <div className="p-4 border-t border-gray-200 bg-red-50">
          <p className="text-sm text-red-700">
            {failedCount} file{failedCount !== 1 ? 's' : ''} failed to delete. 
            Check console for details.
          </p>
        </div>
      )}
    </div>
  );
};