import type { Message } from '../components/types';

export interface MessageGroup {
  date: Date;
  label: string;
  messages: Message[];
}

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

const formatGroupLabel = (date: Date): string => {
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }

  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  // Within last week
  if (daysDiff < 7) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  }

  // Within current year
  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  // Older than current year
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

export const groupMessagesByDate = (messages: Message[]): MessageGroup[] => {
  if (messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages.forEach((message) => {
    const messageDate = message.timestamp || new Date();

    // If no current group or message is from a different day, create new group
    if (!currentGroup || !isSameDay(currentGroup.date, messageDate)) {
      currentGroup = {
        date: messageDate,
        label: formatGroupLabel(messageDate),
        messages: [message],
      };
      groups.push(currentGroup);
    } else {
      // Add to existing group
      currentGroup.messages.push(message);
    }
  });

  return groups;
};

// Alternative: Group by time gaps (for grouping within same day)
export const groupMessagesByTimeGap = (
  messages: Message[],
  gapMinutes: number = 60,
): MessageGroup[] => {
  if (messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages.forEach((message, index) => {
    const messageDate = message.timestamp || new Date();

    if (index === 0) {
      // First message starts a new group
      currentGroup = {
        date: messageDate,
        label: formatGroupLabel(messageDate),
        messages: [message],
      };
      groups.push(currentGroup);
    } else {
      const prevMessage = messages[index - 1];
      const prevDate = prevMessage.timestamp || new Date();
      const timeDiffMinutes = (messageDate.getTime() - prevDate.getTime()) / (1000 * 60);

      // If different day or time gap is large, start new group
      if (!isSameDay(messageDate, prevDate) || timeDiffMinutes > gapMinutes) {
        currentGroup = {
          date: messageDate,
          label: formatGroupLabel(messageDate),
          messages: [message],
        };
        groups.push(currentGroup);
      } else if (currentGroup) {
        // Add to existing group
        currentGroup.messages.push(message);
      }
    }
  });

  return groups;
};
