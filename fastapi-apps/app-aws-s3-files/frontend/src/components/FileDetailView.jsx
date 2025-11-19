import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Download,
  Trash2,
  Eye,
  Copy,
  File,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  ExternalLink,
  Calendar,
  HardDrive,
  Tag
} from 'lucide-react';
import { fileApi } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { formatFileSize, formatDate, getFileType } from '../utils/fileUtils.js';
import { cn } from '../utils/cn.js';

export const FileDetailView = () => {
  const { bucketName, fileKey } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  const { loading: fileLoading, execute: fetchFileDetails } = useApi();
  const { loading: deleteLoading, execute: deleteFileAction } = useApi();
  const { loading: downloadLoading, execute: downloadFile } = useApi();

  // Decode the file key from URL and validate parameters
  const decodedFileKey = fileKey ? decodeURIComponent(fileKey) : '';

  // Validate route parameters
  if (!bucketName || !fileKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid URL</h2>
          <p className="text-gray-600 mb-4">The file URL is missing required parameters.</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const loadFileDetails = async () => {
      try {
        const response = await fetchFileDetails(() => fileApi.getMetadata(bucketName, decodedFileKey));
        setFile(response.file);
        
        // Generate preview URL for supported file types
        const fileType = getFileType(decodedFileKey, response.file?.contentType);
        if (fileType === 'image') {
          const urlResponse = await fileApi.getDownloadUrl(bucketName, decodedFileKey);
          setPreviewUrl(urlResponse.downloadUrl);
        }
      } catch (error) {
        console.error('Failed to load file details:', error);
        // If file doesn't exist, redirect to bucket view
        if (error.status === 404) {
          navigate(`/buckets/${bucketName}`);
        }
      }
    };

    if (bucketName && decodedFileKey) {
      loadFileDetails();
    }
  }, [bucketName, decodedFileKey, fetchFileDetails, navigate]);

  const handleBack = () => {
    navigate(`/buckets/${bucketName}`);
  };

  const handleDownload = async () => {
    try {
      const response = await downloadFile(() => fileApi.getDownloadUrl(bucketName, decodedFileKey));
      const fileName = decodedFileKey.split('/').pop();
      
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
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${decodedFileKey}"? This action cannot be undone.`)) {
      try {
        await deleteFileAction(() => fileApi.delete(bucketName, decodedFileKey));
        navigate(`/buckets/${bucketName}`);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  const handleCopyUrl = async () => {
    try {
      const response = await fileApi.getDownloadUrl(bucketName, decodedFileKey);
      await navigator.clipboard.writeText(response.downloadUrl);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const getFileIcon = (fileType) => {
    const iconMap = {
      image: Image,
      document: FileText,
      video: Video,
      audio: Music,
      archive: Archive,
      default: File
    };
    return iconMap[fileType] || iconMap.default;
  };

  if (fileLoading && !file) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading file details...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">File not found</h2>
          <p className="text-gray-600 mb-4">The requested file could not be found.</p>
          <button
            onClick={handleBack}
            className="btn-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Files
          </button>
        </div>
      </div>
    );
  }

  const fileType = getFileType(decodedFileKey, file.contentType);
  const IconComponent = getFileIcon(fileType);
  const fileName = decodedFileKey.split('/').pop();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 truncate max-w-md" title={fileName}>
                  {fileName}
                </h1>
                <div className="text-sm text-gray-500 mt-1">
                  <span>{bucketName}</span>
                  <span className="mx-2">•</span>
                  <span>{formatFileSize(file.size)}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(file.lastModified)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyUrl}
                className="btn-secondary flex items-center space-x-2"
                title="Copy download URL"
              >
                <Copy className="w-4 h-4" />
                <span>Copy URL</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={downloadLoading}
                className="btn-primary flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{downloadLoading ? 'Downloading...' : 'Download'}</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="btn-danger flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Preview */}
            <div className="lg:col-span-2">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
                
                {fileType === 'image' && previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt={fileName}
                      className={cn(
                        "max-w-full h-auto rounded-lg border border-gray-200",
                        !isImageLoaded && "hidden"
                      )}
                      onLoad={() => setIsImageLoaded(true)}
                      onError={() => setIsImageLoaded(false)}
                    />
                    {!isImageLoaded && (
                      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                        <div className="text-center">
                          <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Loading image...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <IconComponent className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-medium">{fileName}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        {fileType === 'image' ? 'Preview not available' : 'No preview available for this file type'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* File Metadata */}
            <div className="space-y-6">
              {/* File Info */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">File Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">File Name</p>
                      <p className="text-sm text-gray-600 break-all">{fileName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <HardDrive className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Size</p>
                      <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Modified</p>
                      <p className="text-sm text-gray-600">{formatDate(file.lastModified)}</p>
                    </div>
                  </div>
                  
                  {file.contentType && (
                    <div className="flex items-start space-x-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Content Type</p>
                        <p className="text-sm text-gray-600">{file.contentType}</p>
                      </div>
                    </div>
                  )}
                  
                  {file.etag && (
                    <div className="flex items-start space-x-3">
                      <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">ETag</p>
                        <p className="text-sm text-gray-600 break-all">{file.etag.replace(/"/g, '')}</p>
                      </div>
                    </div>
                  )}
                  
                  {file.storageClass && (
                    <div className="flex items-start space-x-3">
                      <HardDrive className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Storage Class</p>
                        <p className="text-sm text-gray-600">{file.storageClass}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Path Info */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bucket</p>
                    <p className="text-sm text-gray-600">{bucketName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700">Full Path</p>
                    <p className="text-sm text-gray-600 break-all">{decodedFileKey}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};