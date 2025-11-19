import React from 'react';
import { 
  Image, 
  FileText, 
  Video, 
  Music, 
  Archive, 
  File,
  Eye,
  Download,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { cn } from '../utils/cn.js';
import { formatFileSize, formatDate, getFileType, getFileIcon } from '../utils/fileUtils.js';

export const FileCard = ({ 
  file, 
  onView, 
  onDownload, 
  onDelete, 
  onSelect,
  isSelected = false,
  isDeleting = false,
  viewMode = 'grid'
}) => {
  const fileType = getFileType(file.key, file.contentType);
  const iconName = getFileIcon(fileType);
  
  const IconComponent = {
    Image,
    FileText,
    Video,
    Music,
    Archive,
    File
  }[iconName] || File;

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input[type="checkbox"]')) return; // Don't select if clicking a button or checkbox
    // For grid view, clicking card should check/uncheck
    // For list view, clicking row should also check/uncheck
    onSelect?.(file);
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation(); // Prevent row click
    onSelect?.(file);
  };

  if (viewMode === 'list') {
    return (
      <tr 
        className={cn(
          "hover:bg-gray-50 transition-colors cursor-pointer",
          isSelected && "bg-primary-50"
        )}
        onClick={handleCardClick}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-2 rounded-lg file-icon",
              `file-type-${fileType}`
            )}>
              <IconComponent />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={file.key}>
                {file.key.split('/').pop()}
              </div>
              <div className="text-xs text-gray-500">Type: {fileType}</div>
            </div>
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {formatFileSize(file.size)}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {formatDate(file.lastModified)}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onView?.(file);
              }}
              className="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors"
              title="View file"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.(file);
              }}
              className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
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
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "hover:bg-red-50 text-red-600"
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
        </td>
      </tr>
    );
  }

  // Grid view
  return (
    <div 
      className={cn(
        "card hover:shadow-lg transition-all cursor-pointer group",
        isSelected && "ring-2 ring-primary-500"
      )}
      onClick={handleCardClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "w-full h-20 rounded-lg flex items-center justify-center",
            `file-type-${fileType}`
          )}>
            <IconComponent className="w-8 h-8" />
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-900 truncate" title={file.key}>
            {file.key.split('/').pop()}
          </p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          <p className="text-xs text-gray-500">{formatDate(file.lastModified)}</p>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onView?.(file);
              }}
              className="p-1.5 hover:bg-primary-50 rounded text-primary-600 transition-colors"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.(file);
              }}
              className="p-1.5 hover:bg-green-50 rounded text-green-600 transition-colors"
              title="Download"
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
                "p-1.5 rounded transition-colors",
                isDeleting 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "hover:bg-red-50 text-red-600"
              )}
              title={isDeleting ? "Deleting..." : "Delete"}
            >
              {isDeleting ? (
                <div className="loading-spinner w-4 h-4"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
          
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
};
