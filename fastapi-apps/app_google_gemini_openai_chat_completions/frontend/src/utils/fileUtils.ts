export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
};

export const getFileIcon = (type: string): string => {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📊';
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return '🗜️';
  if (type.includes('text')) return '📝';
  return '📎';
};

export const isImageFile = (type: string): boolean => {
  return type.startsWith('image/');
};

export const isVideoFile = (type: string): boolean => {
  return type.startsWith('video/');
};

export const createFilePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file.type)) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const validateFile = (
  file: File,
  maxSize: number = 10 * 1024 * 1024, // 10MB default
  allowedTypes?: string[],
): { valid: boolean; error?: string } => {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)}`,
    };
  }

  if (allowedTypes && !allowedTypes.some((type) => file.type.includes(type))) {
    return {
      valid: false,
      error: 'File type not allowed',
    };
  }

  return { valid: true };
};
