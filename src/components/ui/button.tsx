import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      default: 'bg-[#FAFAFA] text-[#000000] hover:bg-[#E4E4E7] border border-transparent font-medium',
      secondary: 'bg-[#111111] text-[#FAFAFA] hover:bg-[#171717] border border-[#262626]',
      outline: 'bg-[#000000] text-[#FAFAFA] hover:bg-[#111111] border border-[#262626]',
      ghost: 'bg-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111111]',
      link: 'bg-transparent text-[#FAFAFA] underline-offset-4 hover:underline',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      default: 'h-8 px-3 py-1.5 text-xs rounded-md',
      sm: 'h-7 px-2.5 text-xs rounded-md',
      lg: 'h-9 px-4 text-sm rounded-md',
      icon: 'h-8 w-8 rounded-md p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#52525B] disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
