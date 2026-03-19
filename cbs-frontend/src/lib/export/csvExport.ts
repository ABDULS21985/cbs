export function exportCsv(headers: string[], rows: (string | number)[][], filename: string): void {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  const csvContent = bom + [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => {
      const str = String(cell ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
