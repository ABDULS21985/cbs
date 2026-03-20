/**
 * Export to PDF using the browser's built-in print dialog.
 * Print CSS in globals.css handles the formatting.
 */
export function exportToPdf(reportTitle: string): void {
  const originalTitle = document.title;
  document.title = reportTitle;
  window.print();
  document.title = originalTitle;
}
