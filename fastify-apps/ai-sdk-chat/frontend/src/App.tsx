import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type StreamMode = 'data-stream' | 'text-stream' | 'custom-stream';
type InputFormat = 'messages' | 'prompt';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<StreamMode>('data-stream');
  const [inputFormat, setInputFormat] = useState<InputFormat>('messages');
  const [promptResponse, setPromptResponse] = useState<string>('');

  const getEndpoint = (mode: StreamMode, format: InputFormat): string => {
    const suffix = format === 'prompt' ? '-prompt' : '';
    switch (mode) {
      case 'data-stream':
        return `/api/ai-sdk-chat/stream-protocol${suffix}`;
      case 'text-stream':
        return `/api/ai-sdk-chat/stream-text${suffix}`;
      case 'custom-stream':
        return `/api/ai-sdk-chat/stream-custom${suffix}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    setIsStreaming(true);

    // Prompt mode: simple one-off request
    if (inputFormat === 'prompt') {
      const userPrompt = input;
      setInput('');
      setPromptResponse('');

      try {
        const endpoint = getEndpoint(streamMode, 'prompt');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: userPrompt }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            accumulatedResponse += chunk;
            setPromptResponse(accumulatedResponse);
          }
        }
      } catch (error) {
        console.error('Error streaming response:', error);
        setPromptResponse('Error: Failed to get response from server.');
      } finally {
        setIsStreaming(false);
      }
      return;
    }

    // Messages mode: chat with history
    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    try {
      const endpoint = getEndpoint(streamMode, 'messages');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
        }
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Error: Failed to get response from server.',
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">AI SDK Chat - Stream Protocol</h1>
          <p className="text-sm text-gray-600 mt-1">
            Demonstrating Vercel AI SDK streaming with Fastify
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 w-full space-y-4">
        {/* Input Format Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Input Format:</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="messages"
                checked={inputFormat === 'messages'}
                onChange={(e) => {
                  setInputFormat(e.target.value as InputFormat);
                  setMessages([]);
                  setPromptResponse('');
                }}
                className="mr-2"
                disabled={isStreaming}
              />
              <span className="text-sm">Messages Array (Chat)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="prompt"
                checked={inputFormat === 'prompt'}
                onChange={(e) => {
                  setInputFormat(e.target.value as InputFormat);
                  setMessages([]);
                  setPromptResponse('');
                }}
                className="mr-2"
                disabled={isStreaming}
              />
              <span className="text-sm">Simple Prompt</span>
            </label>
          </div>
        </div>

        {/* Stream Mode Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Stream Mode:</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="data-stream"
                checked={streamMode === 'data-stream'}
                onChange={(e) => setStreamMode(e.target.value as StreamMode)}
                className="mr-2"
                disabled={isStreaming}
              />
              <span className="text-sm">Data Stream (Protocol)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="text-stream"
                checked={streamMode === 'text-stream'}
                onChange={(e) => setStreamMode(e.target.value as StreamMode)}
                className="mr-2"
                disabled={isStreaming}
              />
              <span className="text-sm">Text Stream</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="custom-stream"
                checked={streamMode === 'custom-stream'}
                onChange={(e) => setStreamMode(e.target.value as StreamMode)}
                className="mr-2"
                disabled={isStreaming}
              />
              <span className="text-sm">Custom Stream</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 pb-32">
        <div className="space-y-4">
          {/* Prompt Mode Display */}
          {inputFormat === 'prompt' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {!promptResponse && !isStreaming && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-lg">Enter a prompt to get started</p>
                  <p className="text-sm mt-2">
                    Try: "Invent a new holiday and describe its traditions"
                  </p>
                </div>
              )}
              {(promptResponse || isStreaming) && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2">AI Response:</div>
                  <div className="whitespace-pre-wrap text-gray-900">
                    {promptResponse || (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages Mode Display */}
          {inputFormat === 'messages' && (
            <>
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <p className="text-lg">No messages yet</p>
                  <p className="text-sm mt-2">
                    Try: "Invent a new holiday and describe its traditions"
                  </p>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-70">
                      {message.role === 'user' ? 'You' : 'AI'}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                inputFormat === 'messages' ? 'Type your message...' : 'Enter a prompt...'
              }
              disabled={isStreaming}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? 'Streaming...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
