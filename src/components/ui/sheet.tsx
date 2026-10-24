import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | undefined>(undefined);

export function Sheet({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({ children }: { children: React.ReactElement; asChild?: boolean }) {
  const context = React.useContext(SheetContext);
  return React.cloneElement(children, {
    onClick: () => context?.setOpen(true),
  } as any);
}

export function SheetContent({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(SheetContext);
  if (!context?.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#000000]/80">
      <div
        className={cn(
          'relative h-full w-72 border-l border-[#262626] bg-[#0A0A0A] p-6 text-[#FAFAFA] flex flex-col gap-4',
          className
        )}
      >
        <button
          type="button"
          onClick={() => context.setOpen(false)}
          aria-label="Close navigation menu"
          className="absolute right-4 top-4 rounded p-1 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#171717] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1 text-left', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold text-[#FAFAFA]', className)} {...props} />;
}
