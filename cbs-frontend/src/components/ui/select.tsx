import { useState, useRef, useEffect, createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

// ---- Context --------------------------------------------------------------------

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue>({
  value: '',
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
});

// ---- Select Root ----------------------------------------------------------------

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

// ---- Trigger --------------------------------------------------------------------

export function SelectTrigger({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen } = useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'field-control justify-between',
        className,
      )}
    >
      {children}
      <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')} />
    </button>
  );
}

// ---- Value Display --------------------------------------------------------------

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useContext(SelectContext);
  return <span className={cn(!value && 'text-muted-foreground')}>{value || placeholder || 'Select...'}</span>;
}

// ---- Content / Dropdown ---------------------------------------------------------

export function SelectContent({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen } = useContext(SelectContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'dropdown-surface absolute z-50 mt-1 w-full min-w-[8rem] max-h-60 overflow-auto animate-in fade-in-0 zoom-in-95',
        className,
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

// ---- Select Item ----------------------------------------------------------------

interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function SelectItem({ value: itemValue, children, className }: SelectItemProps) {
  const { value, onValueChange, setOpen } = useContext(SelectContext);
  const isSelected = value === itemValue;

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange(itemValue);
        setOpen(false);
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent/50',
        className,
      )}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
      {children}
    </button>
  );
}
