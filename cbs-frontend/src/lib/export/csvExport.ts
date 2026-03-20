export function exportToCsv(
  data: Record<string, any>[],
  columns: { key: string; label: string; format?: 'money' | 'percent' | 'date' | 'text' }[],
  filename: string
): void {
  if (!data || data.length === 0) {
    console.warn('exportToCsv: No data to export');
    return;
  }

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  // Header row
  const header = columns.map((c) => `"${c.label}"`).join(',');

  // Data rows - format values appropriately
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return '""';
        if (col.format === 'date') return `"${val}"`;
        if (col.format === 'money' || typeof val === 'number') return val; // raw number for money/numeric
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csv = BOM + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
