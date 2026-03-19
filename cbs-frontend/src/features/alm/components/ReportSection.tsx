import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

interface ReportSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  printMode?: boolean;
}

export function ReportSection({
  id,
  title,
  children,
  defaultOpen = true,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  printMode,
}: ReportSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (printMode) {
    return (
      <div className="mb-8 break-inside-avoid" id={`section-${id}`}>
        <h2 className="text-lg font-bold border-b-2 border-gray-800 pb-2 mb-4">{title}</h2>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card transition-colors',
        draggable && 'cursor-move hover:border-primary/40',
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-section-id={id}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {draggable && <GripVertical className="w-4 h-4 text-muted-foreground/50" />}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
}
