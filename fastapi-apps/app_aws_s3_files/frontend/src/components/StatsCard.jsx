import React from 'react';
import { 
  FolderOpen, 
  HardDrive, 
  File, 
  Cloud,
  TrendingUp,
  Activity
} from 'lucide-react';
import { formatFileSize } from '../utils/fileUtils.js';

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary',
  subtitle,
  trend
}) => {
  const colorClasses = {
    primary: 'text-primary-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    blue: 'text-blue-500'
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gray-50`}>
          <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
        </div>
      </div>
    </div>
  );
};

export const StatsGrid = ({ buckets = [], files = [] }) => {
  const totalBuckets = buckets.length;
  const totalFiles = files.reduce((sum, file) => sum + 1, 0);
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
  const uniqueRegions = new Set(buckets.map(b => b.region)).size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatsCard
        title="Total Buckets"
        value={totalBuckets}
        icon={FolderOpen}
        color="primary"
        subtitle="Active buckets"
      />
      
      <StatsCard
        title="Total Storage"
        value={formatFileSize(totalSize)}
        icon={HardDrive}
        color="green"
        subtitle="Used across all buckets"
      />
      
      <StatsCard
        title="Total Files"
        value={totalFiles.toLocaleString()}
        icon={File}
        color="purple"
        subtitle="Objects stored"
      />
      
      <StatsCard
        title="Active Regions"
        value={uniqueRegions}
        icon={Cloud}
        color="orange"
        subtitle="Geographic distribution"
      />
    </div>
  );
};
