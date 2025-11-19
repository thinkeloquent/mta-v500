import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BucketCard } from './BucketCard.jsx';
import { CreateBucketModal } from './CreateBucketModal.jsx';
import { ConfirmModal } from './Modal.jsx';
import { useApi, useApiState } from '../hooks/useApi.js';
import { bucketApi } from '../services/api.js';
import { cn } from '../utils/cn.js';

export const BucketListView = ({ viewMode, searchQuery = '', onCreateBucket }) => {
  const navigate = useNavigate();

  // Debug logging - Component entry
  console.log('[BucketListView] Component render:', {
    viewMode,
    searchQuery,
    searchQueryType: typeof searchQuery,
    onCreateBucket: typeof onCreateBucket
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAccessPointModal, setShowAccessPointModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [accessPointInfo, setAccessPointInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // API hooks
  const { data: buckets, loading: bucketsLoading, execute: fetchBuckets } = useApiState([]);
  const { execute: createBucket } = useApi();
  const { execute: deleteBucket } = useApi();

  // Debug logging - State after initialization
  console.log('[BucketListView] State:', {
    bucketsType: typeof buckets,
    bucketsIsArray: Array.isArray(buckets),
    bucketsLength: buckets?.length,
    bucketsLoading,
    bucketsPreview: buckets?.slice(0, 2)
  });

  // Load initial data
  useEffect(() => {
    console.log('[BucketListView] useEffect - Loading initial data');
    fetchBuckets(async () => {
      const response = await bucketApi.list();
      console.log('[BucketListView] API Response:', {
        responseType: typeof response,
        hasSuccess: 'success' in response,
        hasBuckets: 'buckets' in response,
        bucketsLength: response.buckets?.length,
        responsePreview: response
      });
      return response.buckets || [];
    });
  }, [fetchBuckets]);

  // Listen for events from header
  useEffect(() => {
    const handleCreateBucket = () => setShowCreateModal(true);
    const handleRefresh = () => {
      fetchBuckets(async () => {
        const response = await bucketApi.list();
        return response.buckets || [];
      });
    };

    window.addEventListener('open-create-bucket-modal', handleCreateBucket);
    window.addEventListener('refresh-data', handleRefresh);

    return () => {
      window.removeEventListener('open-create-bucket-modal', handleCreateBucket);
      window.removeEventListener('refresh-data', handleRefresh);
    };
  }, [fetchBuckets]);

  // Filter data based on search query
  console.log('[BucketListView] Pre-filter check:', {
    bucketsValue: buckets,
    bucketsType: typeof buckets,
    bucketsIsArray: Array.isArray(buckets),
    searchQueryValue: searchQuery,
    searchQueryType: typeof searchQuery,
    searchQueryLength: searchQuery?.length
  });

  const filteredBuckets = React.useMemo(() => {
    // Safety checks
    if (!Array.isArray(buckets)) {
      console.error('[BucketListView] Buckets is not an array:', buckets);
      return [];
    }

    if (typeof searchQuery !== 'string') {
      console.error('[BucketListView] searchQuery is not a string:', searchQuery);
      return buckets;
    }

    const filtered = buckets.filter(bucket => {
      if (!bucket) {
        console.warn('[BucketListView] Found null/undefined bucket in array');
        return false;
      }

      if (!bucket.name) {
        console.warn('[BucketListView] Found bucket without name:', bucket);
        return false;
      }

      if (typeof bucket.name !== 'string') {
        console.warn('[BucketListView] Bucket name is not a string:', bucket);
        return false;
      }

      return bucket.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    console.log('[BucketListView] Filtering results:', {
      totalBuckets: buckets.length,
      filteredCount: filtered.length,
      searchQuery,
      filteredPreview: filtered.slice(0, 3).map(b => b.name)
    });

    return filtered;
  }, [buckets, searchQuery]);

  const handleBucketSelect = useCallback((bucket) => {
    navigate(`/buckets/${encodeURIComponent(bucket.name)}`);
  }, [navigate]);

  const handleCreateBucket = useCallback(async (bucketData) => {
    await createBucket(() => bucketApi.create(bucketData.name, bucketData.region));
    await fetchBuckets(async () => {
      const response = await bucketApi.list();
      return response.buckets || [];
    });
  }, [createBucket, fetchBuckets]);

  const handleDeleteBucket = useCallback(async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteBucket(() => bucketApi.delete(deleteTarget.name));
      await fetchBuckets(async () => {
        const response = await bucketApi.list();
        return response.buckets || [];
      });
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete bucket:', error);
      
      // Close the delete confirmation modal first
      setShowDeleteModal(false);
      
      // Handle different types of errors
      if (error.code === 'BUCKET_HAS_ACCESS_POINTS') {
        // Show access point confirmation modal
        setAccessPointInfo({
          bucketName: deleteTarget.name,
          accessPoints: error.accessPoints,
          message: error.message
        });
        setShowAccessPointModal(true);
        setDeleteTarget(null);
      } else {
        // Show regular error modal
        setDeleteTarget(null);
        let userMessage = 'Failed to delete bucket. Please try again.';
        
        if (error.message) {
          if (error.message.includes('access points attached')) {
            userMessage = `Cannot delete bucket "${deleteTarget.name}" because it has access points attached. To enable automatic access point removal, please add AWS_ACCOUNT_ID to your .env file and restart the server.`;
          } else if (error.message.includes('not empty') || error.message.includes('contains objects')) {
            userMessage = `Cannot delete bucket "${deleteTarget.name}" because it contains files. Delete all files first, then try again.`;
          } else if (error.message.includes('does not exist')) {
            userMessage = `Bucket "${deleteTarget.name}" does not exist or has already been deleted.`;
          } else if (error.message.includes('Access Denied')) {
            userMessage = `Access denied. You don't have permission to delete bucket "${deleteTarget.name}".`;
          } else if (error.message.includes('AWS_ACCOUNT_ID')) {
            userMessage = error.message;
          } else {
            userMessage = `Failed to delete bucket "${deleteTarget.name}": ${error.message}`;
          }
        }
        
        setErrorMessage(userMessage);
        setShowErrorModal(true);
      }
    }
  }, [deleteBucket, deleteTarget, fetchBuckets]);

  const handleDeleteBucketWithAccessPoints = useCallback(async () => {
    if (!accessPointInfo) return;
    
    try {
      await deleteBucket(() => bucketApi.deleteWithAccessPoints(accessPointInfo.bucketName));
      await fetchBuckets(async () => {
        const response = await bucketApi.list();
        return response.buckets || [];
      });
      setShowAccessPointModal(false);
      setAccessPointInfo(null);
    } catch (error) {
      console.error('Failed to force delete bucket:', error);
      setShowAccessPointModal(false);
      setAccessPointInfo(null);
      
      let userMessage = `Failed to delete bucket with access points: ${error.message}`;
      setErrorMessage(userMessage);
      setShowErrorModal(true);
    }
  }, [deleteBucket, accessPointInfo, fetchBuckets]);

  const handleRefresh = useCallback(() => {
    fetchBuckets(async () => {
      const response = await bucketApi.list();
      return response.buckets || [];
    });
  }, [fetchBuckets]);

  return (
    <>
      {/* Buckets Grid/List */}
      {bucketsLoading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner w-6 h-6"></div>
          <p className="ml-3 text-gray-600">Loading buckets...</p>
        </div>
      ) : filteredBuckets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchQuery ? 'No buckets found matching your search.' : 'No buckets found.'}
          </p>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        )}>
          {filteredBuckets.map((bucket) => (
            <BucketCard
              key={bucket.name}
              bucket={bucket}
              onSelect={handleBucketSelect}
              onDelete={(bucket) => {
                setDeleteTarget(bucket);
                setShowDeleteModal(true);
              }}
              onSettings={(bucket) => {
                // TODO: Implement bucket settings
                console.log('Settings for bucket:', bucket.name);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateBucketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateBucket}
      />
      
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBucket}
        title="Delete Bucket"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Delete Failed"
        message={errorMessage}
        confirmText="OK"
        variant="primary"
      />

      <ConfirmModal
        isOpen={showAccessPointModal}
        onClose={() => {
          setShowAccessPointModal(false);
          setAccessPointInfo(null);
        }}
        onConfirm={handleDeleteBucketWithAccessPoints}
        title="Delete Bucket with Access Points"
        message={
          accessPointInfo 
            ? `The bucket "${accessPointInfo.bucketName}" has ${accessPointInfo.accessPoints?.length || 0} access point(s) attached that will be permanently deleted:\n\n${accessPointInfo.accessPoints?.map(ap => `• ${ap.Name}`).join('\n') || ''}\n\nThis action cannot be undone. Do you want to proceed?`
            : ''
        }
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
};

// Export functions that parent components need to call
export const useBucketListActions = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const openCreateModal = useCallback(() => {
    setShowCreateModal(true);
  }, []);
  
  return {
    showCreateModal,
    setShowCreateModal,
    openCreateModal
  };
};