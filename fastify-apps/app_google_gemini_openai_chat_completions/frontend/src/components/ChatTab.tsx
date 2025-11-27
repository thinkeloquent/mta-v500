import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import type { Message, FileAttachment } from './types';
import { sendChatMessage, type ChatMessage } from '../providers/gemini';
import './ChatTab.css';

export function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: inputValue.trim(),
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setAttachments([]);
    setIsLoading(true);
    setError(null);

    try {
      // Build conversation history
      const chatMessages: ChatMessage[] = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.text,
      }));

      const response = await sendChatMessage(chatMessages);

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        text: response.content,
        timestamp: new Date(),
        metadata: {
          model: response.model,
          usage: response.usage,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, attachments, isLoading, messages]);

  const handleAttachmentsChange = useCallback((newAttachments: FileAttachment[]) => {
    setAttachments(newAttachments);
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const handleEditMessage = useCallback((id: number, newText: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, text: newText } : msg))
    );
  }, []);

  const handleDeleteMessage = useCallback((id: number) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  return (
    <div className="chat-tab">
      <div className="chat-tab-header">
        <h3>Chat with Gemini</h3>
        {messages.length > 0 && (
          <button className="clear-chat-btn" onClick={handleClearChat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Clear
          </button>
        )}
      </div>

      <div className="chat-tab-messages">
        {messages.length === 0 ? (
          <div className="chat-tab-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3>Start a conversation</h3>
            <p>Send a message to chat with Google Gemini</p>
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
            />
            <div ref={messagesEndRef} />
          </>
        )}

        {isLoading && <TypingIndicator />}

        {error && (
          <div className="chat-tab-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="chat-tab-input">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          onAttachmentsChange={handleAttachmentsChange}
          attachments={attachments}
          disabled={isLoading}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}
