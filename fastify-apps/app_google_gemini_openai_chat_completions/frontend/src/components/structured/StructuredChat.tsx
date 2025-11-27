import { useState, useCallback } from 'react';
import { SchemaBuilder, type SchemaState } from '../schema';
import { ChatInput } from '../ChatInput';
import { StructuredMessageCard } from './StructuredMessageCard';
import { sendStructuredChat, type StructuredChatResponse } from '../../providers/gemini';
import './StructuredChat.css';

interface StructuredMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  response?: StructuredChatResponse;
  timestamp: Date;
}

export function StructuredChat() {
  const [schema, setSchema] = useState<SchemaState>({
    name: '',
    fields: [],
  });
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<StructuredMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSchema = useCallback((): boolean => {
    if (!schema.name.trim()) {
      setSchemaError('Schema name is required');
      return false;
    }
    if (schema.fields.length === 0) {
      setSchemaError('At least one field is required');
      return false;
    }
    for (const field of schema.fields) {
      if (!field.name.trim()) {
        setSchemaError('All fields must have a name');
        return false;
      }
    }
    const names = schema.fields.map((f) => f.name);
    if (new Set(names).size !== names.length) {
      setSchemaError('Duplicate field names detected');
      return false;
    }
    setSchemaError(null);
    return true;
  }, [schema]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!validateSchema()) return;

    const userMessage: StructuredMessage = {
      id: Date.now(),
      role: 'user',
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const schemaDefinition = {
        name: schema.name,
        properties: schema.fields.reduce((acc, field) => {
          acc[field.name] = {
            type: field.type,
            description: field.description || undefined,
          };
          return acc;
        }, {} as Record<string, unknown>),
        required: schema.fields.filter((f) => f.required).map((f) => f.name),
      };

      const response = await sendStructuredChat(
        [{ role: 'user', content: userMessage.text }],
        schemaDefinition
      );

      const assistantMessage: StructuredMessage = {
        id: Date.now(),
        role: 'assistant',
        text: response.raw,
        response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMessages = () => {
    setMessages([]);
    setError(null);
  };

  const handleExampleSelect = (example: string) => {
    setInputValue(example);
  };

  return (
    <div className="structured-chat">
      <div className="structured-chat-schema">
        <div className="schema-section-header">
          <h3>Define Output Schema</h3>
          <p>Define the JSON structure for Gemini's response</p>
        </div>
        <SchemaBuilder
          schema={schema}
          onSchemaChange={setSchema}
          onExampleSelect={handleExampleSelect}
          error={schemaError}
        />
      </div>

      <div className="structured-chat-main">
        <div className="structured-chat-header">
          <h3>Chat</h3>
          {messages.length > 0 && (
            <button className="clear-btn" onClick={handleClearMessages}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Clear
            </button>
          )}
        </div>

        <div className="structured-chat-messages">
          {messages.length === 0 ? (
            <div className="structured-chat-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p>Define a schema above, then send a message to get structured output</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className={`structured-message structured-message--${message.role}`}>
                  {message.role === 'user' ? (
                    <div className="user-message-bubble">
                      <span className="message-role">You</span>
                      <p>{message.text}</p>
                    </div>
                  ) : message.response ? (
                    <div className="assistant-response">
                      <span className="message-role">Gemini</span>
                      <StructuredMessageCard response={message.response} />
                    </div>
                  ) : null}
                </div>
              ))}

              {isLoading && (
                <div className="structured-message structured-message--assistant">
                  <div className="assistant-response">
                    <span className="message-role">Gemini</span>
                    <div className="loading-card">
                      <div className="loading-dots">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                      </div>
                      <span>Processing with schema: {schema.name}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="structured-chat-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="structured-chat-input">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder="Ask Gemini to generate structured data..."
          />
        </div>
      </div>
    </div>
  );
}
