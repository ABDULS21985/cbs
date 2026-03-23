import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function FormSection({ title, description, children, collapsible, defaultOpen = true }: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="surface-card">
      <div
        className={cn('flex items-center justify-between px-5 py-3.5', collapsible && 'cursor-pointer hover:bg-muted/50 transition-colors')}
        onClick={collapsible ? () => setOpen(!open) : undefined}
      >
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {collapsible && <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />}
      </div>
      {open && <div className="px-5 pb-5 pt-2">{children}</div>}
    </div>
  );
}
