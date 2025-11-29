import { ReactNode } from "react";
import { cn } from "../../utils/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-300",
        "bg-neutral-50 px-8 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-2xl text-accent">
          {icon}
        </div>
      ) : null}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="mt-4 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
