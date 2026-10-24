import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline';
}

export function Badge({ className, variant = 'outline', ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-[#FAFAFA] text-[#000000] border-transparent font-medium',
    secondary: 'bg-[#111111] text-[#A1A1AA] border-[#262626]',
    outline: 'bg-[#0A0A0A] text-[#FAFAFA] border-[#262626]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-normal border transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
