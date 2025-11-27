import { useState } from 'react';
import { FileAttachmentPreview } from './FileAttachmentPreview';
import type { Message as MessageType } from './types';
import './Message.css';

interface MessageProps {
  message: MessageType;
  variant?: 'default' | 'compact';
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onEdit?: (id: number, newText: string) => void;
  onCopy?: (text: string) => void;
  onRegenerate?: (id: number) => void;
  onReaction?: (id: number, type: 'like' | 'dislike') => void;
  onDelete?: (id: number) => void;
}

export function Message({
  message,
  variant = 'default',
  showAvatar = true,
  showTimestamp = true,
  onEdit,
  onCopy,
  onRegenerate,
  onReaction,
  onDelete,
}: MessageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showActions, setShowActions] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const canEdit = message.isEditable !== false; // Default to true if not specified
  const canDelete = message.isDeletable !== false; // Default to true if not specified

  const handleEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit?.(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    onCopy?.(message.text);
    // Show brief feedback
    setShowActions(false);
    setTimeout(() => setShowActions(false), 100);
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const getAvatar = () => {
    if (isUser) {
      return (
        <div className="message-avatar user-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="7"
              r="4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    }
    return (
      <div className="message-avatar assistant-avatar" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2L2 7l10 5 10-5-10-5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  };

  return (
    <article
      className={`message message--${variant} message--${message.role} ${isHovered ? 'is-hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowActions(false);
      }}
      aria-label={`${message.role} message`}
    >
      <div className="message-container">
        {showAvatar && <div className="message-avatar-wrapper">{getAvatar()}</div>}

        <div className="message-content-wrapper">
          <div className="message-header">
            <span className="message-role">{isUser ? 'You' : 'Gemini'}</span>
            {showTimestamp && message.timestamp && (
              <span className="message-timestamp">{formatTime(message.timestamp)}</span>
            )}
            {!canEdit && (
              <span className="message-protected-badge" title="Protected message">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M7 11V7a5 5 0 0110 0v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            )}
          </div>

          <div className="message-body">
            {isEditing ? (
              <div className="message-edit">
                <textarea
                  className="message-edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEdit();
                    }
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditText(message.text);
                    }
                  }}
                  autoFocus
                />
                <div className="message-edit-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.text);
                    }}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={handleEdit}>
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="message-text">
                {message.text || <span className="loading-dots">...</span>}
              </p>
            )}
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="message-attachments">
              {message.attachments.map((attachment) => (
                <FileAttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  compact={variant === 'compact'}
                  showRemove={false}
                />
              ))}
            </div>
          )}

          {!isEditing && message.text && (
            <div className={`message-actions ${isHovered || showActions ? 'is-visible' : ''}`}>
              {onCopy && (
                <button
                  className="message-action-btn"
                  onClick={handleCopy}
                  title="Copy message"
                  aria-label="Copy message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              )}

              {isUser && onEdit && canEdit && (
                <button
                  className="message-action-btn"
                  onClick={() => setIsEditing(true)}
                  title="Edit message"
                  aria-label="Edit message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {onDelete && canDelete && (
                <button
                  className="message-action-btn message-action-btn--danger"
                  onClick={() => onDelete(message.id)}
                  title="Delete message"
                  aria-label="Delete message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <polyline
                      points="3 6 5 6 21 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {isAssistant && onRegenerate && (
                <button
                  className="message-action-btn"
                  onClick={() => onRegenerate(message.id)}
                  title="Regenerate response"
                  aria-label="Regenerate response"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1 4v6h6M23 20v-6h-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {isAssistant && onReaction && (
                <>
                  <button
                    className="message-action-btn"
                    onClick={() => onReaction(message.id, 'like')}
                    title="Like"
                    aria-label="Like message"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="message-action-btn"
                    onClick={() => onReaction(message.id, 'dislike')}
                    title="Dislike"
                    aria-label="Dislike message"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
