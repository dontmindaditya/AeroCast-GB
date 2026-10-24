import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, value, onChange, onValueChange, children, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    return (
      <div className="relative inline-flex items-center">
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            'h-8 appearance-none rounded-md border border-[#262626] bg-[#0A0A0A] pl-2.5 pr-7 py-1 text-xs text-[#FAFAFA] font-mono transition-colors hover:bg-[#111111] focus:outline-none focus:border-[#52525B] cursor-pointer',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-[#71717A]" />
      </div>
    );
  }
);
Select.displayName = 'Select';

export const SelectItem = React.forwardRef<HTMLOptionElement, React.OptionHTMLAttributes<HTMLOptionElement>>(
  ({ className, ...props }, ref) => (
    <option ref={ref} className={cn('bg-[#0A0A0A] text-[#FAFAFA] font-mono', className)} {...props} />
  )
);
SelectItem.displayName = 'SelectItem';
