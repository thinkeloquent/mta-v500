import { ReactNode } from "react";
import { MoreHorizontal, Star } from "lucide-react";
import { Card } from "./Card";
import { cn } from "../../utils/cn";

export type TemplateStatus = "published" | "draft" | "private";
export type TemplateType = "custom" | "marketplace";

type TemplateCardProps = {
  id: string;
  name: string;
  category: string;
  version?: string;
  steps: number;
  status: TemplateStatus;
  description?: string;
  tags?: string[];
  usage?: number;
  rating?: number;
  author?: string;
  price?: number;
  type?: TemplateType;
  onMenuClick?: () => void;
  className?: string;
};

const statusColors: Record<TemplateStatus, string> = {
  published: "bg-green-500/20 text-green-300 border-green-500/30",
  draft: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  private: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export function TemplateCard({
  id,
  name,
  category,
  version,
  steps,
  status,
  description,
  tags,
  usage,
  rating,
  author,
  price,
  type = "custom",
  onMenuClick,
  className,
}: TemplateCardProps) {
  return (
    <Card className={cn("hover:scale-[1.02] transition-transform", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className="font-semibold text-slate-50 truncate"
              data-testid="template-name"
            >
              {name}
            </h3>
            {type === "marketplace" && (
              <Star className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span data-testid="template-category">{category}</span>
            {version && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500">{version}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onMenuClick}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 -m-1"
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {description && (
        <p className="text-sm text-slate-300 mb-4 line-clamp-2">{description}</p>
      )}

      <div className="flex items-center justify-between mb-4 text-sm text-slate-400">
        <div className="flex items-center gap-4">
          <span data-testid="template-steps">{steps} steps</span>
          {usage !== undefined && (
            <>
              <span className="text-slate-600">•</span>
              <span>{usage.toLocaleString()} uses</span>
            </>
          )}
          {rating !== undefined && rating > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span>{rating.toFixed(1)}</span>
              </div>
            </>
          )}
        </div>
        {price && (
          <span className="text-sm font-medium text-slate-200">${price}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border",
            statusColors[status]
          )}
          data-testid="template-status"
        >
          {status}
        </span>
        {author && (
          <span className="text-xs text-slate-500">by {author}</span>
        )}
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-white/5 text-slate-400 rounded-md text-xs border border-white/5"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-1 text-slate-500 text-xs">
              +{tags.length - 3} more
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
