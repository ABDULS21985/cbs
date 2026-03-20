import { ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface ComplianceStatusBannerProps {
  lastAuditDate?: string;
  compliant?: boolean;
}

export function ComplianceStatusBanner({
  lastAuditDate,
  compliant = true,
}: ComplianceStatusBannerProps) {
  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 px-5 py-4 flex items-start gap-3">
      <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
          {compliant ? 'PSD2 Compliance Status: Compliant' : 'PSD2 Compliance Status: Action Required'}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
          All TPP clients must be registered and authorised before accessing customer data.
          Consents are customer-driven and can be revoked at any time. Scopes follow the PSD2 / Open Banking specification.
        </p>
        {lastAuditDate && (
          <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">
            Last compliance audit: {formatDate(lastAuditDate)}
          </p>
        )}
      </div>
    </div>
  );
}
