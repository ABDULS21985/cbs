import { Printer } from 'lucide-react';

interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = 'Print' }: PrintButtonProps) {
  return (
    <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors no-print">
      <Printer className="w-4 h-4" /> {label}
    </button>
  );
}
