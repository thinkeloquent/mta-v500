import { formatFileSize, getFileIcon, isImageFile } from '../utils/fileUtils';
import type { FileAttachment } from './types';
import './FileAttachmentPreview.css';

interface FileAttachmentPreviewProps {
  attachment: FileAttachment;
  onRemove?: (id: string) => void;
  compact?: boolean;
  showRemove?: boolean;
}

export function FileAttachmentPreview({
  attachment,
  onRemove,
  compact = false,
  showRemove = true,
}: FileAttachmentPreviewProps) {
  const isImage = isImageFile(attachment.type);

  const handleDownload = () => {
    if (attachment.url) {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      link.click();
    }
  };

  return (
    <div className={`file-attachment ${compact ? 'file-attachment--compact' : ''}`}>
      {isImage && attachment.preview ? (
        <div className="file-attachment-preview">
          <img src={attachment.preview} alt={attachment.name} />
          {showRemove && onRemove && (
            <button
              className="file-attachment-remove"
              onClick={() => onRemove(attachment.id)}
              aria-label="Remove file"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="file-attachment-card">
          <div className="file-attachment-icon">
            <span className="file-icon">{getFileIcon(attachment.type)}</span>
          </div>
          <div className="file-attachment-info">
            <div className="file-attachment-name" title={attachment.name}>
              {attachment.name}
            </div>
            <div className="file-attachment-meta">
              <span className="file-attachment-size">{formatFileSize(attachment.size)}</span>
            </div>
          </div>
          <div className="file-attachment-actions">
            {attachment.url && (
              <button
                className="file-attachment-action"
                onClick={handleDownload}
                title="Download"
                aria-label="Download file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="7 10 12 15 17 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="12"
                    y1="15"
                    x2="12"
                    y2="3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            {showRemove && onRemove && (
              <button
                className="file-attachment-action"
                onClick={() => onRemove(attachment.id)}
                title="Remove"
                aria-label="Remove file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
