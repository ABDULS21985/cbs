import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, StatusBadge, ConfirmDialog } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { qrApi, type LinkedMobileAccount } from '../../api/qrApi';
import { MobileMoneyLinkForm } from './MobileMoneyLinkForm';

const PROVIDER_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  MTN_MOMO: { label: 'MTN MoMo', color: 'text-yellow-800 dark:text-yellow-200', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  AIRTEL_MONEY: { label: 'Airtel Money', color: 'text-red-800 dark:text-red-200', bg: 'bg-red-100 dark:bg-red-900/30' },
  '9PSB': { label: '9PSB', color: 'text-green-800 dark:text-green-200', bg: 'bg-green-100 dark:bg-green-900/30' },
  OPAY: { label: 'OPay', color: 'text-emerald-800 dark:text-emerald-200', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  PALMPAY: { label: 'PalmPay', color: 'text-blue-800 dark:text-blue-200', bg: 'bg-blue-100 dark:bg-blue-900/30' },
};

function ProviderBadge({ provider }: { provider: string }) {
  const style = PROVIDER_STYLES[provider] || { label: provider, color: 'text-gray-700', bg: 'bg-gray-100' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', style.bg, style.color)}>
      {style.label}
    </span>
  );
}

export function LinkedAccountsTable() {
  const queryClient = useQueryClient();
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedMobileAccount | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['linked-mobile-accounts'],
    queryFn: () => qrApi.getLinkedMobileAccounts(),
  });

  const unlinkMutation = useMutation({
    mutationFn: (id: string) => qrApi.unlinkMobileAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-mobile-accounts'] });
      toast.success('Mobile money account unlinked');
      setUnlinkTarget(null);
    },
    onError: () => toast.error('Failed to unlink account'),
  });

  const columns: ColumnDef<LinkedMobileAccount>[] = [
    {
      accessorKey: 'provider',
      header: 'Provider',
      cell: ({ row }) => <ProviderBadge provider={row.original.provider} />,
    },
    {
      accessorKey: 'mobileNumber',
      header: 'Mobile #',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.mobileNumber}</span>
      ),
    },
    {
      accessorKey: 'linkedAccount',
      header: 'Linked Account',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.linkedAccount}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'lastTransaction',
      header: 'Last Transaction',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastTransaction ? formatDateTime(row.original.lastTransaction) : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => setUnlinkTarget(row.original)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Unlink className="w-3 h-3" />
          Unlink
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Linked Accounts</h3>
        <button
          onClick={() => setShowLinkForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Link Account
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="No linked mobile money accounts"
      />

      <MobileMoneyLinkForm
        open={showLinkForm}
        onClose={() => setShowLinkForm(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['linked-mobile-accounts'] });
        }}
      />

      <ConfirmDialog
        open={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={() => unlinkTarget && unlinkMutation.mutate(unlinkTarget.id)}
        title="Unlink Mobile Money Account"
        description={`Are you sure you want to unlink ${unlinkTarget ? PROVIDER_STYLES[unlinkTarget.provider]?.label || unlinkTarget.provider : ''} account (${unlinkTarget?.mobileNumber})? You can re-link it at any time.`}
        confirmLabel="Unlink"
        variant="destructive"
        isLoading={unlinkMutation.isPending}
      />
    </>
  );
}
