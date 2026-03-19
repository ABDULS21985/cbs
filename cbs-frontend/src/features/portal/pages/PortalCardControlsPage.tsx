import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Lock, Globe, ShoppingCart, Banknote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import { portalApi, type PortalCard } from '../api/portalApi';

export function PortalCardControlsPage() {
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['portal', 'cards'],
    queryFn: () => portalApi.getCards(),
  });

  const effectiveId = selectedCardId ?? cards[0]?.id;
  const selectedCard = cards.find((c) => c.id === effectiveId);

  const toggleMutation = useMutation({
    mutationFn: ({ feature, enabled }: { feature: string; enabled: boolean }) =>
      portalApi.toggleCardFeature(effectiveId!, feature, enabled),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['portal', 'cards'] }); toast.success('Card settings updated'); },
    onError: () => toast.error('Failed to update card settings'),
  });

  const blockMutation = useMutation({
    mutationFn: () => portalApi.blockCard(effectiveId!, 'Customer self-service block'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['portal', 'cards'] }); toast.success('Card blocked successfully'); },
    onError: () => toast.error('Failed to block card'),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!selectedCard) return <p className="text-center py-12 text-muted-foreground">No cards found</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Card Controls</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => (
          <button key={card.id} onClick={() => setSelectedCardId(card.id)}
            className={`text-left rounded-xl p-5 transition-colors ${effectiveId === card.id ? 'bg-gradient-to-br from-gray-900 to-gray-700 text-white' : 'border bg-card hover:bg-muted/50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5" /><span className="text-xs font-medium">{card.type} Card</span>
              {card.status === 'BLOCKED' && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">BLOCKED</span>}
            </div>
            <p className="font-mono text-sm tracking-wider">{card.maskedPan}</p>
            <p className="text-xs mt-1 opacity-70">Expires {card.expiry}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card divide-y">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-medium">Online Transactions</p><p className="text-xs text-muted-foreground">Enable/disable online purchases</p></div></div>
          <button onClick={() => toggleMutation.mutate({ feature: 'onlineEnabled', enabled: !selectedCard.onlineEnabled })} className={`w-12 h-6 rounded-full transition-colors relative ${selectedCard.onlineEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${selectedCard.onlineEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><ShoppingCart className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-medium">International Transactions</p><p className="text-xs text-muted-foreground">Allow transactions outside Nigeria</p></div></div>
          <button onClick={() => toggleMutation.mutate({ feature: 'internationalEnabled', enabled: !selectedCard.internationalEnabled })} className={`w-12 h-6 rounded-full transition-colors relative ${selectedCard.internationalEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${selectedCard.internationalEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Transaction Limits</h3>
        <div className="space-y-3">
          {[{ icon: ShoppingCart, label: 'Daily POS Limit', value: selectedCard.dailyPosLimit }, { icon: Banknote, label: 'Daily ATM Limit', value: selectedCard.dailyAtmLimit }, { icon: Globe, label: 'Daily Online Limit', value: selectedCard.dailyOnlineLimit }].map((limit) => (
            <div key={limit.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2"><limit.icon className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{limit.label}</span></div>
              <span className="font-mono text-sm">{formatMoney(limit.value, 'NGN')}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedCard.status !== 'BLOCKED' && (
        <button onClick={() => blockMutation.mutate()} disabled={blockMutation.isPending} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
          <Lock className="w-4 h-4" /> {blockMutation.isPending ? 'Blocking...' : 'Block Card Immediately'}
        </button>
      )}
    </div>
  );
}
