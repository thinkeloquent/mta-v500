import React, { useRef, useCallback, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn.js';

export const FileUpload = ({ 
  onFilesSelected, 
  onDragOver, 
  onDragLeave, 
  onDrop,
  isDragging = false,
  className = ""
}) => {
  const fileInputRef = useRef(null);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    onDragOver?.(e);
  }, [onDragOver]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        onDragLeave?.(e);
      }
      return newCounter;
    });
  }, [onDragLeave]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    
    onDrop?.(e);
  }, [onFilesSelected, onDrop]);

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [onFilesSelected]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center transition-all",
        isDragging 
          ? "border-primary-500 bg-primary-50" 
          : "border-gray-300 bg-white hover:border-gray-400",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept="*/*"
      />
      
      <div className="space-y-4">
        <div className="flex justify-center">
          <Upload className={cn(
            "w-12 h-12 transition-colors",
            isDragging ? "text-primary-600" : "text-gray-400"
          )} />
        </div>
        
        <div>
          <h3 className={cn(
            "text-lg font-medium transition-colors",
            isDragging ? "text-primary-900" : "text-gray-900"
          )}>
            {isDragging ? "Drop files here" : "Drop files here to upload"}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            or click the button to select files
          </p>
        </div>
        
        <button
          onClick={handleClick}
          className="btn-primary"
        >
          Select Files
        </button>
        
        <div className="text-xs text-gray-500">
          <p>Supported formats: Images, Documents, Videos, Audio, Archives</p>
          <p>Maximum file size: 100MB</p>
        </div>
      </div>
    </div>
  );
};

export const UploadProgress = ({ uploads, onClear }) => {
  if (Object.keys(uploads).length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Uploading Files</h3>
          <button
            onClick={onClear}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {Object.entries(uploads).map(([id, upload]) => (
          <div key={id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate flex-1" title={upload.file.name}>
                {upload.file.name}
              </span>
              <div className="flex items-center space-x-2">
                {upload.status === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {upload.status === 'failed' && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                {upload.status === 'uploading' && (
                  <span className="text-gray-500 text-xs">
                    {Math.round(upload.progress)}%
                  </span>
                )}
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  upload.status === 'completed' ? 'bg-green-500' :
                  upload.status === 'failed' ? 'bg-red-500' :
                  'bg-primary-600'
                )}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
            
            {upload.error && (
              <p className="text-xs text-red-600">{upload.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
