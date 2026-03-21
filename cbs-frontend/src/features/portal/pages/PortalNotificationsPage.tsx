import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, AlertTriangle, CreditCard, Megaphone, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/formatters';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { portalApi } from '../api/portalApi';
import { Link } from 'react-router-dom';

const CATEGORIES = ['All', 'Transactions', 'Security', 'Promotions', 'System'] as const;
const CAT_ICONS: Record<string, React.ElementType> = { Transactions: CreditCard, Security: AlertTriangle, Promotions: Megaphone, System: Settings };

export function PortalNotificationsPage() {
  useEffect(() => { document.title = 'Notifications | BellBank'; }, []);
  const { user } = useAuthStore();
  const customerId = Number(user?.id) || 0;
  const [category, setCategory] = useState('All');
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['portal', 'notifications', 'all', customerId], queryFn: () => portalApi.getNotifications(customerId, 0, 50), enabled: customerId > 0, refetchInterval: 30_000,
  });

  const markReadMut = useMutation({
    mutationFn: (ids: number[]) => portalApi.markNotificationsRead(ids),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal', 'notifications'] }); toast.success('Marked as read'); },
  });

  const items = Array.isArray(notifications) ? notifications : [];
  const filtered = category === 'All' ? items : items.filter((n: Record<string, unknown>) => n.category === category.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Notifications</h1>
        <div className="flex items-center gap-2">
          <Link to="/portal/profile" className="text-xs text-primary hover:underline">Preferences</Link>
          <button onClick={() => markReadMut.mutate(items.map((n: Record<string, unknown>) => n.id as number))} disabled={markReadMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted disabled:opacity-50">
            {markReadMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />} Mark all read
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors', category === c ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No notifications</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n: Record<string, unknown>, i: number) => {
            const Icon = CAT_ICONS[(n.category as string)] || Bell;
            const isRead = !!n.read;
            return (
              <button key={i} onClick={() => !isRead && markReadMut.mutate([n.id as number])}
                className={cn('w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-colors', isRead ? 'bg-card' : 'bg-primary/5 border-primary/20')}>
                <div className={cn('p-2 rounded-lg shrink-0', isRead ? 'bg-muted' : 'bg-primary/10')}><Icon className={cn('w-4 h-4', isRead ? 'text-muted-foreground' : 'text-primary')} /></div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', !isRead && 'font-semibold')}>{n.title as string || 'Notification'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message as string || n.description as string || ''}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{n.timestamp ? formatRelative(n.timestamp as string) : ''}</p>
                </div>
                {!isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
