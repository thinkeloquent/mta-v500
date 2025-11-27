import React, { useState, useEffect } from 'react';
import { 
  Eye,
  Download,
  Trash2,
  Image as ImageIcon,
  File,
  AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn.js';
import { formatFileSize, formatDate, getFileType } from '../utils/fileUtils.js';
import { fileApi } from '../services/api.js';
import { useLazyLoading } from '../hooks/useIntersectionObserver.js';
import { queueApiRequest } from '../utils/requestQueue.js';

export const FileGalleryCard = ({ 
  file, 
  bucketName,
  onView, 
  onDownload, 
  onDelete, 
  onSelect,
  isSelected = false,
  isDeleting = false
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(null); // Changed to store error message
  const [isLoading, setIsLoading] = useState(false);

  const fileType = getFileType(file.key, file.contentType);
  const fileName = file.key.split('/').pop();
  const isImage = fileType === 'image';
  
  // Lazy loading hook - only load when component is visible
  const { ref: lazyRef, shouldLoad } = useLazyLoading({
    threshold: 0.1,
    rootMargin: '100px' // Start loading 100px before the image comes into view
  });

  // Load image preview only when the component is visible and it's an image
  useEffect(() => {
    if (isImage && bucketName && shouldLoad && !previewUrl && !imageError) {
      setIsLoading(true);
      setImageError(null);
      
      const loadPreview = async () => {
        try {
          console.log(`Lazy loading image: ${file.key}`);
          
          // Queue the API request to prevent rate limiting
          const response = await queueApiRequest(
            () => fileApi.getDownloadUrl(bucketName, file.key),
            1 // Normal priority
          );
          
          setPreviewUrl(response.downloadUrl);
        } catch (error) {
          console.error('Failed to load preview:', error);
          
          // Show user-friendly error message for rate limits
          if (error.status === 429) {
            setImageError('Rate limited - images loading slowly');
          } else if (error.status === 404) {
            setImageError('Image not found');
          } else {
            setImageError('Preview failed');
          }
        } finally {
          setIsLoading(false);
        }
      };

      loadPreview();
    }
  }, [isImage, bucketName, file.key, shouldLoad, previewUrl, imageError]);

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input[type="checkbox"]')) return;
    onSelect?.(file);
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onSelect?.(file);
  };

  return (
    <div 
      ref={lazyRef}
      className={cn(
        "card hover:shadow-lg transition-all cursor-pointer group relative",
        isSelected && "ring-2 ring-primary-500"
      )}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="w-4 h-4 rounded border-2 border-white bg-white/80 backdrop-blur text-primary-600 focus:ring-primary-500 shadow-sm"
        />
      </div>

      {/* Image Preview or File Icon */}
      <div className="relative w-full h-48 bg-gray-100 rounded-t-lg overflow-hidden">
        {isImage ? (
          <>
            {/* Show placeholder until image should load */}
            {!shouldLoad ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-xs">Scroll to load</p>
                </div>
              </div>
            ) : isLoading && !previewUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="loading-spinner w-8 h-8 mx-auto mb-2"></div>
                  <p className="text-xs text-gray-500">Loading preview...</p>
                </div>
              </div>
            ) : previewUrl && !imageError ? (
              <>
                <img
                  src={previewUrl}
                  alt={fileName}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError('Failed to load image')}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="loading-spinner w-8 h-8"></div>
                  </div>
                )}
              </>
            ) : imageError ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <AlertCircle className={cn(
                    "w-8 h-8 mx-auto mb-2",
                    imageError.includes('Rate limited') ? 'text-yellow-500' : 'text-gray-400'
                  )} />
                  <p className="text-xs px-2 text-center">{imageError}</p>
                  {imageError.includes('Rate limited') && (
                    <button
                      onClick={() => {
                        setImageError(null);
                        setIsLoading(false);
                        // Trigger reload by changing shouldLoad dependency
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 mt-1 underline"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <File className="w-16 h-16 text-gray-400" />
          </div>
        )}

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onView?.(file);
              }}
              className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 transition-colors"
              title="View file"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.(file);
              }}
              className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(file);
              }}
              disabled={isDeleting}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDeleting 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                  : "bg-white/90 hover:bg-white text-gray-700"
              )}
              title={isDeleting ? "Deleting..." : "Delete file"}
            >
              {isDeleting ? (
                <div className="loading-spinner w-4 h-4"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* File Info */}
      <div className="p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>
            {fileName}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatFileSize(file.size)}</span>
            <span className="capitalize">{fileType}</span>
          </div>
          <p className="text-xs text-gray-500">{formatDate(file.lastModified)}</p>
        </div>
      </div>
    </div>
  );
};