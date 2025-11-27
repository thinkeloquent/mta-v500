import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { createFilePreview, validateFile } from '../utils/fileUtils';
import { FileAttachmentPreview } from './FileAttachmentPreview';
import type { FileAttachment } from './types';
import './ChatInput.css';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  variant?: 'default' | 'compact';
  attachments?: FileAttachment[];
  onAttachmentsChange?: (attachments: FileAttachment[]) => void;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Send a message...',
  variant = 'default',
  attachments = [],
  onAttachmentsChange,
  maxFileSize,
  allowedFileTypes,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!value.trim() && attachments.length === 0) || disabled) return;
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if ((value.trim() || attachments.length > 0) && !disabled) {
        onSubmit();
      }
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !onAttachmentsChange) return;

    setUploadError(null);

    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file
      const validation = validateFile(file, maxFileSize, allowedFileTypes);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        continue;
      }

      // Create preview for images
      const preview = await createFilePreview(file);

      const attachment: FileAttachment = {
        id: `${Date.now()}-${i}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        preview: preview || undefined,
      };

      newAttachments.push(attachment);
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    if (!onAttachmentsChange) return;

    const attachment = attachments.find((a) => a.id === id);
    if (attachment?.url) {
      URL.revokeObjectURL(attachment.url);
    }

    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <form
      className={`chat-input chat-input--${variant} ${isFocused ? 'is-focused' : ''} ${disabled ? 'is-disabled' : ''}`}
      onSubmit={handleSubmit}
    >
      {attachments.length > 0 && (
        <div className="chat-input-attachments">
          {attachments.map((attachment) => (
            <FileAttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={handleRemoveAttachment}
              compact={variant === 'compact'}
            />
          ))}
        </div>
      )}

      {uploadError && (
        <div className="chat-input-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>{uploadError}</span>
        </div>
      )}

      <div className="chat-input-wrapper">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled}
          accept={allowedFileTypes?.join(',') || undefined}
        />

        {onAttachmentsChange && (
          <button
            type="button"
            className="chat-input-attach"
            onClick={handleAttachClick}
            disabled={disabled}
            title="Attach files"
            aria-label="Attach files"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <label className="sr-only" htmlFor="chat-input-field">
          Type a message
        </label>
        <textarea
          id="chat-input-field"
          className="chat-input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          style={{
            minHeight: variant === 'compact' ? '36px' : '44px',
            maxHeight: '200px',
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
        />
        <button
          type="submit"
          className="chat-input-submit"
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          aria-label="Send message"
        >
          {disabled ? (
            <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="60"
                strokeDashoffset="30"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
