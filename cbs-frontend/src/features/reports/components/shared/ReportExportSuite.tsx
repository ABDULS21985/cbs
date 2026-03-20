import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, Table2, Printer, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportColumn {
  key: string;
  header: string;
}

interface ReportExportSuiteProps {
  reportName: string;
  data: Record<string, any>[];
  columns: ExportColumn[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateCsv(data: Record<string, any>[], columns: ExportColumn[]): string {
  const BOM = '\uFEFF';
  const header = columns.map((c) => `"${c.header}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(','),
  );
  return BOM + [header, ...rows].join('\n');
}

function exportCsv(reportName: string, data: Record<string, any>[], columns: ExportColumn[]) {
  const csv = generateCsv(data, columns);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `${reportName}_${timestamp}.csv`, 'text/csv;charset=utf-8');
}

function exportExcel(reportName: string, data: Record<string, any>[], columns: ExportColumn[]) {
  // Fallback to CSV with .xls extension (Excel-compatible CSV)
  // When SheetJS is available, this can be upgraded to native XLSX
  const csv = generateCsv(data, columns);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `${reportName}_${timestamp}.xls`, 'application/vnd.ms-excel;charset=utf-8');
}

function exportPdf() {
  window.print();
}

function exportPrint() {
  window.print();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportExportSuite({ reportName, data, columns }: ReportExportSuiteProps) {
  const [open, setOpen] = useState(false);
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

  const options = [
    {
      label: 'PDF',
      icon: FileText,
      action: () => exportPdf(),
      description: 'Print-optimized PDF',
    },
    {
      label: 'Excel',
      icon: FileSpreadsheet,
      action: () => exportExcel(reportName, data, columns),
      description: 'Excel spreadsheet',
    },
    {
      label: 'CSV',
      icon: Table2,
      action: () => exportCsv(reportName, data, columns),
      description: 'Comma-separated values',
    },
    {
      label: 'Print',
      icon: Printer,
      action: () => exportPrint(),
      description: 'Send to printer',
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/50 transition-colors"
        aria-label="Export report"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] rounded-md border border-border bg-popover shadow-lg py-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.action();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              aria-label={`Export as ${opt.label}`}
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
