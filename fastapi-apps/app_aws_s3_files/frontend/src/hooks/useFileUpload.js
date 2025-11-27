import { useCallback, useState } from 'react';
import { fileApi } from '../services/api.js';
import { generateFileKey, validateFileUpload } from '../utils/fileUtils.js';

export const useFileUpload = (bucket, options = {}) => {
  const [uploads, setUploads] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file, key = null) => {
      const uploadId = `${file.name}-${Date.now()}`;
      const fileKey = key || generateFileKey(file.name, options.prefix);

      // Validate file
      const validation = validateFileUpload(file, options.maxSize, options.allowedTypes);

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Initialize upload progress
      setUploads((prev) => ({
        ...prev,
        [uploadId]: {
          id: uploadId,
          file: file,
          key: fileKey,
          progress: 0,
          status: 'uploading',
          error: null,
        },
      }));

      try {
        setIsUploading(true);

        // Simulate progress for better UX (since we can't track real progress with fetch)
        const progressInterval = setInterval(() => {
          setUploads((prev) => {
            if (prev[uploadId] && prev[uploadId].progress < 90) {
              return {
                ...prev,
                [uploadId]: {
                  ...prev[uploadId],
                  progress: prev[uploadId].progress + Math.random() * 20,
                },
              };
            }
            return prev;
          });
        }, 200);

        const result = await fileApi.upload(bucket, file, fileKey);

        clearInterval(progressInterval);

        // Mark as completed
        setUploads((prev) => ({
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            progress: 100,
            status: 'completed',
            result,
          },
        }));

        // Remove from uploads after delay
        setTimeout(() => {
          setUploads((prev) => {
            const newUploads = { ...prev };
            delete newUploads[uploadId];
            return newUploads;
          });
        }, 3000);

        return result;
      } catch (error) {
        // Mark as failed
        setUploads((prev) => ({
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            status: 'failed',
            error: error.message,
          },
        }));

        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, options],
  );

  const uploadMultiple = useCallback(
    async (files) => {
      const uploadPromises = files.map((file) => uploadFile(file));
      return Promise.allSettled(uploadPromises);
    },
    [uploadFile],
  );

  const clearUpload = useCallback((uploadId) => {
    setUploads((prev) => {
      const newUploads = { ...prev };
      delete newUploads[uploadId];
      return newUploads;
    });
  }, []);

  const clearAllUploads = useCallback(() => {
    setUploads({});
  }, []);

  return {
    uploads,
    isUploading,
    uploadFile,
    uploadMultiple,
    clearUpload,
    clearAllUploads,
  };
};
