import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-[3px] border border-[#262626] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#52525B] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer',
        checked ? 'bg-[#FAFAFA] text-[#000000] border-[#FAFAFA]' : 'bg-[#0A0A0A] hover:border-[#52525B]',
        className
      )}
    >
      {checked && <Check className="h-3 w-3 stroke-[2.5]" />}
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="sr-only"
        {...props}
      />
    </button>
  )
);
Checkbox.displayName = 'Checkbox';
