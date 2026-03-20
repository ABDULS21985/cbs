import { cn } from '@/lib/utils';
import { Wifi } from 'lucide-react';
import type { CardType, CardScheme } from '../types/card';

type CardTier = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'INFINITE';

interface CardPreviewProps {
  scheme: CardScheme;
  cardType: CardType;
  tier?: CardTier;
  cardholderName: string;
  maskedNumber?: string;
  expiry?: string;
  contactless?: boolean;
  className?: string;
}

const SCHEME_GRADIENTS: Record<CardScheme, string> = {
  VISA: 'from-blue-600 via-blue-700 to-blue-900',
  MASTERCARD: 'from-red-500 via-orange-600 to-red-800',
  VERVE: 'from-slate-700 via-slate-800 to-slate-950',
};

const TIER_OVERLAYS: Record<CardTier, string> = {
  CLASSIC: '',
  GOLD: 'bg-gradient-to-br from-yellow-400/20 via-amber-300/10 to-yellow-600/20',
  PLATINUM: 'bg-gradient-to-br from-slate-300/20 via-gray-200/10 to-slate-400/20',
  INFINITE: 'bg-gradient-to-br from-gray-900/40 via-black/20 to-amber-500/15',
};

const SCHEME_LABELS: Record<CardScheme, { text: string; style: string }> = {
  VISA: { text: 'VISA', style: 'text-xl font-bold italic tracking-wider' },
  MASTERCARD: { text: 'mastercard', style: 'text-base font-bold tracking-wide' },
  VERVE: { text: 'VERVE', style: 'text-lg font-bold tracking-widest' },
};

const TYPE_BADGES: Record<CardType, string> = {
  DEBIT: 'Debit',
  CREDIT: 'Credit',
  PREPAID: 'Prepaid',
};

// Chip SVG rendered inline
function ChipIcon() {
  return (
    <div className="w-10 h-7 rounded-[3px] bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-600/30 flex items-center justify-center overflow-hidden">
      <div className="grid grid-cols-3 grid-rows-2 gap-px w-7 h-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-amber-400/60 rounded-[1px]" />
        ))}
      </div>
    </div>
  );
}

export function CardPreview({
  scheme,
  cardType,
  tier = 'CLASSIC',
  cardholderName,
  maskedNumber,
  expiry,
  contactless = true,
  className,
}: CardPreviewProps) {
  const displayNumber = maskedNumber || '\u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022';
  const displayExpiry = expiry || 'MM/YY';
  const displayName = cardholderName || 'CARDHOLDER NAME';
  const schemeLabel = SCHEME_LABELS[scheme];

  return (
    <div
      className={cn(
        'relative w-[340px] h-[214px] rounded-xl overflow-hidden shadow-xl transition-all duration-300 group select-none',
        className,
      )}
    >
      {/* Base gradient */}
      <div className={cn('absolute inset-0 bg-gradient-to-br', SCHEME_GRADIENTS[scheme])} />

      {/* Tier overlay */}
      {tier !== 'CLASSIC' && (
        <div className={cn('absolute inset-0', TIER_OVERLAYS[tier])} />
      )}

      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-white/30" />
        <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full border border-white/20" />
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full border border-white/20" />
      </div>

      {/* Gold shimmer for GOLD tier */}
      {tier === 'GOLD' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent animate-pulse" />
      )}

      {/* Card content — front */}
      <div className="relative z-10 flex flex-col justify-between h-full p-5 text-white">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium tracking-widest opacity-80 uppercase">BellBank</p>
            {tier !== 'CLASSIC' && (
              <p className="text-[9px] font-bold tracking-wider opacity-60 uppercase mt-0.5">{tier}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {contactless && <Wifi className="w-5 h-5 opacity-70 rotate-90" />}
          </div>
        </div>

        {/* Middle — chip + number */}
        <div className="space-y-3">
          <ChipIcon />
          <p className="text-lg font-mono tracking-[0.2em] font-medium">{displayNumber}</p>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wider opacity-60 mb-0.5">Card Holder</p>
            <p className="text-xs font-semibold tracking-wider uppercase truncate">{displayName}</p>
          </div>
          <div className="text-center mx-4">
            <p className="text-[9px] uppercase tracking-wider opacity-60 mb-0.5">Expires</p>
            <p className="text-xs font-mono font-semibold">{displayExpiry}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={cn('text-white/90', schemeLabel.style)}>{schemeLabel.text}</span>
            <p className="text-[8px] uppercase tracking-wider opacity-50 mt-0.5">{TYPE_BADGES[cardType]}</p>
          </div>
        </div>
      </div>

      {/* Back face (shown on hover) */}
      <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className={cn('absolute inset-0 bg-gradient-to-br', SCHEME_GRADIENTS[scheme])} />
        {tier !== 'CLASSIC' && <div className={cn('absolute inset-0', TIER_OVERLAYS[tier])} />}
        <div className="relative z-10 flex flex-col h-full text-white">
          {/* Magnetic stripe */}
          <div className="w-full h-10 bg-black/70 mt-6" />
          {/* Signature + CVV */}
          <div className="flex items-center gap-3 px-5 mt-4">
            <div className="flex-1 h-8 bg-white/80 rounded-sm flex items-center px-2">
              <p className="text-[10px] text-gray-400 italic">Authorized Signature</p>
            </div>
            <div className="w-12 h-8 bg-white/90 rounded-sm flex items-center justify-center">
              <p className="text-sm font-mono font-bold text-gray-800">CVV</p>
            </div>
          </div>
          <div className="px-5 mt-3">
            <p className="text-[8px] opacity-50 leading-relaxed">
              This card is the property of BellBank. If found, please return to any BellBank branch.
              Use of this card is subject to the cardholder agreement.
            </p>
          </div>
          <div className="mt-auto px-5 pb-4 flex justify-between items-end">
            <p className="text-[9px] opacity-40">Customer Service: 0800-BELLBANK</p>
            <span className={cn('opacity-70', schemeLabel.style, 'text-sm')}>{schemeLabel.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { CardTier };
