import { useState } from "react";
import { Eye, EyeOff, Copy, Settings, Trash2 } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { cn } from "../../utils/cn";

export type IntegrationStatus = "active" | "inactive";

type IntegrationCardProps = {
  id: string;
  name: string;
  apiKey: string;
  domain: string;
  status: IntegrationStatus;
  lastUsed: string;
  totalRequests: number;
  templatesUsed: number;
  onConfigure?: () => void;
  onDelete?: () => void;
  className?: string;
};

export function IntegrationCard({
  id,
  name,
  apiKey,
  domain,
  status,
  lastUsed,
  totalRequests,
  templatesUsed,
  onConfigure,
  onDelete,
  className,
}: IntegrationCardProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const maskedApiKey = apiKey.slice(0, 12) + "...";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-slate-50 mb-1"
            data-testid="integration-name"
          >
            {name}
          </h3>
          <p className="text-sm text-slate-400 truncate">{domain}</p>
        </div>
        <div
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium",
            status === "active"
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
          )}
          data-testid="integration-status"
        >
          {status}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">API Key</span>
          <div className="flex items-center gap-2">
            <code
              className="text-xs font-mono bg-white/5 px-3 py-1.5 rounded border border-white/5"
              data-testid="api-key-display"
            >
              {showApiKey ? apiKey : maskedApiKey}
            </code>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="p-1.5 hover:bg-white/5 rounded transition-colors"
              aria-label={showApiKey ? "Hide API key" : "Show API key"}
            >
              {showApiKey ? (
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-white/5 rounded transition-colors"
              aria-label="Copy API key"
              data-testid="copy-api-key"
            >
              <Copy
                className={cn(
                  "w-3.5 h-3.5",
                  copied ? "text-green-400" : "text-slate-400"
                )}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm pt-2">
          <div className="text-center">
            <p
              className="font-semibold text-slate-50 text-lg"
              data-testid="total-requests"
            >
              {totalRequests.toLocaleString()}
            </p>
            <p className="text-slate-500 text-xs mt-1">Requests</p>
          </div>
          <div className="text-center">
            <p
              className="font-semibold text-slate-50 text-lg"
              data-testid="templates-used"
            >
              {templatesUsed}
            </p>
            <p className="text-slate-500 text-xs mt-1">Templates</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-50 text-xs truncate">
              {lastUsed}
            </p>
            <p className="text-slate-500 text-xs mt-1">Last Used</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-white/5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onConfigure}
          className="flex-1"
          data-testid="configure-button"
        >
          <Settings className="w-3.5 h-3.5" />
          Configure
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label="Delete integration"
          data-testid="delete-button"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}
