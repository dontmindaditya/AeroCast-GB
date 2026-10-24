import * as React from 'react';
import { cn } from '../../lib/utils';

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <div className="relative inline-flex group">{children}</div>;
}

export function TooltipTrigger({ children }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

export function TooltipContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 whitespace-nowrap rounded border border-[#262626] bg-[#111111] px-2.5 py-1 text-[11px] text-[#FAFAFA]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
