import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, TabsPage } from '@/components/shared';
import { formatMoneyCompact, formatPercent, formatDate } from '@/lib/formatters';
import { User, BarChart2, Users, Calendar, Shield, Loader2, AlertCircle, Download } from 'lucide-react';
import { useAdvisor } from '../hooks/useWealth';
import { exportAdvisorReportPdf } from '../lib/wealthExport';
import { AdvisorPerformanceTab } from '../components/advisors/AdvisorPerformanceTab';
import { AdvisorClientsTab } from '../components/advisors/AdvisorClientsTab';
import { AdvisorCalendar } from '../components/advisors/AdvisorCalendar';
import { ComplianceTracker } from '../components/advisors/ComplianceTracker';

const AVATAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

// ─── Profile Tab ────────────────────────────────────────────────────────────

function ProfileTab({ advisor }: { advisor: any }) {
  const avatarColor = AVATAR_COLORS[(parseInt(advisor.id, 10) || 0) % AVATAR_COLORS.length];

  return (
    <div className="p-6 space-y-6">
      {/* Contact & Bio */}
      <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Contact Details</h3>
          <dl className="space-y-2">
            {[
              { label: 'Email', value: advisor.email },
              { label: 'Phone', value: advisor.phone },
              { label: 'Advisor ID', value: advisor.id },
              { label: 'Join Date', value: formatDate(advisor.joinDate) },
              { label: 'Satisfaction', value: advisor.satisfaction ? `${advisor.satisfaction}/5.0` : '—' },
              { label: 'Status', value: advisor.status ?? 'ACTIVE' },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-4">
                <dt className="text-xs text-muted-foreground w-24 shrink-0">{label}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Specializations & Credentials</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {(advisor.specializations ?? []).map((s: string) => (
              <span key={s} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: `${avatarColor}18`, color: avatarColor }}>
                {s}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            {['CFA Charterholder', 'CFP Certified', 'SEC Licensed'].map((cert) => (
              <div key={cert} className="flex items-center gap-2 text-sm">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                <span>{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total AUM', value: formatMoneyCompact(advisor.aum) },
          { label: 'Avg Return', value: formatPercent(advisor.avgReturn, 1) },
          { label: 'Client Retention', value: '94.2%' },
          { label: 'Revenue', value: advisor.revenue ? formatMoneyCompact(advisor.revenue) : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold font-mono mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function AdvisorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: advisor, isLoading } = useAdvisor(id ?? '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Advisor not found</p>
      </div>
    );
  }

  const avatarColor = AVATAR_COLORS[(parseInt(advisor.id, 10) || 0) % AVATAR_COLORS.length];

  return (
    <>
      <PageHeader
        title={advisor.name}
        subtitle="Wealth Advisor"
        backTo="/wealth/advisors"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAdvisorReportPdf(advisor, [])}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors no-print"
              aria-label="Export advisor report as PDF"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <StatusBadge status={advisor.status ?? 'ACTIVE'} size="md" dot />
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Profile strip */}
        <div className="rounded-xl border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(advisor.name)}
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Clients', value: String(advisor.clientCount) },
              { label: 'AUM', value: formatMoneyCompact(advisor.aum) },
              { label: 'Avg Return', value: formatPercent(advisor.avgReturn, 1) },
              { label: 'Join Date', value: formatDate(advisor.joinDate) },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold font-mono mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'profile',
              label: 'Profile',
              icon: User,
              content: <ProfileTab advisor={advisor} />,
            },
            {
              id: 'performance',
              label: 'Performance',
              icon: BarChart2,
              content: <AdvisorPerformanceTab advisorId={advisor.id} />,
            },
            {
              id: 'clients',
              label: 'Clients',
              icon: Users,
              badge: advisor.clientCount,
              content: <AdvisorClientsTab advisorId={advisor.id} />,
            },
            {
              id: 'calendar',
              label: 'Calendar',
              icon: Calendar,
              content: <AdvisorCalendar advisorId={advisor.id} />,
            },
            {
              id: 'compliance',
              label: 'Compliance',
              icon: Shield,
              content: <ComplianceTracker advisorId={advisor.id} />,
            },
          ]}
        />
      </div>
    </>
  );
}
