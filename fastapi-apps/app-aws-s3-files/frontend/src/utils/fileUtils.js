// File utility functions

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export const formatDate = (date) => {
  if (!date) return 'Unknown';

  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getFileType = (filename, contentType) => {
  const extension = filename.split('.').pop()?.toLowerCase();

  // Image types
  if (
    contentType?.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)
  ) {
    return 'image';
  }

  // Video types
  if (
    contentType?.startsWith('video/') ||
    ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)
  ) {
    return 'video';
  }

  // Audio types
  if (
    contentType?.startsWith('audio/') ||
    ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension)
  ) {
    return 'audio';
  }

  // Document types
  if (contentType?.includes('pdf') || ['pdf'].includes(extension)) {
    return 'document';
  }

  if (
    contentType?.includes('text/') ||
    ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(extension)
  ) {
    return 'document';
  }

  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
    return 'document';
  }

  // Archive types
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return 'archive';
  }

  return 'default';
};

export const getFileIcon = (fileType) => {
  const iconMap = {
    image: 'Image',
    document: 'FileText',
    video: 'Video',
    audio: 'Music',
    archive: 'Archive',
    default: 'File',
  };

  return iconMap[fileType] || iconMap.default;
};

export const validateFileUpload = (file, maxSize = 100 * 1024 * 1024, allowedTypes = []) => {
  const errors = [];

  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${formatFileSize(maxSize)}`);
  }

  if (allowedTypes.length > 0) {
    const fileType = getFileType(file.name, file.type);
    const isAllowed = allowedTypes.some((type) => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -2));
      }
      return file.type === type || fileType === type;
    });

    if (!isAllowed) {
      errors.push(`File type ${file.type} is not allowed`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const generateFileKey = (filename, prefix = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

  if (prefix) {
    return `${prefix}/${timestamp}_${randomString}_${sanitizedFilename}`;
  }

  return `${timestamp}_${randomString}_${sanitizedFilename}`;
};

export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
};

export const filterFilesByType = (files, typeFilter) => {
  if (typeFilter === 'all') return files;

  return files.filter((file) => {
    const fileType = getFileType(file.key, file.contentType);
    return fileType === typeFilter;
  });
};

export const filterFilesBySize = (files, sizeFilter, customMin = null, customMax = null) => {
  if (sizeFilter === 'any') return files;

  const MB = 1024 * 1024;

  return files.filter((file) => {
    const sizeInMB = file.size / MB;

    switch (sizeFilter) {
      case 'small':
        return sizeInMB < 1;
      case 'medium':
        return sizeInMB >= 1 && sizeInMB <= 10;
      case 'large':
        return sizeInMB > 10 && sizeInMB <= 100;
      case 'xlarge':
        return sizeInMB > 100;
      case 'custom': {
        const min = customMin ? parseFloat(customMin) : 0;
        const max = customMax ? parseFloat(customMax) : Infinity;
        return sizeInMB >= min && sizeInMB <= max;
      }
      default:
        return true;
    }
  });
};

export const filterFiles = (files, searchQuery, filters) => {
  let filteredFiles = files;

  // Apply search filter
  if (searchQuery) {
    filteredFiles = filteredFiles.filter((file) =>
      file.key.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  // Apply type filter
  filteredFiles = filterFilesByType(filteredFiles, filters.type || 'all');

  // Apply size filter
  filteredFiles = filterFilesBySize(
    filteredFiles,
    filters.sizeRange || 'any',
    filters.customSizeMin,
    filters.customSizeMax,
  );

  return filteredFiles;
};
