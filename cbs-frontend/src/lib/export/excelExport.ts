import { exportToCsv } from './csvExport';

/**
 * Export to Excel format. Since the xlsx package is not installed,
 * this falls back to CSV export for the first sheet.
 * To enable true .xlsx export, install `xlsx` (SheetJS) and update this file.
 */
export function exportToExcel(
  filename: string,
  sheets: {
    name: string;
    columns: { header: string; accessor: string; format?: string }[];
    data: Record<string, any>[];
  }[]
): void {
  if (!sheets || sheets.length === 0) {
    console.warn('exportToExcel: No sheets to export');
    return;
  }

  const firstSheet = sheets[0];
  if (!firstSheet.data || firstSheet.data.length === 0) {
    console.warn('exportToExcel: No data in first sheet');
    return;
  }

  // Fallback: export first sheet as CSV
  exportToCsv(filename, firstSheet.columns, firstSheet.data);
}
