import { useEffect, useState } from 'react';
import { Tabs, TabPanel } from './components/Tabs';
import { ChatTab } from './components/ChatTab';
import { StructuredChat } from './components/structured';
import { fetchHealthCheck, type HealthCheckResponse } from './api';
import './App.css';

type TabId = 'chat' | 'structured';

const tabs = [
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'structured',
    label: 'Structured Output',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await fetchHealthCheck();
        setHealth(data);
      } catch (err) {
        setHealthError(err instanceof Error ? err.message : 'Failed to connect');
      }
    };
    checkHealth();
  }, []);

  const isHealthy = health && (health.status === 'ok' || health.status === 'healthy');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="app-logo">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h1>Gemini Chat</h1>
              <p>Google Gemini via OpenAI-compatible API</p>
            </div>
          </div>
          <div className="app-status">
            <span className={`status-indicator ${isHealthy ? 'status-healthy' : healthError ? 'status-error' : 'status-loading'}`} />
            <span className="status-text">
              {isHealthy ? 'Connected' : healthError ? 'Disconnected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {healthError ? (
          <div className="app-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h2>Unable to connect</h2>
            <p>{healthError}</p>
            <button onClick={() => window.location.reload()}>
              Retry Connection
            </button>
          </div>
        ) : (
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabId)}>
            <TabPanel id="chat" activeTab={activeTab}>
              <ChatTab />
            </TabPanel>
            <TabPanel id="structured" activeTab={activeTab}>
              <StructuredChat />
            </TabPanel>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default App;
