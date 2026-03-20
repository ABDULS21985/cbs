// Excel export - since xlsx is not installed, we generate a TSV file
// that Excel can open with proper column formatting.
// To enable true .xlsx export, install `xlsx` (SheetJS) and update this file.
export function exportToExcel(
  data: Record<string, any>[],
  columns: { key: string; label: string; format?: string }[],
  filename: string,
  sheetName?: string // reserved for future xlsx implementation
): void {
  if (!data || data.length === 0) {
    console.warn('exportToExcel: No data to export');
    return;
  }

  // Check if xlsx is available at runtime (e.g. loaded via CDN)
  try {
    const XLSX = (window as any).XLSX;
    if (XLSX) {
      const wsData = [
        columns.map((c) => c.label),
        ...data.map((row) => columns.map((col) => row[col.key] ?? '')),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Report');
      XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }
  } catch {
    // XLSX not available, fall through to TSV fallback
  }

  // Fallback: TSV format that Excel handles well
  const header = columns.map((c) => c.label).join('\t');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        if (typeof val === 'number' && col.format === 'money') return val;
        return val ?? '';
      })
      .join('\t')
  );

  const tsv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + tsv], {
    type: 'text/tab-separated-values;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
