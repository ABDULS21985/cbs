import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Layers,
  TrendingDown,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatusBadge, EmptyState } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  useFacility,
  useFacilitySubLimits,
  useFacilityDrawdowns,
  useFacilityUtilizationHistory,
  useFacilityCovenants,
} from '../hooks/useFacilities';
import { UtilizationGauge } from '../components/facility/UtilizationGauge';
import { SubLimitTable } from '../components/facility/SubLimitTable';
import { DrawdownTable } from '../components/facility/DrawdownTable';
import { DrawdownRequestForm } from '../components/facility/DrawdownRequestForm';
import { UtilizationHistoryChart } from '../components/facility/UtilizationHistoryChart';
import { CovenantComplianceTable } from '../components/facility/CovenantComplianceTable';

const TYPE_LABELS: Record<string, string> = {
  REVOLVING: 'Revolving',
  TERM: 'Term',
  OVERDRAFT: 'Overdraft',
  GUARANTEE: 'Guarantee',
  LC: 'Letter of Credit',
};

export function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const facilityId = Number(id);
  const navigate = useNavigate();

  const [showDrawdownForm, setShowDrawdownForm] = useState(false);

  const { data: facility, isLoading: loadingFacility } = useFacility(facilityId);
  const { data: subLimits = [], isLoading: loadingSubLimits } = useFacilitySubLimits(facilityId);
  const { data: drawdowns = [], isLoading: loadingDrawdowns } = useFacilityDrawdowns(facilityId);
  const { data: utilizationHistory = [], isLoading: loadingUtilization } =
    useFacilityUtilizationHistory(facilityId);
  const { data: covenants = [], isLoading: loadingCovenants } = useFacilityCovenants(facilityId);

  if (loadingFacility) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground animate-pulse">Loading facility…</div>
      </div>
    );
  }

  if (!facility) {
    return (
      <EmptyState
        title="Facility not found"
        description="The credit facility you are looking for does not exist or has been removed."
        action={{ label: 'Back to Facilities', onClick: () => navigate('/lending/facilities') }}
      />
    );
  }

  const tabs = [
    {
      id: 'sub-limits',
      label: 'Sub-limits',
      icon: Layers,
      badge: subLimits.length,
      content: (
        <div className="p-6">
          <SubLimitTable data={subLimits} isLoading={loadingSubLimits} />
        </div>
      ),
    },
    {
      id: 'drawdowns',
      label: 'Drawdowns',
      icon: TrendingDown,
      badge: drawdowns.length,
      content: (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Drawdown History
            </h3>
            <button
              onClick={() => setShowDrawdownForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              {showDrawdownForm ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Form
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Request Drawdown
                </>
              )}
            </button>
          </div>
          {showDrawdownForm && (
            <div className="p-4 border rounded-lg bg-muted/20">
              <h4 className="text-sm font-semibold mb-4">New Drawdown Request</h4>
              <DrawdownRequestForm
                facilityId={facilityId}
                onSuccess={() => setShowDrawdownForm(false)}
                onCancel={() => setShowDrawdownForm(false)}
              />
            </div>
          )}
          <DrawdownTable data={drawdowns} isLoading={loadingDrawdowns} />
        </div>
      ),
    },
    {
      id: 'utilization',
      label: 'Utilization',
      icon: BarChart2,
      content: (
        <UtilizationHistoryChart data={utilizationHistory} isLoading={loadingUtilization} />
      ),
    },
    {
      id: 'covenants',
      label: 'Covenants',
      icon: ShieldCheck,
      badge: covenants.filter((c) => c.compliance !== 'COMPLIANT').length || undefined,
      content: (
        <div className="p-6">
          <CovenantComplianceTable data={covenants} isLoading={loadingCovenants} />
        </div>
      ),
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      content: (
        <div className="p-6">
          <EmptyState
            icon={FileText}
            title="No documents uploaded"
            description="Documents and legal agreements for this facility will appear here."
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-0 pb-8">
      <PageHeader
        title={facility.facilityNumber}
        subtitle={`${facility.customerName} · ${TYPE_LABELS[facility.type] ?? facility.type} Facility`}
        backTo="/lending/facilities"
        actions={<StatusBadge status={facility.status} size="md" dot />}
      />

      {/* Summary card */}
      <div className="px-6 pb-4">
        <div className="surface-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
            {/* Left: key details */}
            <div className="col-span-2 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Customer</p>
                  <p className="mt-0.5 font-medium">{facility.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Facility Type</p>
                  <p className="mt-0.5">{TYPE_LABELS[facility.type] ?? facility.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Currency</p>
                  <p className="mt-0.5 font-mono">{facility.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Approved Limit</p>
                  <p className="mt-0.5 font-mono font-semibold">
                    {formatMoney(facility.approvedLimit, facility.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Approved Date</p>
                  <p className="mt-0.5">{formatDate(facility.approvedDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Expiry Date</p>
                  <p className="mt-0.5">{formatDate(facility.expiryDate)}</p>
                </div>
                {facility.reviewDate && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Review Date</p>
                    <p className="mt-0.5">{formatDate(facility.reviewDate)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: utilization gauge */}
            <div className="p-6 flex items-center justify-center">
              <UtilizationGauge
                utilized={facility.utilized}
                limit={facility.approvedLimit}
                currency={facility.currency}
              />
            </div>
          </div>
        </div>
      </div>

      <TabsPage tabs={tabs} syncWithUrl />
    </div>
  );
}
