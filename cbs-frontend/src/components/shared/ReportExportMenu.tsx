import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { exportToCsv } from '@/lib/export/csvExport';
import { exportToExcel } from '@/lib/export/excelExport';
import { exportToPdf } from '@/lib/export/pdfExport';

interface ReportExportMenuProps {
  reportName: string;
  data: Record<string, any>[];
  columns: { header: string; accessor: string; format?: string }[];
}

export function ReportExportMenu({ reportName, data, columns }: ReportExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCsv = () => {
    exportToCsv(reportName, columns, data);
    setOpen(false);
  };

  const handleExcel = () => {
    exportToExcel(reportName, [{ name: reportName, columns, data }]);
    setOpen(false);
  };

  const handlePrint = () => {
    exportToPdf(reportName);
    setOpen(false);
  };

  return (
    <div className="relative no-print" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Export report"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
      >
        <Download className="w-4 h-4" /> Export
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-48 rounded-lg border bg-popover shadow-lg z-50 py-1"
          role="menu"
          aria-label="Export options"
        >
          <button
            role="menuitem"
            onClick={handleCsv}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4 text-muted-foreground" /> Export as CSV
          </button>
          <button
            role="menuitem"
            onClick={handleExcel}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" /> Export as Excel
          </button>
          <button
            role="menuitem"
            onClick={handlePrint}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Printer className="w-4 h-4 text-muted-foreground" /> Print / PDF
          </button>
        </div>
      )}
    </div>
  );
}
