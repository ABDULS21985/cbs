export function PrintFooter() {
  return (
    <div className="print-only print-footer hidden">
      BellBank CBS | Confidential | {new Date().toISOString().slice(0, 10)}
    </div>
  );
}
