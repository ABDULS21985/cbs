import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ComplianceItem {
  id: string;
  article: string;
  title: string;
  description: string;
  status: 'compliant' | 'in-progress' | 'non-compliant';
  evidenceLink?: string;
  verifiedDate?: string;
  notes?: string;
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    id: 'art10',
    article: 'Article 10',
    title: 'TPP Registration & Authorization',
    description:
      'Payment service providers must be authorised or registered by the competent authority of their home Member State. TPPs must present valid eIDAS certificates.',
    status: 'compliant',
    evidenceLink: '/compliance/art10-evidence',
    verifiedDate: '2025-12-15',
    notes: 'All registered TPPs are validated against the NCA registry. eIDAS certificates are verified on registration.',
  },
  {
    id: 'art30',
    article: 'Article 30',
    title: 'Dedicated Interface (API)',
    description:
      'ASPSPs must provide at least one dedicated interface for TPP access, ensuring the same availability and performance as the customer-facing interface.',
    status: 'compliant',
    evidenceLink: '/compliance/art30-evidence',
    verifiedDate: '2025-11-20',
    notes: 'Dedicated PSD2 API endpoints available with 99.9% SLA and fallback mechanism.',
  },
  {
    id: 'art36',
    article: 'Article 36',
    title: 'Access to Payment Accounts (AISP)',
    description:
      'Account information service providers must access only designated payment accounts and associated payment transactions with explicit consent.',
    status: 'compliant',
    evidenceLink: '/compliance/art36-evidence',
    verifiedDate: '2025-11-20',
    notes: 'Consent management system enforces scope-based access. AISP access limited to authorised accounts only.',
  },
  {
    id: 'art97',
    article: 'Article 97',
    title: 'Strong Customer Authentication',
    description:
      'PSPs must apply SCA when the payer accesses their payment account online, initiates an electronic payment, or carries out any action through a remote channel which may imply a risk of payment fraud.',
    status: 'compliant',
    evidenceLink: '/compliance/art97-evidence',
    verifiedDate: '2026-01-10',
    notes: 'Multi-factor SCA implemented with SMS OTP, push notifications, biometric, and hardware token options.',
  },
  {
    id: 'art98',
    article: 'Article 98',
    title: 'Regulatory Technical Standards (RTS)',
    description:
      'EBA develops regulatory technical standards specifying requirements for SCA, exemptions, and security measures for protecting the confidentiality and integrity of credentials.',
    status: 'in-progress',
    evidenceLink: '/compliance/art98-evidence',
    verifiedDate: '2026-02-01',
    notes: 'Transaction risk analysis engine under enhancement. Low-value and recurring payment exemptions configured.',
  },
  {
    id: 'art34',
    article: 'Article 34',
    title: 'Consent Management & Data Access',
    description:
      'Customer consent must be explicit, granular, and revocable. Data access must be limited to what is necessary and consented.',
    status: 'compliant',
    evidenceLink: '/compliance/art34-evidence',
    verifiedDate: '2025-12-20',
    notes: 'Granular consent management with scope-based authorization. Customers can view and revoke consents at any time.',
  },
];

const STATUS_CONFIG = {
  compliant: {
    icon: CheckCircle2,
    label: 'Compliant',
    className: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    dotClass: 'bg-green-500',
  },
  'in-progress': {
    icon: Clock,
    label: 'In Progress',
    className: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    dotClass: 'bg-amber-500',
  },
  'non-compliant': {
    icon: AlertCircle,
    label: 'Non-Compliant',
    className: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    dotClass: 'bg-red-500',
  },
};

export function ComplianceChecklist() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const compliantCount = COMPLIANCE_ITEMS.filter((i) => i.status === 'compliant').length;
  const total = COMPLIANCE_ITEMS.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">PSD2 Compliance Status</h3>
          <span className="text-xs font-medium text-muted-foreground">
            {compliantCount}/{total} articles compliant
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(compliantCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {COMPLIANCE_ITEMS.map((item) => {
          const config = STATUS_CONFIG[item.status];
          const StatusIcon = config.icon;
          const isExpanded = expanded === item.id;

          return (
            <div key={item.id} className="surface-card overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : item.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <StatusIcon className={cn('w-5 h-5 flex-shrink-0', config.className.split(' ')[0])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">{item.article}</span>
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    config.className,
                  )}
                >
                  {config.label}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 pt-0 border-t bg-muted/10">
                  <div className="pt-4 space-y-3">
                    <p className="text-xs text-muted-foreground">{item.description}</p>

                    {item.notes && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <span className="text-xs font-medium">Implementation Notes</span>
                        <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs">
                      {item.verifiedDate && (
                        <span className="text-muted-foreground">
                          Last verified:{' '}
                          <span className="font-medium text-foreground">
                            {new Date(item.verifiedDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </span>
                      )}
                      {item.evidenceLink && (
                        <a
                          href={item.evidenceLink}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          View Evidence
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
