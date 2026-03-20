/**
 * Export to PDF using a styled print window.
 * Since jspdf is not installed, we use browser print with formatted HTML.
 */
export function exportToPdf(
  title: string,
  data: Record<string, any>[],
  columns: { key: string; label: string }[],
  options?: {
    period?: string;
    preparedBy?: string;
    watermark?: string;
  }
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.warn('exportToPdf: Could not open print window. Check popup blocker settings.');
    return;
  }

  const tableRows = data
    .map(
      (row) => `
    <tr>
      ${columns.map((col) => `<td>${row[col.key] ?? ''}</td>`).join('')}
    </tr>
  `
    )
    .join('');

  const watermarkCss = options?.watermark
    ? `.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 80px; color: rgba(0,0,0,0.05); font-weight: bold; pointer-events: none; z-index: -1; }`
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2cm; color: #111; }
        .header { border-bottom: 2px solid #1E40AF; padding-bottom: 1rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start; }
        .bank-name { font-size: 24px; font-weight: bold; color: #1E40AF; }
        .confidential { color: #dc2626; font-weight: bold; font-size: 13px; }
        .report-title { font-size: 18px; font-weight: bold; margin: 0.5rem 0; }
        .meta { color: #6b7280; font-size: 12px; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th { background: #1E40AF; color: white; padding: 8px; text-align: left; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        tr:nth-child(even) { background: #f9fafb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .footer { position: fixed; bottom: 1cm; left: 0; right: 0; text-align: center; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        ${watermarkCss}
      </style>
    </head>
    <body>
      ${options?.watermark ? `<div class="watermark">${options.watermark}</div>` : ''}
      <div class="header">
        <div>
          <div class="bank-name">BellBank</div>
          <div class="report-title">${title}</div>
          ${options?.period ? `<div class="meta">Period: ${options.period}</div>` : ''}
          <div class="meta">Generated: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} WAT</div>
          ${options?.preparedBy ? `<div class="meta">Prepared by: ${options.preparedBy}</div>` : ''}
        </div>
        <div class="confidential">CONFIDENTIAL</div>
      </div>

      <table>
        <thead>
          <tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div class="footer">BellBank CBS | Confidential | Page 1</div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}
