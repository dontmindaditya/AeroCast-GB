import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-8 w-full rounded-md border border-[#262626] bg-[#0A0A0A] px-3 py-1 text-xs text-[#FAFAFA] placeholder:text-[#71717A] transition-colors focus-visible:outline-none focus-visible:border-[#52525B] disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
