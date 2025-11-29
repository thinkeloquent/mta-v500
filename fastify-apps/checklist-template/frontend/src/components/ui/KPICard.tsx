import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "./Card";
import { cn } from "../../utils/cn";

export type KPICardColor = "blue" | "green" | "orange" | "purple";

type KPICardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: KPICardColor;
  subtitle?: string;
  trend?: number;
  className?: string;
};

const colorClasses: Record<KPICardColor, string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function KPICard({
  title,
  value,
  icon,
  color = "blue",
  subtitle,
  trend,
  className,
}: KPICardProps) {
  return (
    <Card className={cn("hover:scale-[1.02] transition-transform", className)}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 mb-2">{title}</p>
          <p className="text-3xl font-bold text-slate-50 mb-1" data-testid="kpi-value">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-3" data-testid="kpi-trend">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  trend > 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {Math.abs(trend)}%
              </span>
              <span className="text-xs text-slate-500 ml-1">vs last period</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "p-3 rounded-xl border backdrop-blur-sm",
            colorClasses[color]
          )}
          data-testid="kpi-icon"
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
