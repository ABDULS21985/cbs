export function exportToCsv(
  filename: string,
  columns: { header: string; accessor: string }[],
  data: Record<string, any>[]
): void {
  if (!data || data.length === 0) {
    console.warn('exportToCsv: No data to export');
    return;
  }

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const headers = columns.map((c) => `"${c.header}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.accessor];
        if (val == null) return '""';
        if (typeof val === 'number') return String(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  const csv = BOM + [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
