import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, Table2, Printer, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToCsv } from '@/lib/export/csvExport';
import { exportToExcel } from '@/lib/export/excelExport';
import { exportToPdf } from '@/lib/export/pdfExport';
import '@/lib/export/printStyles.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportColumn {
  key: string;
  header: string;
  format?: 'money' | 'percent' | 'date' | 'text';
}

interface ReportExportSuiteProps {
  reportName: string;
  data: Record<string, any>[];
  columns: ExportColumn[];
  pdfOptions?: {
    period?: string;
    preparedBy?: string;
    watermark?: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportExportSuite({
  reportName,
  data,
  columns,
  pdfOptions,
}: ReportExportSuiteProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Map ExportColumn to the shape expected by export utilities
  const csvCols = columns.map((c) => ({ key: c.key, label: c.header, format: c.format }));
  const pdfCols = columns.map((c) => ({ key: c.key, label: c.header }));

  async function runExport(label: string, fn: () => void) {
    setLoading(label);
    setOpen(false);
    // Yield to the browser so the loading state renders before a sync export
    await new Promise((r) => setTimeout(r, 50));
    try {
      fn();
    } finally {
      setLoading(null);
    }
  }

  const options = [
    {
      label: 'PDF',
      icon: FileText,
      description: 'Print-optimized PDF',
      action: () =>
        runExport('PDF', () =>
          exportToPdf(reportName, data, pdfCols, pdfOptions)
        ),
    },
    {
      label: 'Excel',
      icon: FileSpreadsheet,
      description: 'Excel spreadsheet (.xlsx)',
      action: () =>
        runExport('Excel', () =>
          exportToExcel(data, csvCols, reportName)
        ),
    },
    {
      label: 'CSV',
      icon: Table2,
      description: 'Comma-separated values',
      action: () =>
        runExport('CSV', () =>
          exportToCsv(data, csvCols, reportName)
        ),
    },
    {
      label: 'Print',
      icon: Printer,
      description: 'Send to printer',
      action: () =>
        runExport('Print', () => {
          const originalTitle = document.title;
          document.title = reportName;
          window.print();
          document.title = originalTitle;
        }),
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Export report"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{loading ? `Exporting ${loading}…` : 'Export'}</span>
        {!loading && (
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-[200px] rounded-md border border-border bg-popover shadow-lg py-1"
          role="menu"
          aria-label="Export options"
        >
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => opt.action()}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              aria-label={`Export as ${opt.label}`}
              role="menuitem"
            >
              <opt.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-foreground">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
