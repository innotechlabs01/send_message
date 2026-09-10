import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const STEP_MAX_W = "max-w-5xl";

export function StepShell({
  children = null,
  className,
  withFooter = false,
}: {
  children?: ReactNode;
  className?: string;
  withFooter?: boolean;
}) {
  return (
    <div className={cn("min-h-screen", STEP_MAX_W, "mx-auto px-6 py-10", withFooter && "pb-40", className)}>
      {children}
    </div>
  );
}

export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border/60 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)]">
      <div className={cn(STEP_MAX_W, "mx-auto px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end")}>
        {children}
      </div>
    </div>
  );
}
