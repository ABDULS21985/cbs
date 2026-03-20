import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { NotificationPreference, NotificationChannel } from '../types/notificationExt';

const CHANNELS: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];

const EVENT_CATEGORIES: { category: string; events: { type: string; label: string }[] }[] = [
  {
    category: 'Transactions',
    events: [
      { type: 'TRANSACTION_CREDIT', label: 'Credit / Deposit' },
      { type: 'TRANSACTION_DEBIT', label: 'Debit / Withdrawal' },
      { type: 'TRANSACTION_TRANSFER', label: 'Transfer' },
      { type: 'TRANSACTION_FAILED', label: 'Failed Transaction' },
    ],
  },
  {
    category: 'Account',
    events: [
      { type: 'ACCOUNT_OPENED', label: 'Account Opened' },
      { type: 'ACCOUNT_CLOSED', label: 'Account Closed' },
      { type: 'BALANCE_ALERT', label: 'Low Balance Alert' },
      { type: 'STATEMENT_READY', label: 'Statement Ready' },
    ],
  },
  {
    category: 'Loans',
    events: [
      { type: 'LOAN_DISBURSED', label: 'Loan Disbursed' },
      { type: 'LOAN_REPAYMENT_DUE', label: 'Repayment Due' },
      { type: 'LOAN_OVERDUE', label: 'Overdue Payment' },
      { type: 'LOAN_SETTLED', label: 'Loan Settled' },
    ],
  },
  {
    category: 'Cards',
    events: [
      { type: 'CARD_TRANSACTION', label: 'Card Transaction' },
      { type: 'CARD_BLOCKED', label: 'Card Blocked' },
      { type: 'CARD_EXPIRING', label: 'Card Expiring' },
    ],
  },
  {
    category: 'Security',
    events: [
      { type: 'LOGIN', label: 'New Login' },
      { type: 'PASSWORD_CHANGED', label: 'Password Changed' },
      { type: 'MFA_ENABLED', label: 'MFA Enabled' },
      { type: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity' },
    ],
  },
  {
    category: 'System',
    events: [
      { type: 'MAINTENANCE', label: 'Scheduled Maintenance' },
      { type: 'SYSTEM_UPDATE', label: 'System Update' },
    ],
  },
];

interface PreferenceMatrixProps {
  preferences: NotificationPreference[];
  onToggle: (channel: NotificationChannel, eventType: string, enabled: boolean) => void;
  isUpdating?: Record<string, boolean>;
}

export function PreferenceMatrix({ preferences, onToggle, isUpdating = {} }: PreferenceMatrixProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isEnabled = (channel: NotificationChannel, eventType: string): boolean => {
    const pref = preferences.find((p) => p.channel === channel && p.eventType === eventType);
    return pref?.isEnabled ?? true; // Default to enabled if no preference exists
  };

  const toggleCategory = (category: string) => {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const selectAllCategory = (category: string, events: { type: string }[], enabled: boolean) => {
    events.forEach((event) => {
      CHANNELS.forEach((channel) => {
        if (isEnabled(channel, event.type) !== enabled) {
          onToggle(channel, event.type, enabled);
        }
      });
    });
  };

  const updatingKey = (channel: string, eventType: string) => `${channel}:${eventType}`;

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-64">Event Type</th>
            {CHANNELS.map((ch) => (
              <th key={ch} className="text-center px-3 py-3 text-xs font-medium text-muted-foreground w-20">{ch.replace('_', '-')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EVENT_CATEGORIES.map(({ category, events }) => (
            <>
              {/* Category Header */}
              <tr key={`cat-${category}`} className="bg-muted/20">
                <td colSpan={1} className="px-4 py-2">
                  <button onClick={() => toggleCategory(category)} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <ChevronDown className={cn('w-3 h-3 transition-transform', collapsed[category] && '-rotate-90')} />
                    {category}
                  </button>
                </td>
                {CHANNELS.map((ch) => (
                  <td key={ch} className="text-center px-3 py-2">
                    <button
                      onClick={() => selectAllCategory(category, events, true)}
                      className="text-[9px] text-primary hover:underline"
                    >
                      All
                    </button>
                  </td>
                ))}
              </tr>

              {/* Event Rows */}
              {!collapsed[category] && events.map((event) => (
                <tr key={event.type} className="border-t hover:bg-muted/10">
                  <td className="px-4 py-2 pl-8">
                    <span className="text-sm">{event.label}</span>
                  </td>
                  {CHANNELS.map((channel) => {
                    const key = updatingKey(channel, event.type);
                    const enabled = isEnabled(channel, event.type);
                    const updating = isUpdating[key];
                    return (
                      <td key={channel} className="text-center px-3 py-2">
                        <button
                          onClick={() => onToggle(channel, event.type, !enabled)}
                          disabled={updating}
                          className={cn(
                            'relative w-9 h-5 rounded-full transition-colors mx-auto',
                            enabled ? 'bg-green-500' : 'bg-muted-foreground/20',
                            updating && 'opacity-50',
                          )}
                        >
                          {updating ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                          ) : (
                            <span className={cn(
                              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                              enabled ? 'left-[18px]' : 'left-0.5',
                            )} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
