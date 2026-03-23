import { useState, useEffect } from 'react';
import { Search, Save, Loader2, User, Shield, Phone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePartyRoutingProfile, useUpsertPartyRouting } from '../hooks/usePartyRouting';
import type { PartyRoutingProfile } from '../types/partyRouting';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS = ['PHONE', 'EMAIL', 'CHAT', 'VIDEO', 'SMS', 'WHATSAPP', 'BRANCH', 'MOBILE', 'WEB'] as const;
const LANGUAGES = ['en', 'yo', 'ha', 'ig'] as const;
const RISK_PROFILES = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'] as const;
const SERVICE_TIERS = ['STANDARD', 'PREMIUM', 'VIP', 'ELITE'] as const;
const CONTACT_PREF_KEYS = ['email', 'sms', 'phone', 'push'] as const;
const SPECIAL_HANDLING_KEYS = ['requiresDualApproval', 'restrictedProducts'] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  yo: 'Yoruba',
  ha: 'Hausa',
  ig: 'Igbo',
};

const TIER_COLORS: Record<string, string> = {
  STANDARD: 'default',
  PREMIUM: 'info',
  VIP: 'warning',
  ELITE: 'success',
};

const RISK_COLORS: Record<string, string> = {
  LOW: 'success',
  MODERATE: 'warning',
  HIGH: 'error',
  VERY_HIGH: 'error',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDefaultForm(): Partial<PartyRoutingProfile> {
  return {
    preferredChannel: 'PHONE',
    preferredLanguage: 'en',
    preferredBranchId: 0,
    assignedRmId: '',
    contactPreferences: { email: true, sms: false, phone: false, push: false },
    marketingConsent: false,
    dataSharingConsent: false,
    riskProfile: 'LOW',
    serviceTier: 'STANDARD',
    specialHandling: { requiresDualApproval: false, restrictedProducts: false },
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PartyRoutingPage() {
  const [searchId, setSearchId] = useState('');
  const [customerId, setCustomerId] = useState(0);
  const [form, setForm] = useState<Partial<PartyRoutingProfile>>(buildDefaultForm());

  const { data: profile, isLoading, isError, error } = usePartyRoutingProfile(customerId);
  const upsertMutation = useUpsertPartyRouting();

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        customerId: profile.customerId,
        preferredChannel: profile.preferredChannel ?? 'PHONE',
        preferredLanguage: profile.preferredLanguage ?? 'en',
        preferredBranchId: profile.preferredBranchId ?? 0,
        assignedRmId: profile.assignedRmId ?? '',
        contactPreferences: profile.contactPreferences ?? { email: true, sms: false, phone: false, push: false },
        marketingConsent: profile.marketingConsent ?? false,
        dataSharingConsent: profile.dataSharingConsent ?? false,
        riskProfile: profile.riskProfile ?? 'LOW',
        serviceTier: profile.serviceTier ?? 'STANDARD',
        specialHandling: profile.specialHandling ?? { requiresDualApproval: false, restrictedProducts: false },
      });
    }
  }, [profile]);

  const handleSearch = () => {
    const id = parseInt(searchId, 10);
    if (!id || id <= 0) {
      toast.error('Please enter a valid customer ID');
      return;
    }
    setCustomerId(id);
  };

  const handleSave = () => {
    if (customerId <= 0) {
      toast.error('Search for a customer first');
      return;
    }
    upsertMutation.mutate(
      { ...form, customerId },
      {
        onSuccess: () => toast.success('Routing profile saved successfully'),
        onError: (err: Error) => toast.error(err.message || 'Failed to save routing profile'),
      },
    );
  };

  const updateField = <K extends keyof PartyRoutingProfile>(key: K, value: PartyRoutingProfile[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMapField = (
    field: 'contactPreferences' | 'specialHandling',
    key: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] as Record<string, boolean>),
        [key]: !(prev[field] as Record<string, boolean>)?.[key],
      },
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Customer Routing Profiles" icon={Phone} />

      {/* ── Search Bar ─────────────────────────────────────────────────────────── */}
      <div className="surface-card p-4">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Look up by Customer ID
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="Enter customer ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={cn(
              'flex-1 rounded-md border bg-background px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
      </div>

      {/* ── Error State ────────────────────────────────────────────────────────── */}
      {isError && customerId > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {(error as Error)?.message?.includes('404')
            ? `No routing profile found for customer ${customerId}. Fill in the form below to create one.`
            : `Error loading profile: ${(error as Error)?.message}`}
        </div>
      )}

      {/* ── Profile Detail / Edit Form ─────────────────────────────────────────── */}
      {customerId > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            {/* Channel & Language */}
            <div className="surface-card p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Phone className="h-4 w-4" /> Channel Preferences
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Preferred Channel</label>
                  <select
                    value={form.preferredChannel ?? 'PHONE'}
                    onChange={(e) => updateField('preferredChannel', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Preferred Language</label>
                  <select
                    value={form.preferredLanguage ?? 'en'}
                    onChange={(e) => updateField('preferredLanguage', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Assigned RM ID</label>
                  <input
                    type="text"
                    value={form.assignedRmId ?? ''}
                    onChange={(e) => updateField('assignedRmId', e.target.value)}
                    placeholder="e.g. RM-001"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Risk & Tier */}
            <div className="surface-card p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Shield className="h-4 w-4" /> Risk & Service Tier
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Risk Profile</label>
                  <select
                    value={form.riskProfile ?? 'LOW'}
                    onChange={(e) => updateField('riskProfile', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {RISK_PROFILES.map((r) => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                  {form.riskProfile && (
                    <div className="mt-2">
                      <StatusBadge status={form.riskProfile} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Service Tier</label>
                  <select
                    value={form.serviceTier ?? 'STANDARD'}
                    onChange={(e) => updateField('serviceTier', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SERVICE_TIERS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {form.serviceTier && (
                    <div className="mt-2">
                      <StatusBadge status={form.serviceTier} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Consents */}
            <div className="surface-card p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <User className="h-4 w-4" /> Consents
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.marketingConsent ?? false}
                    onChange={(e) => updateField('marketingConsent', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Marketing Consent</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.dataSharingConsent ?? false}
                    onChange={(e) => updateField('dataSharingConsent', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Data Sharing Consent</span>
                </label>
              </div>
            </div>

            {/* Contact Preferences */}
            <div className="surface-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Contact Preferences
              </h3>
              <div className="space-y-3">
                {CONTACT_PREF_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form.contactPreferences as Record<string, boolean>)?.[key] ?? false}
                      onChange={() => toggleMapField('contactPreferences', key)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Special Handling */}
            <div className="surface-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Special Handling
              </h3>
              <div className="space-y-3">
                {SPECIAL_HANDLING_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form.specialHandling as Record<string, boolean>)?.[key] ?? false}
                      onChange={() => toggleMapField('specialHandling', key)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">
                      {key === 'requiresDualApproval' ? 'Requires Dual Approval' : 'Restricted Products'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Button ────────────────────────────────────────────────────────── */}
      {customerId > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={upsertMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Profile
          </button>
        </div>
      )}
    </div>
  );
}
