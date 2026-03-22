import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, FileText, AlertTriangle, Users, Activity } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { cn } from '@/lib/utils';
import { useDspmSources, useDspmScans, useDspmPolicies, useDspmExceptions, useDspmIdentities } from '../hooks/useDspm';

export function DspmDashboardPage() {
  useEffect(() => { document.title = 'DSPM | CBS'; }, []);
  const navigate = useNavigate();

  const { data: sources = [] } = useDspmSources();
  const { data: scans = [] } = useDspmScans();
  const { data: policies = [] } = useDspmPolicies();
  const { data: exceptions = [] } = useDspmExceptions();
  const { data: identities = [] } = useDspmIdentities();

  const activePolicies = policies.filter(p => p.status === 'ACTIVE').length;
  const pendingExceptions = exceptions.filter(e => e.status === 'PENDING').length;
  const completedScans = scans.filter(s => s.status === 'COMPLETED').length;
  const totalIssues = scans.reduce((sum, s) => sum + s.issuesFound, 0);

  const cards = [
    { label: 'Data Sources', path: '/dspm/sources', icon: Activity, value: sources.length, desc: 'Tracked data stores' },
    { label: 'Scans', path: '/dspm/scans', icon: Search, value: `${completedScans}/${scans.length}`, desc: 'Completed scans' },
    { label: 'Policies', path: '/dspm/policies', icon: FileText, value: activePolicies, desc: 'Active policies' },
    { label: 'Exceptions', path: '/dspm/exceptions', icon: AlertTriangle, value: pendingExceptions, desc: 'Pending review' },
    { label: 'Identities', path: '/dspm/identities', icon: Users, value: identities.length, desc: 'Tracked identities' },
    { label: 'Issues Found', path: '/dspm/scans', icon: Shield, value: totalIssues, desc: 'Across all scans' },
  ];

  return (
    <>
      <PageHeader title="Data Security & Privacy" subtitle="Monitor data assets, enforce policies, and track access" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map(c => (
            <button key={c.label} onClick={() => navigate(c.path)}
              className="rounded-xl border bg-card p-5 text-left hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <c.icon className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono">{c.value}</p>
              <p className="text-sm font-medium mt-1">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </button>
          ))}
        </div>

        {/* Recent scans */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Scans</h3>
            <button onClick={() => navigate('/dspm/scans')} className="text-xs text-primary hover:underline">View all</button>
          </div>
          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No scans yet</p>
          ) : (
            <div className="space-y-2">
              {scans.slice(0, 5).map(scan => (
                <div key={scan.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium font-mono">{scan.scanCode}</p>
                    <p className="text-xs text-muted-foreground">Scope: {scan.scope} · {scan.assetTypes?.join(', ') || 'All types'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {scan.issuesFound > 0 && (
                      <span className="text-xs font-mono text-red-600">{scan.issuesFound} issues</span>
                    )}
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      scan.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      scan.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    )}>{scan.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
