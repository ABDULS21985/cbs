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
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { TabsPage } from '@/components/shared/TabsPage';
import { usePsd2Tpps } from '../hooks/usePsd2';
import { TppRegistrationTable } from '../components/psd2/TppRegistrationTable';
import { TppRegistrationForm } from '../components/psd2/TppRegistrationForm';
import { ScaSessionTable } from '../components/psd2/ScaSessionTable';
import { ScaFlowDiagram } from '../components/psd2/ScaFlowDiagram';
import { ScaInitiateDialog } from '../components/psd2/ScaInitiateDialog';
import { ComplianceChecklist } from '../components/psd2/ComplianceChecklist';
import { RegulatoryTimeline } from '../components/psd2/RegulatoryTimeline';
import { ExemptionManager } from '../components/psd2/ExemptionManager';
import type { Psd2ScaSession } from '../api/psd2Api';

// ─── Mock SCA sessions for the management tab ──────────────────────────────

const MOCK_SCA_SESSIONS: Psd2ScaSession[] = [
  {
    id: 1,
    sessionId: 'sca-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    customerId: 10001,
    tppId: 'TPP-001',
    tppName: 'FinTech Payments Ltd',
    scopes: ['accounts', 'transactions'],
    redirectUri: 'https://app.fintech.com/callback',
    authMethod: 'SMS_OTP',
    status: 'AUTHENTICATED',
    initiatedAt: '2026-03-20T09:15:00Z',
    finalisedAt: '2026-03-20T09:15:45Z',
    expiresAt: '2026-03-20T09:20:00Z',
  },
  {
    id: 2,
    sessionId: 'sca-b2c3d4e5-f6a7-8901-bcde-f12345678901',
    customerId: 10002,
    tppId: 'TPP-002',
    tppName: 'PayQuick Solutions',
    scopes: ['payments'],
    redirectUri: 'https://payquick.io/auth/callback',
    authMethod: 'PUSH',
    status: 'PENDING_AUTH',
    initiatedAt: '2026-03-20T10:30:00Z',
    expiresAt: '2026-03-20T10:35:00Z',
  },
  {
    id: 3,
    sessionId: 'sca-c3d4e5f6-a7b8-9012-cdef-123456789012',
    customerId: 10003,
    tppId: 'TPP-003',
    tppName: 'BudgetWise App',
    scopes: ['accounts', 'balance'],
    redirectUri: 'https://budgetwise.app/callback',
    authMethod: 'BIOMETRIC',
    status: 'AUTHENTICATED',
    initiatedAt: '2026-03-20T08:45:00Z',
    finalisedAt: '2026-03-20T08:45:12Z',
    expiresAt: '2026-03-20T08:50:00Z',
  },
  {
    id: 4,
    sessionId: 'sca-d4e5f6a7-b8c9-0123-defa-234567890123',
    customerId: 10004,
    tppId: 'TPP-001',
    tppName: 'FinTech Payments Ltd',
    scopes: ['payments', 'beneficiaries'],
    redirectUri: 'https://app.fintech.com/callback',
    authMethod: 'HARDWARE_TOKEN',
    status: 'FAILED',
    failureReason: 'Token verification timeout',
    initiatedAt: '2026-03-20T07:20:00Z',
    finalisedAt: '2026-03-20T07:25:00Z',
    expiresAt: '2026-03-20T07:25:00Z',
  },
  {
    id: 5,
    sessionId: 'sca-e5f6a7b8-c9d0-1234-efab-345678901234',
    customerId: 10005,
    tppId: 'TPP-004',
    tppName: 'LendSmart Finance',
    scopes: ['accounts', 'transactions', 'balance'],
    redirectUri: 'https://lendsmart.com/auth',
    authMethod: 'SMS_OTP',
    status: 'EXPIRED',
    initiatedAt: '2026-03-20T06:00:00Z',
    expiresAt: '2026-03-20T06:05:00Z',
  },
  {
    id: 6,
    sessionId: 'sca-f6a7b8c9-d0e1-2345-fabc-456789012345',
    customerId: 10006,
    tppId: 'TPP-002',
    tppName: 'PayQuick Solutions',
    scopes: ['payments'],
    redirectUri: 'https://payquick.io/auth/callback',
    authMethod: 'PUSH',
    status: 'AUTHENTICATED',
    initiatedAt: '2026-03-20T11:00:00Z',
    finalisedAt: '2026-03-20T11:00:22Z',
    expiresAt: '2026-03-20T11:05:00Z',
  },
];

// ─── SCA step mapping from session status ──────────────────────────────────

function getScaStep(status: Psd2ScaSession['status']): number {
  switch (status) {
    case 'INITIATED':
      return 1;
    case 'PENDING_AUTH':
      return 2;
    case 'AUTHENTICATED':
      return 5;
    case 'FAILED':
      return 3;
    case 'EXPIRED':
      return 0;
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

  const currentStep = selectedSession ? getScaStep(selectedSession.status) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Recent SCA Sessions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click a session to see its flow status
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

      <ScaFlowDiagram currentStep={currentStep} />

      {selectedSession && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">
              Selected: {selectedSession.tppName} — Customer #{selectedSession.customerId}
            </span>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          {selectedSession.failureReason && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3 mt-2">
              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                Failure Reason: {selectedSession.failureReason}
              </span>
            </div>
          )}
        </div>
      )}

      <ScaSessionTable
        data={MOCK_SCA_SESSIONS}
        onRowClick={(session) => setSelectedSession(session)}
      />

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
    const scaToday = MOCK_SCA_SESSIONS.length;
    const scaSuccess = MOCK_SCA_SESSIONS.filter((s) => s.status === 'AUTHENTICATED').length;
    const successRate = scaToday > 0 ? (scaSuccess / scaToday) * 100 : 0;
    return { registered, active, suspended, scaToday, successRate };
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
            label="Suspended"
            value={stats.suspended}
            format="number"
            icon={Ban}
            loading={isLoading}
          />
          <StatCard
            label="SCA Sessions Today"
            value={stats.scaToday}
            format="number"
            icon={Activity}
          />
          <StatCard
            label="SCA Success Rate"
            value={stats.successRate}
            format="percent"
            icon={ShieldCheck}
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
