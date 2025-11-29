import { ReactNode } from "react";
import { cn } from "../../utils/cn";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-16",
        className,
      )}
    >
      <div className="flex flex-col gap-10">{children}</div>
    </div>
  );
}
