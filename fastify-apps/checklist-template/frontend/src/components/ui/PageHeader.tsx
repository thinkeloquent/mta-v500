import { ReactNode } from "react";
import { cn } from "../../utils/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "grid gap-6 border-b border-neutral-200 pb-8 sm:grid-cols-[1fr_auto] sm:items-center",
        className,
      )}
    >
      <div className="space-y-3">
        {eyebrow ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700">
            <span className="size-2 rounded-full bg-accent" />
            {eyebrow}
          </span>
        ) : null}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-base text-neutral-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">{actions}</div> : null}
    </header>
  );
}
