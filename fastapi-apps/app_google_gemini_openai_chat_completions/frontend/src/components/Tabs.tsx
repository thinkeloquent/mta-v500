import { ReactNode } from 'react';
import './Tabs.css';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}

export function Tabs({ tabs, activeTab, onTabChange, children }: TabsProps) {
  return (
    <div className="tabs-container">
      <div className="tabs-header">
        <nav className="tabs-nav" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="tabs-content">
        {children}
      </div>
    </div>
  );
}

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
}

export function TabPanel({ id, activeTab, children }: TabPanelProps) {
  if (id !== activeTab) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className="tab-panel"
    >
      {children}
    </div>
  );
}
