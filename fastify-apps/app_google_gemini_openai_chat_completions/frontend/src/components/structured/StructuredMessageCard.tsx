import { useState } from 'react';
import type { StructuredChatResponse } from '../../providers/gemini';
import './StructuredMessageCard.css';

interface StructuredMessageCardProps {
  response: StructuredChatResponse;
  onCopy?: () => void;
}

export function StructuredMessageCard({ response, onCopy }: StructuredMessageCardProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  const handleCopy = () => {
    const text = response.success && response.data
      ? JSON.stringify(response.data, null, 2)
      : response.raw;
    navigator.clipboard.writeText(text);
    onCopy?.();
  };

  const formatValue = (value: unknown): React.ReactNode => {
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="empty-value">[]</span>;
      return (
        <ul className="structured-list">
          {value.map((item, idx) => (
            <li key={idx}>
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="nested-object">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`boolean-value ${value ? 'boolean-true' : 'boolean-false'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }

    if (value === null || value === undefined) {
      return <span className="empty-value">null</span>;
    }

    return String(value);
  };

  return (
    <div className={`structured-message-card ${response.success ? '' : 'structured-message-card--error'}`}>
      <div className="structured-message-header">
        <div className="structured-message-status">
          {response.success ? (
            <>
              <svg className="status-icon status-icon--success" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <polyline points="9 12 11 14 15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Structured Output</span>
            </>
          ) : (
            <>
              <svg className="status-icon status-icon--error" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Parsing Failed</span>
            </>
          )}
        </div>

        <div className="structured-message-actions">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'formatted' ? 'view-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('formatted')}
              title="Formatted view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'raw' ? 'view-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('raw')}
              title="Raw JSON"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <button className="copy-btn" onClick={handleCopy} title="Copy to clipboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="structured-message-content">
        {viewMode === 'formatted' && response.success && response.data ? (
          <dl className="structured-data">
            {Object.entries(response.data).map(([key, value]) => (
              <div key={key} className="structured-field">
                <dt>{key}</dt>
                <dd>{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : viewMode === 'formatted' && !response.success ? (
          <div className="structured-error">
            <p className="error-message">{response.error || 'Failed to parse response'}</p>
            <details className="raw-details">
              <summary>View raw response</summary>
              <pre>{response.raw}</pre>
            </details>
          </div>
        ) : (
          <pre className="raw-json">
            {response.success && response.data
              ? JSON.stringify(response.data, null, 2)
              : response.raw}
          </pre>
        )}
      </div>

      {response.usage && (
        <div className="structured-message-footer">
          <span className="usage-info">
            Model: {response.model} | Tokens: {response.usage.total_tokens || 'N/A'}
          </span>
        </div>
      )}
    </div>
  );
}
