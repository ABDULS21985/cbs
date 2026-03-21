import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Lock, Globe, ShoppingCart, Banknote, Loader2, Snowflake, Plane, X, Wifi, Nfc, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { portalApi, type PortalCard } from '../api/portalApi';

export function PortalCardControlsPage() {
  useEffect(() => { document.title = 'Card Controls | BellBank'; }, []);
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [showTravel, setShowTravel] = useState(false);
  const [travelForm, setTravelForm] = useState({ country: '', fromDate: '', toDate: '' });
  const [showBlock, setShowBlock] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const { data: cards = [], isLoading } = useQuery({ queryKey: ['portal', 'cards'], queryFn: () => portalApi.getCards() });
  const effectiveId = selectedCardId ?? cards[0]?.id;
  const selectedCard = cards.find(c => c.id === effectiveId);

  const toggleMut = useMutation({
    mutationFn: ({ feature, enabled }: { feature: string; enabled: boolean }) => portalApi.toggleCardFeature(effectiveId!, feature, enabled),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['portal', 'cards'] }); toast.success('Card control updated'); },
  });

  const freezeMut = useMutation({
    mutationFn: (freeze: boolean) => portalApi.freezeCard(effectiveId!, freeze),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['portal', 'cards'] }); toast.success('Card status updated'); },
  });

  const blockMut = useMutation({
    mutationFn: () => portalApi.blockCard(effectiveId!, blockReason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['portal', 'cards'] }); toast.success('Card blocked'); setShowBlock(false); },
  });

  const travelMut = useMutation({
    mutationFn: () => portalApi.setTravelNotice(effectiveId!, travelForm),
    onSuccess: () => { toast.success('Travel notice set'); setShowTravel(false); },
  });

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';
  const isFrozen = selectedCard?.status === 'BLOCKED' || selectedCard?.status === 'FROZEN';

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Card Controls</h1>

      {/* Card selector */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {cards.map(card => (
          <button key={card.id} onClick={() => setSelectedCardId(card.id)}
            className={cn('flex-shrink-0 w-64 rounded-xl p-4 border-2 text-left transition-all',
              card.id === effectiveId ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30')}>
            <div className="flex items-center justify-between mb-3">
              <CreditCard className="w-5 h-5" />
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : card.status === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}>
                {card.status}
              </span>
            </div>
            <p className="font-mono text-lg tracking-wider mb-1">{card.maskedPan}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{card.type}</span><span>Exp {card.expiry}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedCard && (
        <>
          {/* Freeze toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Snowflake className={cn('w-5 h-5', isFrozen ? 'text-blue-500' : 'text-muted-foreground')} />
              <div><p className="text-sm font-medium">{isFrozen ? 'Card Frozen' : 'Freeze Card'}</p>
                <p className="text-xs text-muted-foreground">Temporarily block all transactions</p></div>
            </div>
            <button onClick={() => freezeMut.mutate(!isFrozen)} disabled={freezeMut.isPending}
              className={cn('w-12 h-6 rounded-full transition-colors relative', isFrozen ? 'bg-blue-500' : 'bg-gray-300')}>
              <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', isFrozen ? 'left-6' : 'left-0.5')} />
            </button>
          </div>

          {/* Channel toggles */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Transaction Channels</h2>
            {[
              { key: 'onlineEnabled', label: 'Online Payments', desc: 'E-commerce and web payments', icon: Monitor, value: selectedCard.onlineEnabled },
              { key: 'atmEnabled', label: 'ATM Withdrawals', desc: 'Cash withdrawals at ATM terminals', icon: Banknote, value: selectedCard.atmEnabled },
              { key: 'posEnabled', label: 'POS Payments', desc: 'Point-of-sale terminal transactions', icon: ShoppingCart, value: selectedCard.posEnabled },
              { key: 'contactlessEnabled', label: 'Contactless', desc: 'Tap-to-pay NFC payments', icon: Nfc, value: selectedCard.contactlessEnabled },
              { key: 'internationalEnabled', label: 'International', desc: 'Transactions outside Nigeria', icon: Globe, value: selectedCard.internationalEnabled },
            ].map(ch => (
              <div key={ch.key} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <ch.icon className="w-4 h-4 text-muted-foreground" />
                  <div><p className="text-sm font-medium">{ch.label}</p><p className="text-xs text-muted-foreground">{ch.desc}</p></div>
                </div>
                <button onClick={() => toggleMut.mutate({ feature: ch.key, enabled: !ch.value })} disabled={toggleMut.isPending}
                  className={cn('w-10 h-5 rounded-full transition-colors relative', ch.value ? 'bg-primary' : 'bg-gray-300')}>
                  <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', ch.value ? 'left-5' : 'left-0.5')} />
                </button>
              </div>
            ))}
          </div>

          {/* Limits display */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Daily Limits</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'ATM', icon: Banknote, value: selectedCard.dailyAtmLimit },
                { label: 'POS', icon: ShoppingCart, value: selectedCard.dailyPosLimit },
                { label: 'Online', icon: Globe, value: selectedCard.dailyOnlineLimit },
              ].map(lim => (
                <div key={lim.label} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-1"><lim.icon className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{lim.label}</span></div>
                  <p className="text-sm font-mono font-semibold">{formatMoney(lim.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowTravel(true)} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
              <Plane className="w-4 h-4" /> Travel Notice
            </button>
            <button onClick={() => setShowBlock(true)} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
              <Lock className="w-4 h-4" /> Block Card
            </button>
          </div>
        </>
      )}

      {/* Travel Notice Dialog */}
      {showTravel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50" onClick={() => setShowTravel(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">Travel Notice</h3><button onClick={() => setShowTravel(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <input value={travelForm.country} onChange={e => setTravelForm(p => ({ ...p, country: e.target.value }))} placeholder="Country" className={fc} />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={travelForm.fromDate} onChange={e => setTravelForm(p => ({ ...p, fromDate: e.target.value }))} className={fc} />
              <input type="date" value={travelForm.toDate} onChange={e => setTravelForm(p => ({ ...p, toDate: e.target.value }))} className={fc} />
            </div>
            <button onClick={() => travelMut.mutate()} disabled={!travelForm.country || travelMut.isPending}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {travelMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Set Travel Notice'}
            </button>
          </div>
        </div>
      )}

      {/* Block Dialog */}
      {showBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50" onClick={() => setShowBlock(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <h3 className="font-semibold text-sm text-red-600">Block Card Permanently</h3>
            <p className="text-xs text-muted-foreground">This action cannot be undone. The card will be permanently blocked.</p>
            <textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Reason for blocking" rows={2} className={fc} />
            <div className="flex gap-2">
              <button onClick={() => setShowBlock(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => blockMut.mutate()} disabled={!blockReason || blockMut.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {blockMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Block Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
