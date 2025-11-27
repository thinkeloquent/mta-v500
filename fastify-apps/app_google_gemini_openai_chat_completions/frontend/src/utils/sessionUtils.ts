import type { Message } from '../components/types';
import type { ChatSession, SessionGroup, SessionGroupKey } from '../types/session';

export const createNewSession = (id?: string): ChatSession => {
  return {
    id: id || generateSessionId(),
    title: 'New Chat',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateSessionTitle = (messages: Message[]): string => {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return 'New Chat';

  const title = firstUserMessage.text.trim();
  return title.length > 50 ? `${title.substring(0, 47)}...` : title;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

export const isLastWeek = (date: Date): boolean => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date >= weekAgo && !isToday(date) && !isYesterday(date);
};

export const isLastMonth = (date: Date): boolean => {
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date >= monthAgo && date < weekAgo;
};

export const getSessionGroupKey = (date: Date): SessionGroupKey => {
  if (isToday(date)) return 'today';
  if (isYesterday(date)) return 'yesterday';
  if (isLastWeek(date)) return 'lastWeek';
  if (isLastMonth(date)) return 'lastMonth';
  return 'older';
};

export const getSessionGroupLabel = (key: SessionGroupKey): string => {
  const labels: Record<SessionGroupKey, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    lastWeek: 'Previous 7 Days',
    lastMonth: 'Previous 30 Days',
    older: 'Older',
  };
  return labels[key];
};

export const groupSessionsByDate = (sessions: ChatSession[]): SessionGroup[] => {
  const groups: Record<SessionGroupKey, ChatSession[]> = {
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  };

  sessions.forEach((session) => {
    const key = getSessionGroupKey(session.updatedAt);
    groups[key].push(session);
  });

  const result: SessionGroup[] = [];
  const order: SessionGroupKey[] = ['today', 'yesterday', 'lastWeek', 'lastMonth', 'older'];

  order.forEach((key) => {
    if (groups[key].length > 0) {
      result.push({
        label: getSessionGroupLabel(key),
        sessions: groups[key].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      });
    }
  });

  return result;
};

// localStorage helpers - using unique key for Gemini chat
const STORAGE_KEY = 'gemini_chat_sessions';

export const saveSessions = (sessions: ChatSession[]): void => {
  try {
    const serialized = JSON.stringify(
      sessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messages: session.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp?.toISOString(),
        })),
      })),
    );
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save sessions:', error);
  }
};

export const loadSessions = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
      })),
    }));
  } catch (error) {
    console.error('Failed to load sessions:', error);
    return [];
  }
};

export const deleteSessionFromStorage = (sessionId: string): void => {
  const sessions = loadSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  saveSessions(filtered);
};
