import type { Message } from '../components/types';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface SessionGroup {
  label: string;
  sessions: ChatSession[];
}

export type SessionGroupKey = 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'older';
