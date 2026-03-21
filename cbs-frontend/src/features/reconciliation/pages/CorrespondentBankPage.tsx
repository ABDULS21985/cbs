import { useState, useMemo } from 'react';
import { Loader2, Plus, Search, Building2, X, Globe, Mail, Phone, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCorrespondentBanks, useRegisterBank } from '../hooks/useReconciliation';
import type { CorrespondentBank } from '../types/nostro';

// ─── Register Bank Modal ──────────────────────────────────────────────────────

interface RegisterBankModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  bankCode: '', bankName: '', swiftBic: '', country: '', city: '',
  relationshipType: 'NOSTRO', contactName: '', contactEmail: '', contactPhone: '',
};

function RegisterBankModal({ open, onClose }: RegisterBankModalProps) {
  const registerBank = useRegisterBank();
  const [form, setForm] = useState(EMPTY_FORM);

  if (!open) return null;

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    registerBank.mutate(
      { ...form, isActive: true, metadata: {} },
      {
        onSuccess: () => {
          onClose();
          setForm(EMPTY_FORM);
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Register Correspondent Bank</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Bank Code</label>
              <input
                required
                value={form.bankCode}
                onChange={(e) => set('bankCode', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="e.g. CITI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bank Name</label>
              <input
                required
                value={form.bankName}
                onChange={(e) => set('bankName', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="e.g. Citibank N.A."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SWIFT BIC</label>
            <input
              required
              value={form.swiftBic}
              onChange={(e) => set('swiftBic', e.target.value.toUpperCase())}
              maxLength={11}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              placeholder="e.g. CITIUS33XXX"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                required
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="e.g. United States"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                required
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="e.g. New York"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Relationship Type</label>
            <select
              value={form.relationshipType}
              onChange={(e) => set('relationshipType', e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="NOSTRO">Nostro</option>
              <option value="VOSTRO">Vostro</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Contact Details</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Contact Name</label>
                <input
                  value={form.contactName}
                  onChange={(e) => set('contactName', e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Primary contact person"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => set('contactEmail', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="email@bank.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    value={form.contactPhone}
                    onChange={(e) => set('contactPhone', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerBank.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {registerBank.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Register Bank
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Bank Detail Slide-over ───────────────────────────────────────────────────

interface BankDetailSlideoverProps {
  bank: CorrespondentBank | null;
  onClose: () => void;
}

function BankDetailSlideover({ bank, onClose }: BankDetailSlideoverProps) {
  if (!bank) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l shadow-xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bank Details</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold">{bank.bankName}</p>
                <p className="text-sm text-muted-foreground font-mono">{bank.swiftBic}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={bank.isActive ? 'ACTIVE' : 'INACTIVE'} dot />
              <StatusBadge status={bank.relationshipType} />
            </div>
          </div>

          {/* Location */}
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" /> Location
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Country</span>
                <p className="font-medium">{bank.country}</p>
              </div>
              <div>
                <span className="text-muted-foreground">City</span>
                <p className="font-medium">{bank.city}</p>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Contact Information</p>
            {bank.contactName && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{bank.contactName}</span>
              </div>
            )}
            {bank.contactEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${bank.contactEmail}`} className="text-primary hover:underline">{bank.contactEmail}</a>
              </div>
            )}
            {bank.contactPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{bank.contactPhone}</span>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Bank Code: <span className="font-mono">{bank.bankCode}</span></p>
            <p>Created: {new Date(bank.createdAt).toLocaleDateString()}</p>
            {bank.updatedAt && <p>Updated: {new Date(bank.updatedAt).toLocaleDateString()}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CorrespondentBankPage() {
  const { data: banks = [], isLoading } = useCorrespondentBanks();
  const [showModal, setShowModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<CorrespondentBank | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return banks;
    const q = search.toLowerCase();
    return banks.filter(
      (b) =>
        b.bankName.toLowerCase().includes(q) ||
        b.bankCode.toLowerCase().includes(q) ||
        b.swiftBic.toLowerCase().includes(q) ||
        b.country.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q),
    );
  }, [banks, search]);

  return (
    <>
      <PageHeader
        title="Correspondent Bank Registry"
        subtitle="Manage correspondent bank relationships and SWIFT BIC codes"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Bank
          </button>
        }
      />

      <div className="page-container space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SWIFT, country..."
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No correspondent banks found.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bank Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">SWIFT BIC</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Country</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">City</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Relationship</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bank) => (
                    <tr
                      key={bank.id}
                      onClick={() => setSelectedBank(bank)}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{bank.bankName}</p>
                            <p className="text-xs text-muted-foreground">{bank.bankCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{bank.swiftBic}</td>
                      <td className="px-4 py-3">{bank.country}</td>
                      <td className="px-4 py-3 text-muted-foreground">{bank.city}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={bank.relationshipType} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium',
                          bank.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400',
                        )}>
                          {bank.isActive
                            ? <ToggleRight className="w-4 h-4" />
                            : <ToggleLeft className="w-4 h-4" />}
                          {bank.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[120px]">
                        {bank.contactName || '--'}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <RegisterBankModal open={showModal} onClose={() => setShowModal(false)} />
      <BankDetailSlideover bank={selectedBank} onClose={() => setSelectedBank(null)} />
    </>
  );
}
