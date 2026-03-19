import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';

interface ExportMenuProps {
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
}

export function ExportMenu({ onExportCsv, onExportExcel, onExportPdf, onPrint }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    onExportCsv && { label: 'Export as CSV', icon: FileText, onClick: onExportCsv },
    onExportExcel && { label: 'Export as Excel', icon: FileSpreadsheet, onClick: onExportExcel },
    onExportPdf && { label: 'Export as PDF', icon: FileText, onClick: onExportPdf },
    onPrint && { label: 'Print', icon: Printer, onClick: onPrint },
  ].filter(Boolean) as { label: string; icon: typeof Download; onClick: () => void }[];

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors">
        <Download className="w-4 h-4" /> Export
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-lg border bg-popover shadow-lg z-50 py-1">
          {items.map((item) => (
            <button key={item.label} onClick={() => { item.onClick(); setOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
              <item.icon className="w-4 h-4 text-muted-foreground" /> {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
