import React from 'react';
import {
  FolderOpen,
  CheckCircle,
  MoreVertical,
  Trash2,
  Settings
} from 'lucide-react';
import { cn } from '../utils/cn.js';
import { formatDate } from '../utils/fileUtils.js';

export const BucketCard = ({ 
  bucket, 
  onSelect, 
  onDelete, 
  onSettings 
}) => {
  const handleMoreClick = (e) => {
    e.stopPropagation();
    // Could show a dropdown menu here
  };

  return (
    <div
      className="card hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onSelect(bucket)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-primary-50 rounded-lg">
            <FolderOpen className="w-6 h-6 text-primary-600" />
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettings(bucket);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Bucket settings"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(bucket);
              }}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete bucket"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-3 truncate" title={bucket.name}>
          {bucket.name}
        </h3>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{bucket.region || 'unknown'}</span>
            <span className="text-sm text-gray-500">
              {bucket.creationDate ? formatDate(bucket.creationDate) : 'Unknown'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Active</span>
          </span>
          <span className="text-primary-600 group-hover:underline">
            View Files →
          </span>
        </div>
      </div>
    </div>
  );
};
