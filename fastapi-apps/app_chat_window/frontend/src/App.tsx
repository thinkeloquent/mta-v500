import { useEffect, useState } from 'react';
import './App.css';
import { getAIProvider, isAIConfigured, sendMessage } from './ai';
import { ChatInput, MessageList, SessionsList } from './components';
import type { FileAttachment, Message } from './components/types';
import type { ChatSession } from './types/session';
import {
  createNewSession,
  generateSessionTitle,
  loadSessions,
  saveSessions,
} from './utils/sessionUtils';

// Get environment configuration for CORS check - uses host-relative path
const SERVER_API_URL = import.meta.env.VITE_APP_CHAT_WINDOW_CONFIG_SERVER_API_URL || '';

type ChatVariant = 'default' | 'compact';

function App() {
  const aiConfigured = isAIConfigured();
  const aiProvider = getAIProvider();

  // UI Settings
  const [variant, setVariant] = useState<ChatVariant>('default');
  const [showAvatars, setShowAvatars] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Session Management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corsStatus, setCorsStatus] = useState<'checking' | 'ok' | 'blocked' | 'error'>('checking');

  // Get current session
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Session Management Functions - defined early to be available for useEffect hooks
  const updateCurrentSessionMessages = (updater: (messages: Message[]) => Message[]) => {
    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === currentSessionId
          ? {
              ...session,
              messages: updater(session.messages),
              updatedAt: new Date(),
              title:
                session.messages.length === 0
                  ? generateSessionTitle(updater(session.messages))
                  : session.title,
            }
          : session,
      ),
    );
  };

  // Protected messages configuration
  const [protectedMessageIds, setProtectedMessageIds] = useState<Set<number>>(new Set([1])); // Protect first message by default

  // Utility functions to manage protected messages
  const protectMessage = (id: number) => {
    setProtectedMessageIds((prev) => new Set(prev).add(id));
  };

  const unprotectMessage = (id: number) => {
    setProtectedMessageIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const protectMessagesByIds = (ids: number[]) => {
    setProtectedMessageIds((prev) => new Set([...prev, ...ids]));
  };

  const isMessageProtected = (id: number) => {
    return protectedMessageIds.has(id);
  };

  // Check message protection based on metadata
  const isProtectedByMetadata = (message: Message): boolean => {
    if (!message.metadata) return false;
    // Example: Protect messages with specific metadata flags
    return message.metadata.protected === true || message.metadata.system === true;
  };

  // Apply protection flags to messages
  useEffect(() => {
    updateCurrentSessionMessages((currentMessages) =>
      currentMessages.map((msg) => ({
        ...msg,
        isEditable: !isMessageProtected(msg.id) && !isProtectedByMetadata(msg),
        isDeletable: !isMessageProtected(msg.id) && !isProtectedByMetadata(msg),
      })),
    );
  }, [isMessageProtected, updateCurrentSessionMessages, isProtectedByMetadata]);

  // Expose protection utilities for development/testing (optional)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).chatProtection = {
        protectMessage,
        unprotectMessage,
        protectMessagesByIds,
        isMessageProtected,
        getProtectedIds: () => Array.from(protectedMessageIds),
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).chatProtection;
      }
    };
  }, [protectedMessageIds, protectMessage, unprotectMessage, protectMessagesByIds, isMessageProtected]);

  // CORS connectivity check on startup
  useEffect(() => {
    const checkCorsConnectivity = async () => {
      try {
        const pingUrl = `${SERVER_API_URL}/api/ai-sdk-examples`;
        console.log(`[CORS Check] Pinging ${pingUrl}...`);

        const response = await fetch(pingUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log('[CORS Check] ✓ Connection successful - CORS is properly configured');
          setCorsStatus('ok');
        } else {
          console.warn(`[CORS Check] Server returned ${response.status}: ${response.statusText}`);
          setCorsStatus('error');
        }
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          console.error('[CORS Check] ✗ CORS blocked - Unable to connect to', SERVER_API_URL);
          console.error('[CORS Check] This usually means CORS headers are not being sent by the server.');
          console.error('[CORS Check] Check the server logs and ensure CORS is configured to allow:', window.location.origin);
          setCorsStatus('blocked');
        } else {
          console.error('[CORS Check] Connection error:', err);
          setCorsStatus('error');
        }
      }
    };

    checkCorsConnectivity();
  }, []);

  // Initialize sessions from localStorage
  useEffect(() => {
    const loaded = loadSessions();
    if (loaded.length > 0) {
      setSessions(loaded);
      setCurrentSessionId(loaded[0].id);
    } else {
      // Create initial session with welcome message
      const initialSession = createNewSession();
      initialSession.title = 'Welcome';
      initialSession.messages = [
        {
          id: 1,
          role: 'assistant',
          text: aiConfigured
            ? `Hello! I'm ReaChat powered by ${aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'}. How can I help you today?`
            : 'Hello! I am ReaChat. Please configure your API keys in .env to use AI features. For now, I will echo your messages back.',
          timestamp: new Date(),
        },
      ];
      setSessions([initialSession]);
      setCurrentSessionId(initialSession.id);
    }
  }, [aiConfigured, aiProvider]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions);
    }
  }, [sessions]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullScreen]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullScreen]);

  const handleNewSession = () => {
    const newSession = createNewSession();
    newSession.messages = [
      {
        id: 1,
        role: 'assistant',
        text: aiConfigured
          ? `Hello! I'm ReaChat powered by ${aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'}. How can I help you today?`
          : 'Hello! I am ReaChat. Please configure your API keys in .env to use AI features. For now, I will echo your messages back.',
        timestamp: new Date(),
      },
    ];
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setDraft('');
    setAttachments([]);
    setError(null);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setDraft('');
    setAttachments([]);
    setError(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        // If deleting last session, create a new one
        const newSession = createNewSession();
        newSession.messages = [
          {
            id: 1,
            role: 'assistant',
            text: aiConfigured
              ? `Hello! I'm ReaChat powered by ${aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'}. How can I help you today?`
              : 'Hello! I am ReaChat. Please configure your API keys in .env to use AI features. For now, I will echo your messages back.',
            timestamp: new Date(),
          },
        ];
        setCurrentSessionId(newSession.id);
        return [newSession];
      }

      // If deleting current session, switch to first available
      if (sessionId === currentSessionId) {
        setCurrentSessionId(filtered[0].id);
      }

      return filtered;
    });
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if ((!trimmed && attachments.length === 0) || isLoading) {
      return;
    }

    setError(null);
    const nextId = messages.length > 0 ? messages[messages.length - 1].id : 1;
    const userMessage: Message = {
      id: nextId + 1,
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    // Add user message
    updateCurrentSessionMessages((current) => [...current, userMessage]);
    setDraft('');
    setAttachments([]);
    setIsLoading(true);

    // Create placeholder for assistant message
    const assistantMessageId = nextId + 2;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      text: '',
      timestamp: new Date(),
    };
    updateCurrentSessionMessages((current) => [...current, assistantMessage]);

    try {
      if (!aiConfigured) {
        // Fallback echo mode
        await new Promise((resolve) => setTimeout(resolve, 1000));
        updateCurrentSessionMessages((current) =>
          current.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, text: `ReaChat heard: "${trimmed}". Hello world!` }
              : msg,
          ),
        );
      } else {
        // Use AI API
        const conversationHistory = [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.text,
        }));

        await sendMessage(conversationHistory, (chunk) => {
          updateCurrentSessionMessages((current) =>
            current.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, text: msg.text + chunk } : msg,
            ),
          );
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      // Remove the empty assistant message on error
      updateCurrentSessionMessages((current) =>
        current.filter((msg) => msg.id !== assistantMessageId),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMessage = (id: number, newText: string) => {
    // Prevent editing protected messages
    if (isMessageProtected(id)) {
      console.warn('Cannot edit protected message:', id);
      return;
    }

    updateCurrentSessionMessages((current) =>
      current.map((msg) => {
        if (msg.id === id && msg.isEditable !== false) {
          return { ...msg, text: newText };
        }
        return msg;
      }),
    );
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRegenerateMessage = async (id: number) => {
    // Find the message and the user message before it
    const messageIndex = messages.findIndex((m) => m.id === id);
    if (messageIndex === -1 || messageIndex === 0) return;

    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== 'user') return;

    // Remove the assistant message and regenerate
    updateCurrentSessionMessages((current) => current.filter((m) => m.id !== id));
    setError(null);
    setIsLoading(true);

    const assistantMessage: Message = {
      id,
      role: 'assistant',
      text: '',
      timestamp: new Date(),
    };
    updateCurrentSessionMessages((current) => [...current, assistantMessage]);

    try {
      if (!aiConfigured) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        updateCurrentSessionMessages((current) =>
          current.map((msg) =>
            msg.id === id
              ? {
                  ...msg,
                  text: `ReaChat heard: "${userMessage.text}". Hello world! (Regenerated)`,
                }
              : msg,
          ),
        );
      } else {
        const conversationHistory = messages.slice(0, messageIndex).map((msg) => ({
          role: msg.role,
          content: msg.text,
        }));

        await sendMessage(conversationHistory, (chunk) => {
          updateCurrentSessionMessages((current) =>
            current.map((msg) => (msg.id === id ? { ...msg, text: msg.text + chunk } : msg)),
          );
        });
      }
    } catch (err) {
      console.error('Error regenerating message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate message';
      setError(errorMessage);
      updateCurrentSessionMessages((current) => current.filter((msg) => msg.id !== id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = (id: number, type: 'like' | 'dislike') => {
    console.log(`Reaction ${type} for message ${id}`);
    // You can implement reaction storage/tracking here
  };

  const handleDeleteMessage = (id: number) => {
    // Prevent deleting protected messages
    if (isMessageProtected(id)) {
      console.warn('Cannot delete protected message:', id);
      return;
    }

    // Check if message is protected by metadata
    const message = messages.find((m) => m.id === id);
    if (message && isProtectedByMetadata(message)) {
      console.warn('Cannot delete protected message:', id);
      return;
    }

    // Remove the message from the current session
    updateCurrentSessionMessages((current) => current.filter((msg) => msg.id !== id));
  };

  return (
    <div
      className={`chat-app ${isFullScreen ? 'chat-app--fullscreen' : ''} ${showSidebar ? 'chat-app--with-sidebar' : ''}`}
    >
      {showSidebar && (
        <aside className="chat-sidebar">
          <SessionsList
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onNewSession={handleNewSession}
          />
        </aside>
      )}
      <div className="chat-content">
        <header className="chat-header">
          <div className="chat-header-title">
            <h1>ReaChat</h1>
            <span className="chat-header-subtitle">
              {aiConfigured
                ? `Powered by ${aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'}`
                : 'Demo Mode'}
              {corsStatus === 'blocked' && (
                <span style={{ color: '#ef4444', marginLeft: '8px' }} title="CORS is blocking requests to the API server">
                  ⚠ CORS Blocked
                </span>
              )}
              {corsStatus === 'error' && (
                <span style={{ color: '#f59e0b', marginLeft: '8px' }} title="Unable to connect to API server">
                  ⚠ Server Error
                </span>
              )}
              {corsStatus === 'checking' && (
                <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                  Checking connection...
                </span>
              )}
            </span>
          </div>

          <div className="chat-header-controls">
            <button
              className={`control-btn ${showSidebar ? 'active' : ''}`}
              onClick={() => setShowSidebar(!showSidebar)}
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="9"
                  y1="3"
                  x2="9"
                  y2="21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className={`control-btn ${variant === 'default' ? 'active' : ''}`}
              onClick={() => setVariant('default')}
              title="Default view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="14"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="3"
                  y="14"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="14"
                  y="14"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <button
              className={`control-btn ${variant === 'compact' ? 'active' : ''}`}
              onClick={() => setVariant('compact')}
              title="Compact view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line
                  x1="4"
                  y1="6"
                  x2="20"
                  y2="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="4"
                  y1="12"
                  x2="20"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="4"
                  y1="18"
                  x2="20"
                  y2="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              className={`control-btn ${showAvatars ? 'active' : ''}`}
              onClick={() => setShowAvatars(!showAvatars)}
              title="Toggle avatars"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              className={`control-btn ${showTimestamps ? 'active' : ''}`}
              onClick={() => setShowTimestamps(!showTimestamps)}
              title="Toggle timestamps"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              className={`control-btn ${isFullScreen ? 'active' : ''}`}
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
            >
              {isFullScreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main className="chat-main">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            error={error}
            variant={variant}
            showAvatars={showAvatars}
            showTimestamps={showTimestamps}
            onEditMessage={handleEditMessage}
            onCopyMessage={handleCopyMessage}
            onRegenerateMessage={handleRegenerateMessage}
            onReaction={handleReaction}
            onDeleteMessage={handleDeleteMessage}
          />
        </main>

        <footer className="chat-footer">
          <ChatInput
            value={draft}
            onChange={setDraft}
            onSubmit={handleSend}
            disabled={isLoading}
            placeholder="Send ReaChat a message..."
            variant={variant}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            maxFileSize={10 * 1024 * 1024}
          />
        </footer>
      </div>
    </div>
  );
}

export default App;
