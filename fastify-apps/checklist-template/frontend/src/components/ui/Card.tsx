import { ReactNode } from "react";
import { cn } from "../../utils/cn";

type CardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

export function Card({
  title,
  description,
  icon,
  actions,
  className,
  children,
  footer,
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        {(title || description || icon || actions) && (
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {icon ? (
                <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-100 text-xl text-neutral-700">
                  {icon}
                </div>
              ) : null}
              <div>
                {title ? (
                  <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-sm text-neutral-600">{description}</p>
                ) : null}
              </div>
            </div>
            {actions ? (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                {actions}
              </div>
            ) : null}
          </header>
        )}
        {children}
        {footer ? <footer className="border-t border-neutral-200 pt-4 text-sm text-neutral-600">{footer}</footer> : null}
      </div>
    </section>
  );
}
