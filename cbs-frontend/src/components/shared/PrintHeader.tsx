import { format } from 'date-fns';

interface PrintHeaderProps {
  reportTitle: string;
  userName?: string;
}

export function PrintHeader({ reportTitle, userName }: PrintHeaderProps) {
  return (
    <div className="print-only print-header hidden">
      <div className="logo">BellBank</div>
      <div className="meta">
        <div>{reportTitle}</div>
        <div>Generated: {format(new Date(), 'dd MMM yyyy HH:mm')}</div>
        {userName && <div>Prepared by: {userName}</div>}
      </div>
    </div>
  );
}
