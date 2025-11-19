import './TypingIndicator.css';

interface TypingIndicatorProps {
  variant?: 'default' | 'compact';
  showAvatar?: boolean;
}

export function TypingIndicator({ variant = 'default', showAvatar = true }: TypingIndicatorProps) {
  return (
    <div className={`typing-indicator typing-indicator--${variant}`}>
      {showAvatar && (
        <div className="typing-indicator-avatar">
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
      )}
      <div className="typing-indicator-content">
        <span className="typing-indicator-text">ReaChat is typing</span>
        <div className="typing-indicator-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
}
