import { useEffect, useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CreditCard,
  Loader2,
  Megaphone,
  Settings,
} from 'lucide-react';

import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

import { PortalPageHero } from '../components/PortalPageHero';
import { portalApi } from '../api/portalApi';

const CATEGORIES = ['All', 'Transactions', 'Security', 'Promotions', 'System'] as const;
const CAT_ICONS: Record<string, ElementType> = {
  Transactions: CreditCard,
  Security: AlertTriangle,
  Promotions: Megaphone,
  System: Settings,
};

export function PortalNotificationsPage() {
  useEffect(() => {
    document.title = 'Notifications | BellBank';
  }, []);

  const { user } = useAuthStore();
  const customerId = Number(user?.id) || 0;
  const [category, setCategory] = useState('All');
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['portal', 'notifications', 'all', customerId],
    queryFn: () => portalApi.getNotifications(customerId, 0, 50),
    enabled: customerId > 0,
    refetchInterval: 30_000,
  });

  const markReadMut = useMutation({
    mutationFn: (ids: number[]) => portalApi.markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] });
      toast.success('Marked as read');
    },
  });

  const items = Array.isArray(notifications) ? notifications : [];
  const unreadCount = items.filter((notification: Record<string, unknown>) => !notification.read).length;
  const filtered =
    category === 'All'
      ? items
      : items.filter((notification: Record<string, unknown>) => notification.category === category.toUpperCase());

  return (
    <div className="portal-page-shell">
      <PortalPageHero
        icon={Bell}
        eyebrow="Portal Alerts"
        title="Notifications"
        description="Review transaction alerts, system messages, and promotional updates from a cleaner inbox."
        chips={[
          category === 'All' ? 'All categories' : category,
          unreadCount > 0 ? `${unreadCount} unread` : 'Inbox up to date',
        ]}
        metrics={[
          { label: 'Total alerts', value: String(items.length || 0) },
          { label: 'Unread', value: String(unreadCount), tone: unreadCount > 0 ? 'warning' : 'positive' },
          { label: 'Visible', value: String(filtered.length || 0) },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/portal/profile" className="portal-action-button">
              Preferences
            </Link>
            <button
              onClick={() => markReadMut.mutate(items.map((notification: Record<string, unknown>) => notification.id as number))}
              disabled={markReadMut.isPending || items.length === 0}
              className="portal-action-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markReadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark all read
            </button>
          </div>
        }
      />

      <section className="portal-panel p-5 space-y-5">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className="portal-filter-chip"
              data-active={category === item ? 'true' : 'false'}
            >
              {item}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-20 rounded-[1.25rem] bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="portal-empty-state">
            <Bell className="h-10 w-10 text-muted-foreground/35" />
            <div>
              <p className="text-sm font-medium text-foreground">No notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New transaction and security alerts will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((notification: Record<string, unknown>, index: number) => {
              const Icon = CAT_ICONS[notification.category as string] || Bell;
              const isRead = !!notification.read;

              return (
                <button
                  key={index}
                  onClick={() => !isRead && markReadMut.mutate([notification.id as number])}
                  className={cn(
                    'portal-panel p-4 text-left transition-colors',
                    isRead ? 'portal-panel-muted' : 'border-primary/20 bg-primary/5',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl',
                        isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={cn('text-sm text-foreground', !isRead && 'font-semibold')}>
                          {(notification.title as string) || 'Notification'}
                        </p>
                        {!isRead ? <span className="mt-1 h-2 w-2 rounded-full bg-primary" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(notification.message as string) || (notification.description as string) || ''}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {notification.timestamp ? formatRelative(notification.timestamp as string) : ''}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
