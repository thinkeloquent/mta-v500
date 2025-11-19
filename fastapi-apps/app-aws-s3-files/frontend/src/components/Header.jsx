import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Cloud, 
  Search, 
  Grid, 
  List, 
  Image,
  RefreshCw, 
  Plus, 
  Upload,
  ChevronLeft,
  Filter,
  ChevronDown
} from 'lucide-react';
import { cn } from '../utils/cn.js';

export const Header = ({ 
  currentView, 
  selectedBucket, 
  viewMode, 
  searchQuery, 
  filters = {},
  onViewChange, 
  onViewModeChange, 
  onSearchChange, 
  onFiltersChange,
  onRefresh, 
  onCreateBucket, 
  onUploadFiles 
}) => {
  const [showFilters, setShowFilters] = useState(false);
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Cloud className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">S3 Admin</h1>
            </Link>
            
            {/* Breadcrumb */}
            {currentView === 'files' && selectedBucket && (
              <div className="flex items-center space-x-2 text-sm">
                <ChevronLeft className="w-4 h-4 text-gray-400" />
                <Link 
                  to="/"
                  className="text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Buckets
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-700 font-medium">{selectedBucket}</span>
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${currentView}...`}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* File Filters (only show in files view) */}
            {currentView === 'files' && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors",
                  showFilters ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-100 text-gray-600'
                )}
                title="Toggle filters"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showFilters && "rotate-180")} />
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                )}
                title="Grid view"
              >
                <Grid className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                )}
                title="List view"
              >
                <List className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => onViewModeChange('gallery')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'gallery' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                )}
                title="Gallery view"
              >
                <Image className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={onRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>

            {/* Create/Upload Button */}
            <button
              onClick={currentView === 'buckets' ? onCreateBucket : onUploadFiles}
              className="btn-primary flex items-center space-x-2"
            >
              {currentView === 'buckets' ? (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Create Bucket</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload Files</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Filter Panel */}
      {showFilters && currentView === 'files' && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center space-x-6">
            {/* File Type Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={filters.type || 'all'}
                onChange={(e) => onFiltersChange?.({...filters, type: e.target.value})}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="document">Documents</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="archive">Archives</option>
              </select>
            </div>

            {/* File Size Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Size:</label>
              <select
                value={filters.sizeRange || 'any'}
                onChange={(e) => onFiltersChange?.({...filters, sizeRange: e.target.value})}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="any">Any Size</option>
                <option value="small">&lt; 1MB</option>
                <option value="medium">1MB - 10MB</option>
                <option value="large">10MB - 100MB</option>
                <option value="xlarge">&gt; 100MB</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Size Range */}
            {filters.sizeRange === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min MB"
                  value={filters.customSizeMin || ''}
                  onChange={(e) => onFiltersChange?.({...filters, customSizeMin: e.target.value})}
                  className="w-20 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max MB"
                  value={filters.customSizeMax || ''}
                  onChange={(e) => onFiltersChange?.({...filters, customSizeMax: e.target.value})}
                  className="w-20 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-500">MB</span>
              </div>
            )}

            {/* Clear Filters */}
            {(filters.type !== 'all' || filters.sizeRange !== 'any') && (
              <button
                onClick={() => onFiltersChange?.({type: 'all', sizeRange: 'any', customSizeMin: null, customSizeMax: null})}
                className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
