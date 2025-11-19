export type MessageRole = 'assistant' | 'user';

export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url?: string;
  preview?: string;
}

export interface Message {
  id: number;
  role: MessageRole;
  text: string;
  timestamp?: Date;
  isEditing?: boolean;
  reactions?: MessageReaction[];
  attachments?: FileAttachment[];
  isEditable?: boolean;
  isDeletable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MessageReaction {
  type: 'like' | 'dislike';
  timestamp: Date;
}

export interface ChatMode {
  variant: 'default' | 'compact';
  showAvatars: boolean;
  showTimestamps: boolean;
}
