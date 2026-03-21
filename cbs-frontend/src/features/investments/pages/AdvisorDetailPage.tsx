import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Users, Award, Star, TrendingUp, FileText,
  Plus, X, Loader2, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage } from '@/components/shared';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { wealthApi } from '../api/wealthApi';

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ advisor, performance }: { advisor: Record<string, unknown>; performance: Record<string, unknown> | undefined }) {
  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Advisor Profile</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">Name</span><p className="font-medium">{String(advisor.name ?? advisor.advisorId ?? '—')}</p></div>
            <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium">{String(advisor.email ?? '—')}</p></div>
            <div><span className="text-muted-foreground text-xs">Phone</span><p className="font-medium">{String(advisor.phone ?? '—')}</p></div>
            <div><span className="text-muted-foreground text-xs">Specialization</span><p className="font-medium">{String(advisor.specialization ?? '—')}</p></div>
          </div>
        </div>

        {performance && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(performance).map(([key, val]) => (
                <div key={key}>
                  <span className="text-muted-foreground text-xs">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <p className="font-medium font-mono">{typeof val === 'number' ? val.toLocaleString() : String(val ?? '—')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Clients Tab ─────────────────────────────────────────────────────────────

function ClientsTab({ advisorId }: { advisorId: string }) {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['wealth', 'advisors', advisorId, 'clients'],
    queryFn: () => wealthApi.getAdvisorClients(advisorId),
    enabled: !!advisorId,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4">
      {clients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No clients assigned</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="text-sm font-medium">{String(c.customerName ?? c.customerId ?? `Client ${i + 1}`)}</p>
                  <p className="text-xs text-muted-foreground">{String(c.planType ?? '')}</p>
                </div>
              </div>
              {c.totalAum != null && <p className="text-xs">AUM: <span className="font-mono font-medium">{formatCurrency(Number(c.totalAum), 'NGN')}</span></p>}
              {c.status && <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold',
                c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>{String(c.status)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────

function ReviewsTab({ advisorId }: { advisorId: string }) {
  const qc = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['wealth', 'advisors', advisorId, 'reviews'],
    queryFn: () => wealthApi.getAdvisorReviews(advisorId),
    enabled: !!advisorId,
  });
  const [showAdd, setShowAdd] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = () => {
    setSubmitting(true);
    wealthApi.addAdvisorReview(advisorId, { rating, comment, reviewDate: new Date().toISOString().split('T')[0] }).then(() => {
      toast.success('Review added');
      qc.invalidateQueries({ queryKey: ['wealth', 'advisors', advisorId, 'reviews'] });
      setShowAdd(false);
      setComment('');
    }).catch(() => toast.error('Failed')).finally(() => setSubmitting(false));
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Add Review
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><Star className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No reviews yet</p></div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn('w-3.5 h-3.5', Number(r.rating ?? 0) >= s ? 'text-amber-500 fill-amber-500' : 'text-gray-300')} />
                  ))}
                </div>
                {r.reviewDate && <span className="text-xs text-muted-foreground">{formatDate(String(r.reviewDate))}</span>}
              </div>
              {r.comment && <p className="text-sm">{String(r.comment)}</p>}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Add Review</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rating</label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setRating(s)} className="p-0.5">
                      <Star className={cn('w-6 h-6 transition-colors', rating >= s ? 'text-amber-500 fill-amber-500' : 'text-gray-300 hover:text-amber-300')} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Comment</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleAdd} disabled={submitting} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Certifications Tab ──────────────────────────────────────────────────────

function CertificationsTab({ advisorId }: { advisorId: string }) {
  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['wealth', 'advisors', advisorId, 'certifications'],
    queryFn: () => wealthApi.getAdvisorCertifications(advisorId),
    enabled: !!advisorId,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4">
      {certs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><Award className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No certifications recorded</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certs.map((c, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 flex items-start gap-3">
              <Award className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">{String(c.certificationName ?? c.name ?? `Certification ${i + 1}`)}</p>
                {c.issuingBody && <p className="text-xs text-muted-foreground">{String(c.issuingBody)}</p>}
                {c.expiryDate && <p className="text-xs text-muted-foreground">Expires: {formatDate(String(c.expiryDate))}</p>}
                {c.status && <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1',
                  c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{String(c.status)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function AdvisorDetailPage() {
  const { advisorId = '' } = useParams<{ advisorId: string }>();

  const { data: advisor, isLoading, isError } = useQuery({
    queryKey: ['wealth', 'advisors', advisorId],
    queryFn: () => wealthApi.getAdvisor(advisorId),
    enabled: !!advisorId,
  });

  const { data: performance } = useQuery({
    queryKey: ['wealth', 'advisors', advisorId, 'performance'],
    queryFn: () => wealthApi.getAdvisorPerformance(advisorId),
    enabled: !!advisorId,
  });

  useEffect(() => {
    document.title = advisor ? `Advisor: ${String(advisor.name ?? advisorId)} | CBS` : 'Advisor Detail | CBS';
  }, [advisor, advisorId]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/investments/advisory" />
        <div className="page-container flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      </>
    );
  }

  if (isError || !advisor) {
    return (
      <>
        <PageHeader title="Advisor Not Found" backTo="/investments/advisory" />
        <div className="page-container text-center py-20 text-muted-foreground">
          <User className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Advisor {advisorId} not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={String(advisor.name ?? advisorId)}
        subtitle={<span className="flex items-center gap-2"><span className="font-mono text-xs">{advisorId}</span>{advisor.specialization && <span className="text-xs">• {String(advisor.specialization)}</span>}</span>}
        backTo="/investments/advisory"
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Clients" value={Number(advisor.activeClients ?? 0)} format="number" icon={Users} />
          <StatCard label="Total AUM" value={formatCurrency(Number(advisor.totalAum ?? 0), 'NGN')} icon={TrendingUp} />
          <StatCard label="Avg Rating" value={String(performance?.avgRating ?? '—')} icon={Star} />
          <StatCard label="Certifications" value={Number(advisor.certificationCount ?? 0)} format="number" icon={Award} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              { id: 'overview', label: 'Overview', content: <OverviewTab advisor={advisor} performance={performance} /> },
              { id: 'clients', label: 'Clients', content: <ClientsTab advisorId={advisorId} /> },
              { id: 'reviews', label: 'Reviews', content: <ReviewsTab advisorId={advisorId} /> },
              { id: 'certifications', label: 'Certifications', content: <CertificationsTab advisorId={advisorId} /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
