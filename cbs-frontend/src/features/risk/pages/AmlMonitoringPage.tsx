import { useState } from 'react';
import {
  AlertTriangle,
  Search,
  FileText,
  BarChart3,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { EmptyState } from '@/components/shared/EmptyState';
import { AmlStatsCards } from '../components/aml/AmlStatsCards';
import { AlertQueueTable } from '../components/aml/AlertQueueTable';
import { StrFilingForm } from '../components/aml/StrFilingForm';
import { StrListTable } from '../components/aml/StrListTable';
import { CtrReportTable } from '../components/aml/CtrReportTable';
import { AmlRuleEditor } from '../components/aml/AmlRuleEditor';
import {
  useAmlStats,
  useAmlAlerts,
  useStrList,
  useCtrList,
} from '../hooks/useAmlAlerts';

export function AmlMonitoringPage() {
  const stats = useAmlStats();
  const alerts = useAmlAlerts();
  const strs = useStrList();
  const ctrs = useCtrList();
  const [showStrForm, setShowStrForm] = useState(false);

  const tabs = [
    {
      id: 'alert-queue',
      label: 'Alert Queue',
      icon: AlertTriangle,
      badge: stats.data?.openAlerts,
      content: (
        <div className="p-6">
          <AlertQueueTable data={alerts.data ?? []} isLoading={alerts.isLoading} />
        </div>
      ),
    },
    {
      id: 'investigations',
      label: 'Investigations',
      icon: Search,
      content: (
        <div className="p-6">
          <EmptyState
            icon={ClipboardList}
            title="Select an alert to investigate"
            description="Navigate to an alert from the Alert Queue tab to open the investigation workbench."
          />
        </div>
      ),
    },
    {
      id: 'str-filing',
      label: 'STR Filing',
      icon: FileText,
      content: (
        <div className="p-6 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">File New STR</h3>
              <button
                onClick={() => setShowStrForm((v) => !v)}
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
              >
                {showStrForm ? 'Hide Form' : 'New STR'}
              </button>
            </div>
            {showStrForm && <StrFilingForm onSuccess={() => setShowStrForm(false)} />}
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-3">Filed STRs</h3>
            <StrListTable data={strs.data ?? []} isLoading={strs.isLoading} />
          </div>
        </div>
      ),
    },
    {
      id: 'ctr',
      label: 'CTR Reports',
      icon: BarChart3,
      content: (
        <div className="p-6">
          <h3 className="text-sm font-semibold mb-3">Currency Transaction Reports</h3>
          <CtrReportTable data={ctrs.data ?? []} isLoading={ctrs.isLoading} />
        </div>
      ),
    },
    {
      id: 'rules',
      label: 'Rules',
      icon: Settings,
      content: (
        <div className="p-6">
          <AmlRuleEditor />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="AML/CFT Monitoring"
        subtitle="Anti-Money Laundering and Counter-Financing of Terrorism monitoring"
      />

      <div className="px-6">
        <AmlStatsCards data={stats.data} isLoading={stats.isLoading} />
      </div>

      <TabsPage tabs={tabs} syncWithUrl />
    </div>
  );
}
