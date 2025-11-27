import type { ChatSession } from '../types/session';
import { groupSessionsByDate } from '../utils/sessionUtils';
import { SessionItem } from './SessionItem';
import './SessionsList.css';

interface SessionsListProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export function SessionsList({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
}: SessionsListProps) {
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="sessions-list">
      <div className="sessions-list-header">
        <button
          className="new-session-btn"
          onClick={onNewSession}
          title="New chat"
          aria-label="Create new chat session"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      <div className="sessions-list-content">
        {groupedSessions.length === 0 ? (
          <div className="sessions-list-empty">
            <p>No sessions yet</p>
            <span>Start a new conversation</span>
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.label} className="session-group">
              <div className="session-group-label">{group.label}</div>
              <div className="session-group-items">
                {group.sessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={() => onDeleteSession(session.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
