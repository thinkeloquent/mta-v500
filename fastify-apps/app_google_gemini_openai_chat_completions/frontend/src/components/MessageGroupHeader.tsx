import './MessageGroupHeader.css';

interface MessageGroupHeaderProps {
  label: string;
  variant?: 'default' | 'compact';
}

export function MessageGroupHeader({ label, variant = 'default' }: MessageGroupHeaderProps) {
  return (
    <div className={`message-group-header message-group-header--${variant}`}>
      <div className="message-group-header-line" />
      <span className="message-group-header-label">{label}</span>
      <div className="message-group-header-line" />
    </div>
  );
}
