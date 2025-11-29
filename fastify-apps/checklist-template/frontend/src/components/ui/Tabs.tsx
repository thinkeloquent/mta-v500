import { ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Tab Headers */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex gap-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition",
                  isActive
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                )}
                aria-current={isActive ? "page" : undefined}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(tab.id === activeTab ? "block" : "hidden")}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
