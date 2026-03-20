import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { Wallet, ShieldCheck, BarChart3, Plus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cmCustodyApi, type CustodyAccount, type CustodyAccountType } from '../api/custodyApi';
import { CustodyAccountTable } from '../components/custody/CustodyAccountTable';
import { CustodyAccountDetail } from '../components/custody/CustodyAccountDetail';
import { formatMoneyCompact } from '@/lib/formatters';
import { toast } from 'sonner';

const KEYS = {
  accounts: () => ['cm-custody', 'accounts'],
  account: (code: string) => ['cm-custody', 'account', code],
};

// ── Open Account Form ────────────────────────────────────────────────────────

function OpenAccountForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: cmCustodyApi.openAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.accounts() });
      toast.success('Custody account opened');
      onClose();
    },
  });

  const [form, setForm] = useState({
    customerId: '',
    accountType: 'SECURITIES' as CustodyAccountType,
    baseCurrency: 'NGN',
    custodian: '',
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Open Custody Account</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
            <input
              className="w-full mt-1 input"
              placeholder="e.g., CUST-001"
              value={form.customerId}
              onChange={(e) => update('customerId', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Type</label>
              <select
                className="w-full mt-1 input"
                value={form.accountType}
                onChange={(e) => update('accountType', e.target.value)}
              >
                <option value="SECURITIES">Securities</option>
                <option value="DERIVATIVES">Derivatives</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Base Currency</label>
              <select
                className="w-full mt-1 input"
                value={form.baseCurrency}
                onChange={(e) => update('baseCurrency', e.target.value)}
              >
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Custodian</label>
            <input
              className="w-full mt-1 input"
              placeholder="e.g., CSCS, Stanbic"
              value={form.custodian}
              onChange={(e) => update('custodian', e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? 'Opening...' : 'Open Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CustodyPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CustodyAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: KEYS.accounts(),
    queryFn: () => cmCustodyApi.getAccounts(),
    staleTime: 60_000,
  });

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE');
  const totalAssets = accounts.reduce((s, a) => s + a.totalAssets, 0);
  const totalSecurities = accounts.reduce((s, a) => s + a.securitiesCount, 0);

  return (
    <>
      <PageHeader
        title="Custody Accounts"
        subtitle="Manage custody accounts, asset holdings, corporate actions, and income"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> Open Custody Account
          </button>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Accounts" value={accounts.length} format="number" icon={Wallet} />
          <StatCard label="Active" value={activeAccounts.length} format="number" icon={ShieldCheck} />
          <StatCard label="Total Assets" value={totalAssets} format="money" icon={BarChart3} compact />
          <StatCard label="Securities Held" value={totalSecurities} format="number" icon={Wallet} />
        </div>

        <CustodyAccountTable
          data={accounts}
          isLoading={isLoading}
          onRowClick={(account) => setSelectedAccount(account)}
        />
      </div>

      {showCreate && <OpenAccountForm onClose={() => setShowCreate(false)} />}
      {selectedAccount && (
        <CustodyAccountDetail
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </>
  );
}
