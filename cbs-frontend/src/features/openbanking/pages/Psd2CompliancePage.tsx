import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Users,
  CheckCircle2,
  Ban,
  KeyRound,
  Activity,
  ClipboardCheck,
  Settings2,
  Search,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { TabsPage } from '@/components/shared/TabsPage';
import { usePsd2Tpps, useCustomerScaSessions } from '../hooks/usePsd2';
import { TppRegistrationTable } from '../components/psd2/TppRegistrationTable';
import { TppRegistrationForm } from '../components/psd2/TppRegistrationForm';
import { ScaSessionTable } from '../components/psd2/ScaSessionTable';
import { ScaFlowDiagram } from '../components/psd2/ScaFlowDiagram';
import { ScaInitiateDialog } from '../components/psd2/ScaInitiateDialog';
import { ComplianceChecklist } from '../components/psd2/ComplianceChecklist';
import { RegulatoryTimeline } from '../components/psd2/RegulatoryTimeline';
import { ExemptionManager } from '../components/psd2/ExemptionManager';
import type { Psd2ScaSession } from '../api/psd2Api';

// ─── SCA step mapping from session status ──────────────────────────────────

function getScaStep(status: Psd2ScaSession['scaStatus']): number {
  switch (status) {
    case 'STARTED':
      return 1;
    case 'AUTHENTICATION_REQUIRED':
    case 'METHOD_SELECTED':
      return 2;
    case 'FINALISED':
      return 5;
    case 'FAILED':
      return 3;
    case 'EXEMPTED':
      return 5;
    default:
      return 0;
  }
}

// ─── TPP Registry Tab ──────────────────────────────────────────────────────

function TppRegistryTab() {
  const { data: tpps = [], isLoading } = usePsd2Tpps();

  return (
    <div className="p-6 space-y-4">
      <TppRegistrationTable data={tpps} isLoading={isLoading} />
    </div>
  );
}

// ─── SCA Management Tab ────────────────────────────────────────────────────

function ScaManagementTab() {
  const [showInitiate, setShowInitiate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Psd2ScaSession | null>(null);
  const [searchCustomerId, setSearchCustomerId] = useState('');
  const [activeCustomerId, setActiveCustomerId] = useState(0);

  const { data: sessions = [], isLoading } = useCustomerScaSessions(activeCustomerId);

  const currentStep = selectedSession ? getScaStep(selectedSession.scaStatus) : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(searchCustomerId.trim(), 10);
    if (!isNaN(id) && id > 0) {
      setActiveCustomerId(id);
      setSelectedSession(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">SCA Sessions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search by customer ID to view their SCA sessions
          </p>
        </div>
        <button
          onClick={() => setShowInitiate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          New SCA Session
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Customer ID
          </label>
          <input
            type="number"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={searchCustomerId}
            onChange={(e) => setSearchCustomerId(e.target.value)}
            placeholder="Enter customer ID..."
          />
        </div>
        <button
          type="submit"
          disabled={!searchCustomerId.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </form>

      <ScaFlowDiagram currentStep={currentStep} scaStatus={selectedSession?.scaStatus} />

      {selectedSession && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">
              Selected: {selectedSession.tppId} — Customer #{selectedSession.customerId}
            </span>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs mt-2">
            <div>
              <span className="text-muted-foreground">Method</span>
              <p className="font-medium">{selectedSession.scaMethod}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium">{selectedSession.scaStatus}</p>
            </div>
            {selectedSession.exemptionType && (
              <div>
                <span className="text-muted-foreground">Exemption</span>
                <p className="font-medium">{selectedSession.exemptionType}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeCustomerId > 0 ? (
        isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScaSessionTable
            data={sessions}
            onRowClick={(session) => setSelectedSession(session)}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ShieldCheck className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Enter a customer ID to search SCA sessions</p>
        </div>
      )}

      <ScaInitiateDialog open={showInitiate} onClose={() => setShowInitiate(false)} />
    </div>
  );
}

// ─── Compliance Tab ────────────────────────────────────────────────────────

function ComplianceTab() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ComplianceChecklist />
        </div>
        <div>
          <RegulatoryTimeline />
        </div>
      </div>
    </div>
  );
}

// ─── Exemptions Tab ────────────────────────────────────────────────────────

function ExemptionsTab() {
  return (
    <div className="p-6">
      <ExemptionManager />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export function Psd2CompliancePage() {
  const [showRegister, setShowRegister] = useState(false);
  const { data: tpps = [], isLoading } = usePsd2Tpps();

  const stats = useMemo(() => {
    const registered = tpps.length;
    const active = tpps.filter((t) => t.status === 'ACTIVE').length;
    const suspended = tpps.filter((t) => t.status === 'SUSPENDED').length;
    const pending = tpps.filter((t) => t.status === 'PENDING').length;
    return { registered, active, suspended, pending };
  }, [tpps]);

  const tabs = [
    {
      id: 'registry',
      label: 'TPP Registry',
      icon: Users,
      badge: stats.registered,
      content: <TppRegistryTab />,
    },
    {
      id: 'sca',
      label: 'SCA Management',
      icon: KeyRound,
      content: <ScaManagementTab />,
    },
    {
      id: 'compliance',
      label: 'Compliance Checklist',
      icon: ClipboardCheck,
      content: <ComplianceTab />,
    },
    {
      id: 'exemptions',
      label: 'Exemptions',
      icon: Settings2,
      content: <ExemptionsTab />,
    },
  ];

  return (
    <>
      <PageHeader
        title="PSD2 Compliance"
        subtitle="Manage TPP registrations, Strong Customer Authentication, and PSD2 regulatory compliance."
        actions={
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register TPP
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Registered TPPs"
            value={stats.registered}
            format="number"
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            label="Active"
            value={stats.active}
            format="number"
            icon={CheckCircle2}
            loading={isLoading}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            format="number"
            icon={Activity}
            loading={isLoading}
          />
          <StatCard
            label="Suspended"
            value={stats.suspended}
            format="number"
            icon={Ban}
            loading={isLoading}
          />
        </div>

        {/* Tabs */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <TabsPage tabs={tabs} defaultTab="registry" />
        </div>
      </div>

      <TppRegistrationForm open={showRegister} onClose={() => setShowRegister(false)} />
    </>
  );
}
